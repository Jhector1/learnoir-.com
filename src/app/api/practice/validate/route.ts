import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachGuestCookie, ensureGuestId, getActor } from "@/lib/practice/actor";
import { verifyPracticeKey } from "@/lib/practice/key";

export const runtime = "nodejs";

type SubmitAnswer =
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "numeric"; value: number }
  | { kind: "vector_drag_target"; a: { x: number; y: number; z?: number }; b?: any }
  | { kind: "vector_drag_dot"; a: { x: number; y: number; z?: number } };

function closeEnough(a: number, b: number, tol: number) {
  return Math.abs(a - b) <= tol;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { key: string; answer?: SubmitAnswer; reveal?: boolean }
    | null;

  if (!body?.key) return NextResponse.json({ message: "Missing key." }, { status: 400 });

  const actor0 = await getActor();
  const { actor, setGuestId } = ensureGuestId(actor0);

  const payload = verifyPracticeKey(body.key);
  if (!payload) {
    const res = NextResponse.json({ message: "Invalid or expired key." }, { status: 401 });
    return attachGuestCookie(res, setGuestId);
  }

  // actor match (prevents key sharing)
  if (
    (payload.userId && payload.userId !== (actor.userId ?? null)) ||
    (payload.guestId && payload.guestId !== (actor.guestId ?? null))
  ) {
    const res = NextResponse.json({ message: "Actor mismatch." }, { status: 401 });
    return attachGuestCookie(res, setGuestId);
  }

  const instance = await prisma.practiceQuestionInstance.findUnique({
    where: { id: payload.instanceId },
  });
  if (!instance) {
    const res = NextResponse.json({ message: "Instance not found." }, { status: 404 });
    return attachGuestCookie(res, setGuestId);
  }

  const secret = instance.secretPayload as any;

  let ok = false;
  let expected: any = null;
  let explanation = "";

  // Compute expected + ok by kind
  if (instance.kind === "numeric") {
    expected = secret.expected;
    const tol = Number(secret.tolerance ?? 0);
    const v = (body.answer as any)?.value;
    ok = body.reveal ? false : closeEnough(Number(v), Number(expected), tol);
    explanation = ok ? "Correct." : `Expected ${expected}${tol ? ` ± ${tol}` : ""}.`;
  } else if (instance.kind === "single_choice") {
    expected = secret.expected ?? { optionId: secret.correctOptionId };
    const chosen = (body.answer as any)?.optionId;
    ok = body.reveal ? false : chosen === (expected.optionId ?? secret.correctOptionId);
    explanation = ok ? "Correct choice." : "Not quite — review the concept.";
  } else if (instance.kind === "multi_choice") {
    expected = secret.expected ?? { optionIds: secret.correctOptionIds ?? [] };
    const chosen: string[] = (body.answer as any)?.optionIds ?? [];
    const a = [...chosen].sort().join("|");
    const b = [...(expected.optionIds ?? [])].sort().join("|");
    ok = body.reveal ? false : a === b;
    explanation = ok ? "Correct." : "Not quite — check which properties apply.";
  } else if (instance.kind === "vector_drag_target") {
    expected = secret.expected ?? { targetA: secret.targetA };
    const tol = Number((instance.publicPayload as any)?.tolerance ?? 0.15);
    const a = (body.answer as any)?.a;
    const tx = (expected.targetA ?? secret.targetA)?.x;
    const ty = (expected.targetA ?? secret.targetA)?.y;

    ok =
      body.reveal
        ? false
        : !!a &&
          closeEnough(Number(a.x), Number(tx), tol) &&
          closeEnough(Number(a.y), Number(ty), tol);

    explanation = ok ? "Nice drag accuracy." : `Get closer to (${tx}, ${ty}).`;
  } else if (instance.kind === "vector_drag_dot") {
    expected = secret.expected ?? null;
    ok = false;
    explanation = "Not implemented yet.";
  }

  const isReveal = Boolean(body.reveal);

  // Save attempt always
  await prisma.practiceAttempt.create({
    data: {
      sessionId: instance.sessionId ?? null,
      instanceId: instance.id,
      userId: actor.userId ?? null,
      guestId: actor.guestId ?? null,
      answerPayload: isReveal ? { reveal: true } : (body.answer ?? null),
      ok: isReveal ? false : ok,
      revealUsed: isReveal,
    },
  });

  // Only “consume” the instance once:
  // - If you want reveal to also consume it, keep (isReveal || ...)
  // - If you want reveal NOT to consume it, use (!isReveal && ...)
  const shouldMarkAnswered = instance.answeredAt ? false : true; // consume on first validate OR reveal
  if (shouldMarkAnswered) {
    await prisma.practiceQuestionInstance.update({
      where: { id: instance.id },
      data: { answeredAt: new Date() },
    });
  }

  // Only increment session totals ONCE per instance, and only when instance was previously unanswered.
  // This prevents double-counting if user hits Submit multiple times.
  const shouldCountTowardSession =
    Boolean(instance.sessionId) && instance.answeredAt === null; // first time only

  let sessionComplete = false;
  let sessionSummary: null | {
    correct: number;
    total: number;
    missed: Array<{ title?: string; prompt?: string; expected?: any; yourAnswer?: any; explanation?: string }>;
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

      // Missed: distinct by instanceId to avoid duplicates if user spam-submitted
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
          expected: (a.instance.secretPayload as any)?.expected
            ?? (a.instance.secretPayload as any)?.correctOptionId
            ?? (a.instance.secretPayload as any)?.targetA
            ?? null,
          explanation: undefined,
        })),
      };
    }
  }

  const res = NextResponse.json({
    ok: isReveal ? false : ok,
    expected, // if you want to hide expected unless reveal, we can gate this
    explanation,
    sessionComplete,
    summary: sessionSummary,
  });

  return attachGuestCookie(res, setGuestId);
}
