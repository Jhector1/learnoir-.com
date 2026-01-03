// src/app/api/practice/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import {
  attachGuestCookie,
  ensureGuestId,
  getActor,
} from "@/lib/practice/actor";
import { verifyPracticeKey } from "@/lib/practice/key";
import { requireEntitledUser } from "@/lib/billing/requireEntitledUser";

export const runtime = "nodejs";

type SubmitAnswer =
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "numeric"; value: number }
  | {
      kind: "vector_drag_target";
      a: { x: number; y: number; z?: number };
      b?: any;
    }
  | { kind: "vector_drag_dot"; a: { x: number; y: number; z?: number } };

function vecMag(v: { x: number; y: number; z?: number }) {
  const x = Number(v.x ?? 0);
  const y = Number(v.y ?? 0);
  const z = Number(v.z ?? 0);
  return Math.sqrt(x * x + y * y + z * z);
}

function solutionForDot(
  b: { x: number; y: number; z?: number },
  targetDot: number,
  minMag: number
) {
  const bx = Number(b.x ?? 0),
    by = Number(b.y ?? 0),
    bz = Number(b.z ?? 0);

  const b2 = bx * bx + by * by + bz * bz;

  // If b is degenerate, return something stable
  if (!Number.isFinite(b2) || b2 < 1e-9) {
    return { x: minMag, y: 0, z: 0 };
  }

  // Component along b that satisfies dot(a,b)=targetDot
  const k = targetDot / b2;
  let ax = k * bx,
    ay = k * by,
    az = k * bz;

  // Pick a perpendicular direction p
  let px = 0,
    py = 0,
    pz = 0;

  // 2D-friendly perpendicular if possible
  if (Math.abs(bx) + Math.abs(by) > 1e-6) {
    px = -by;
    py = bx;
    pz = 0;
  } else {
    // fallback using Y/Z
    px = 0;
    py = -bz;
    pz = by || 1;
  }

  const pm = Math.sqrt(px * px + py * py + pz * pz) || 1;
  px /= pm;
  py /= pm;
  pz /= pm;

  // Ensure |a| >= minMag so user can't "win" with a=(0,0,0)
  const am = Math.sqrt(ax * ax + ay * ay + az * az);
  const need = Math.max(0, minMag - am);

  ax += px * need;
  ay += py * need;
  az += pz * need;

  return { x: ax, y: ay, z: az };
}

function closeEnough(a: number, b: number, tol: number) {
  return Math.abs(a - b) <= tol;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    key?: unknown;
    answer?: SubmitAnswer;
    reveal?: boolean;
  } | null;

  if (!body?.key) {
    return NextResponse.json({ message: "Missing key." }, { status: 400 });
  }

  const actor0 = await getActor();

  // 1) verify key first
  const payload = verifyPracticeKey(body.key);
  if (!payload) {
    return NextResponse.json(
      { message: "Invalid or expired key." },
      { status: 401 }
    );
  }

  // 2) now decide actor + cookie
  let actor = actor0;
  let setGuestId: string | null = null;

  // If guest cookie missing but key has guestId, adopt it (prevents mismatch)
  if (!actor0.userId && !actor0.guestId && payload.guestId) {
    actor = { ...actor0, guestId: payload.guestId };
    setGuestId = payload.guestId;
  } else {
    const ensured = ensureGuestId(actor0);
    actor = ensured.actor;
    setGuestId = ensured.setGuestId ?? null;
  }

  if (!payload) {
    const res = NextResponse.json(
      {
        message: "Invalid or expired key.",
        // helpful while debugging:
        receivedKeyType: typeof body.key,
      },
      { status: 401 }
    );
    return attachGuestCookie(res, setGuestId);
  }

  // actor match (prevents key sharing)
  if (
    (payload.userId && payload.userId !== (actor.userId ?? null)) ||
    (payload.guestId && payload.guestId !== (actor.guestId ?? null))
  ) {
    const res = NextResponse.json(
      { message: "Actor mismatch." },
      { status: 401 }
    );
    return attachGuestCookie(res, setGuestId);
  }

  const instance = await prisma.practiceQuestionInstance.findUnique({
    where: { id: payload.instanceId },
  });


  if (!instance) {
    const res = NextResponse.json({ message: "Instance not found." }, { status: 404 });
    return attachGuestCookie(res, setGuestId);
  }

  // ✅ NEW: if instance belongs to an assignment session, require subscription
  if (instance.sessionId) {
    const sess = await prisma.practiceSession.findUnique({
      where: { id: instance.sessionId },
      select: { assignmentId: true, userId: true, guestId: true },
    });

    if (sess?.assignmentId) {
      const gate = await requireEntitledUser();
      if (!gate.ok) return gate.res;

      // safety: must belong to this user
      if (sess.userId && sess.userId !== gate.userId) {
        return NextResponse.json({ message: "Forbidden." }, { status: 403 });
      }
    }

    // optional: also ensure actor matches session owner
    if (
      (sess?.userId && sess.userId !== (actor.userId ?? null)) ||
      (sess?.guestId && sess.guestId !== (actor.guestId ?? null))
    ) {
      const res = NextResponse.json({ message: "Forbidden." }, { status: 403 });
      return attachGuestCookie(res, setGuestId);
    }
  }



  if (!instance) {
    const res = NextResponse.json(
      { message: "Instance not found." },
      { status: 404 }
    );
    return attachGuestCookie(res, setGuestId);
  }

  const secret = instance.secretPayload as any;

  let ok = false;
  let expected: any = null;
  let explanation = "";

if (instance.kind === "numeric") {
  const exp = (secret as any)?.expected;

  // ✅ handle both shapes:
  // 1) expected: { value, tolerance }
  // 2) expectedValue / correctValue + tolerance
  const expectedValue =
    typeof exp === "number"
      ? exp
      : Number(
          (exp && typeof exp === "object" ? exp.value : undefined) ??
            (secret as any)?.expectedValue ??
            (secret as any)?.correctValue ??
            0
        );

  const tol = Number(
    (exp && typeof exp === "object" ? exp.tolerance : undefined) ??
      (secret as any)?.tolerance ??
      0
  );

  const raw = (body.answer as any)?.value;
  const received = Number(raw);
  const receivedOk = Number.isFinite(received);

  // ✅ if server stored something invalid, fail loudly instead of NaN→null
  if (!Number.isFinite(expectedValue)) {
    return NextResponse.json(
      { message: "Server bug: invalid expected numeric value.", debug: { exp, secret } },
      { status: 500 }
    );
  }

  const delta = receivedOk ? received - expectedValue : null;

  ok = body.reveal
    ? false
    : receivedOk && closeEnough(received, expectedValue, tol);

  expected = {
    kind: "numeric",
    value: expectedValue,
    tolerance: tol,
    debug: {
      reveal: Boolean(body.reveal),
      receivedValue: receivedOk ? received : null,
      delta,
      absDelta: delta === null ? null : Math.abs(delta),
    },
  };

  explanation = ok
    ? "Correct."
    : `Expected ${expectedValue}${tol ? ` ± ${tol}` : ""}.`;
}

  
 else if (instance.kind === "single_choice") {
  const correct = String(secret.correctOptionId ?? secret.expected?.optionId ?? "");
  const chosen = String((body.answer as any)?.optionId ?? "");

  ok = body.reveal ? false : chosen === correct;

  expected = {
    kind: "single_choice",
    optionId: correct,
    debug: {
      reveal: Boolean(body.reveal),
      chosen,
      matches: chosen === correct,
    },
  };

  explanation = ok ? "Correct choice." : "Not quite — review the concept.";
}
else if (instance.kind === "multi_choice") {
  const correct = Array.isArray(secret.correctOptionIds)
    ? secret.correctOptionIds.map(String)
    : Array.isArray(secret.expected?.optionIds)
    ? secret.expected.optionIds.map(String)
    : [];

  const chosen: string[] = Array.isArray((body.answer as any)?.optionIds)
    ? (body.answer as any).optionIds.map(String)
    : [];

  const norm = (arr: string[]) => [...new Set(arr)].sort();
  const A = norm(chosen);
  const B = norm(correct);

  ok = body.reveal ? false : A.join("|") === B.join("|");

  const missing = B.filter((x) => !A.includes(x));
  const extra = A.filter((x) => !B.includes(x));

  expected = {
    kind: "multi_choice",
    optionIds: B,
    debug: {
      reveal: Boolean(body.reveal),
      chosen: A,
      missing,
      extra,
      matches: ok,
    },
  };

  explanation = ok ? "Correct." : "Not quite — check which properties apply.";
}

else if (instance.kind === "vector_drag_target") {
  const tol = Number((instance.publicPayload as any)?.tolerance ?? 0.15);

  const target = secret.targetA ?? secret.expected?.targetA ?? { x: 0, y: 0 };
  const tx = Number(target?.x ?? 0);
  const ty = Number(target?.y ?? 0);

  const a = (body.answer as any)?.a;
  const ax = a ? Number(a.x ?? 0) : null;
  const ay = a ? Number(a.y ?? 0) : null;

  const dx = ax === null ? null : ax - tx;
  const dy = ay === null ? null : ay - ty;

  ok =
    body.reveal
      ? false
      : !!a &&
        closeEnough(Number(a.x), tx, tol) &&
        closeEnough(Number(a.y), ty, tol);

  expected = {
    kind: "vector_drag_target",
    targetA: { x: tx, y: ty, z: 0 },
    tolerance: tol,
    solutionA: { x: tx, y: ty, z: 0 },
    debug: {
      reveal: Boolean(body.reveal),
      receivedA: a ? { x: ax, y: ay, z: Number(a.z ?? 0) } : null,
      dx,
      dy,
      withinX: dx === null ? null : Math.abs(dx) <= tol,
      withinY: dy === null ? null : Math.abs(dy) <= tol,
    },
  };

  explanation = body.reveal
    ? `Solution shown. Drag a to (${tx}, ${ty}).`
    : ok
    ? "Nice drag accuracy."
    : `Get closer to (${tx}, ${ty}).`;
}

else if (instance.kind === "vector_drag_dot") {
  const tol = Number(
    (instance.publicPayload as any)?.tolerance ?? secret.tolerance ?? 0.5
  );

  const targetDot = Number(secret.targetDot ?? secret.expected?.targetDot ?? 0);
  const b = secret.b ?? (instance.publicPayload as any)?.b;
  const minMag = Number(secret.minMag ?? 0.25);

  const solutionA = b ? solutionForDot(b, targetDot, minMag) : null;

  // always present
  const debug: any = {
    reveal: Boolean(body.reveal),
    receivedA: null,
    usedB: b ? { x: Number(b.x ?? 0), y: Number(b.y ?? 0), z: Number(b.z ?? 0) } : null,
    dot: null,
    aMag: null,
    delta: null,
    reason: null,
  };

  expected = {
    kind: "vector_drag_dot",
    targetDot,
    tolerance: tol,
    b,
    minMag,
    solutionA,
    debug,
  };

  if (body.reveal) {
    ok = false;
    debug.reason = "reveal";
    explanation = solutionA
      ? `One valid answer is shown (a·b = ${targetDot}). Drag a to match the shown direction.`
      : "Missing b (cannot compute reveal solution).";
  } else {
    const a = (body.answer as any)?.a;

    if (!a || !b) {
      ok = false;
      debug.reason = "missing_a_or_b";
      explanation = "Missing vector data (a or b).";
    } else {
      const ax = Number(a.x), ay = Number(a.y), az = Number(a.z ?? 0);
      const bx = Number(b.x), by = Number(b.y), bz = Number(b.z ?? 0);

      const dot = ax * bx + ay * by + az * bz;
      const aMag = Math.sqrt(ax * ax + ay * ay + az * az);

      debug.receivedA = { x: ax, y: ay, z: az };
      debug.usedB = { x: bx, y: by, z: bz };
      debug.dot = dot;
      debug.aMag = aMag;
      debug.delta = dot - targetDot;

      if (!Number.isFinite(aMag) || aMag < minMag) {
        ok = false;
        debug.reason = "a_too_small";
        explanation = `a cannot be the zero vector (|a| must be ≥ ${minMag}).`;
      } else {
        ok = closeEnough(dot, targetDot, tol);
        debug.reason = ok ? "ok" : "dot_outside_tol";
        explanation = ok
          ? "Correct."
          : `Your a·b = ${dot.toFixed(2)}. Aim for ${targetDot} ± ${tol}.`;
      }
    }
  }
}

  const isReveal = Boolean(body.reveal);

  await prisma.practiceAttempt.create({
    data: {
      sessionId: instance.sessionId ?? null,
      instanceId: instance.id,
      userId: actor.userId ?? null,
      guestId: actor.guestId ?? null,
answerPayload: isReveal ? { reveal: true } : (body.answer ?? Prisma.JsonNull),
      ok: isReveal ? false : ok,
      revealUsed: isReveal,
    },
  });

  const shouldMarkAnswered = instance.answeredAt ? false : !isReveal;
  if (shouldMarkAnswered) {
    await prisma.practiceQuestionInstance.update({
      where: { id: instance.id },
      data: { answeredAt: new Date() },
    });
  }
  const shouldCountTowardSession =
    !isReveal && Boolean(instance.sessionId) && instance.answeredAt === null;

  let sessionComplete = false;
  let sessionSummary: null | {
    correct: number;
    total: number;
    missed: Array<{
      title?: string;
      prompt?: string;
      expected?: any;
      yourAnswer?: any;
      explanation?: string;
    }>;
  } = null;

  if (shouldCountTowardSession && instance.sessionId) {
    const updated = await prisma.practiceSession.update({
      where: { id: instance.sessionId },
      data: {
        total: { increment: 1 },
        correct: { increment: isReveal ? 0 : ok ? 1 : 0 },
      },
    });

    if (updated.total >= updated.targetCount) {
      const completed = await prisma.practiceSession.update({
        where: { id: updated.id },
        data: { status: "completed", completedAt: new Date() },
      });

      sessionComplete = true;

      const missedAttempts = await prisma.practiceAttempt.findMany({
        where: { sessionId: completed.id, ok: false, revealUsed: false },
        distinct: ["instanceId"],
        include: { instance: true },
        orderBy: { createdAt: "asc" },
      });

      sessionSummary = {
        correct: completed.correct,
        total: completed.total,
        missed: missedAttempts.map((a) => ({
          title: a.instance.title,
          prompt: a.instance.prompt,
          yourAnswer: a.answerPayload,
          expected:
            (a.instance.secretPayload as any)?.expected ??
            (a.instance.secretPayload as any)?.correctOptionId ??
            (a.instance.secretPayload as any)?.targetA ??
            null,
          explanation: undefined,
        })),
      };
    }
  }

  const res = NextResponse.json({
    ok: isReveal ? false : ok,
    expected,
    explanation,
    sessionComplete,
    summary: sessionSummary,
  });

  return attachGuestCookie(res, setGuestId);
}
