// src/app/api/practice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExerciseWithExpected } from "@/lib/practice/generator";
import { signPracticeKey } from "@/lib/practice/key";
import { attachGuestCookie, ensureGuestId, getActor } from "@/lib/practice/actor";
import type { Difficulty, Exercise, GenKey, TopicSlug } from "@/lib/practice/types";

import { DIFFICULTIES, pick } from "@/lib/practice/catalog";
import { genKeyFromAnySlug, toDbTopicSlug } from "@/lib/practice/topicSlugs";
import { requireEntitledUser } from "@/lib/billing/requireEntitledUser";
import { TOPIC_GENERATORS } from "@/lib/practice/generatorImpl/topicRegistry";
import { PracticeKind, PracticeDifficulty as DbPracticeDifficulty } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEN_TOPICS = Object.keys(TOPIC_GENERATORS) as GenKey[];

// ---------------- helpers ----------------

function withGuestCookie<T>(body: T, status: number, setGuestId: string | undefined) {
  const res = NextResponse.json(body as any, { status });
  return attachGuestCookie(res, setGuestId);
}

function normalizeTopicQuery(input: string | null | undefined): {
  requestedDbSlug: TopicSlug | "all";
  genKey: GenKey | null;
} {
  const raw = String(input ?? "").trim();
  if (!raw || raw === "all") return { requestedDbSlug: "all", genKey: null };

  const dbSlug = toDbTopicSlug(raw);

  const m2Part1 = new Set([
    "m2.matrices_intro",
    "m2.index_slice",
    "m2.special",
    "m2.elementwise_shift",
    "m2.matmul",
    "m2.matvec",
    "m2.transpose_liveevil",
    "m2.symmetric",
    "m2.matrices_part1",
  ]);

  const m3Part2 = new Set([
    "m3.norms",
    "m3.colspace",
    "m3.nullspace",
    "m3.rank",
    "m3.det",
    "m3.charpoly",
    "m3.matrices_part2",
  ]);

  if (m2Part1.has(dbSlug)) return { requestedDbSlug: dbSlug, genKey: "matrices_part1" };
  if (m3Part2.has(dbSlug)) return { requestedDbSlug: dbSlug, genKey: "matrices_part2" };

  const gk = genKeyFromAnySlug(dbSlug) ?? genKeyFromAnySlug(raw);
  return { requestedDbSlug: dbSlug, genKey: gk };
}

async function resolveTopicIdOrThrow(topicSlug: string) {
  const canonical = topicSlug;

  const t = await prisma.practiceTopic.findUnique({
    where: { slug: canonical },
    select: { id: true, slug: true },
  });

  if (!t) {
    throw new Error(
      `Topic slug "${topicSlug}" not found in DB (canonical="${canonical}"). Did you seed PracticeTopic?`
    );
  }

  return t.id;
}

function toPracticeKindOrThrow(kind: string): PracticeKind {
  const k = kind as PracticeKind;

  const allowed = new Set<PracticeKind>([
    PracticeKind.numeric,
    PracticeKind.single_choice,
    PracticeKind.multi_choice,
    PracticeKind.vector_drag_target,
    PracticeKind.vector_drag_dot,
    PracticeKind.matrix_input,
  ]);

  if (!allowed.has(k)) {
    throw new Error(
      `Unsupported kind "${kind}" for PracticeKind enum. Add it to schema.prisma if intended.`
    );
  }
  return k;
}

function toDbDifficultyOrThrow(d: unknown): DbPracticeDifficulty {
  const s = String(d ?? "").trim();
  if (s === "easy") return DbPracticeDifficulty.easy;
  if (s === "medium") return DbPracticeDifficulty.medium;
  if (s === "hard") return DbPracticeDifficulty.hard;
  throw new Error(`Invalid difficulty "${s}" (expected easy|medium|hard).`);
}

async function createInstance(args: {
  sessionId: string | null;
  exercise: Exercise;
  expected: any;
  topicSlug: TopicSlug; // authoritative topic slug
  difficulty: Difficulty;
  topicIdHint?: string | null; // fast path when caller already knows topicId
}) {
  const { sessionId, exercise, expected, topicSlug, difficulty, topicIdHint } = args;

  const difficultyValue = ((exercise as any).difficulty ?? difficulty) as Difficulty;
  const dbDifficulty = toDbDifficultyOrThrow(difficultyValue);

  const rawTopicSlug = String(topicSlug ?? (exercise as any).topic ?? "");
  const dbTopicSlug = toDbTopicSlug(rawTopicSlug);

  const topicId = topicIdHint ?? (await resolveTopicIdOrThrow(dbTopicSlug));

  const kindStr = String((exercise as any).kind ?? "");
  const kindEnum = toPracticeKindOrThrow(kindStr);

  return prisma.practiceQuestionInstance.create({
    data: {
      sessionId,
      kind: kindEnum,
      topicId,
      difficulty: dbDifficulty,
      title: String((exercise as any).title ?? "Practice"),
      prompt: String((exercise as any).prompt ?? ""),
      publicPayload: { ...(exercise as any), topic: dbTopicSlug },
      secretPayload: {
        expected,
        tolerance: (exercise as any).tolerance ?? null,
      },
    },
    select: { id: true, sessionId: true },
  });
}

function signKey(args: {
  instanceId: string;
  sessionId: string | null;
  userId: string | null;
  guestId: string | null;
  allowReveal: boolean;
}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return signPracticeKey({
    instanceId: args.instanceId,
    sessionId: args.sessionId,
    userId: args.userId,
    guestId: args.guestId,
    allowReveal: args.allowReveal,
    exp: nowSec + 60 * 60,
  });
}

function assertOwnsSessionOrThrow(args: {
  sessionUserId: string | null;
  sessionGuestId: string | null;
  actorUserId: string | null;
  actorGuestId: string | null;
}) {
  const { sessionUserId, sessionGuestId, actorUserId, actorGuestId } = args;

  if (!sessionUserId && !sessionGuestId) {
    return {
      ok: false as const,
      status: 500,
      body: { message: "Session has no owner.", code: "SESSION_UNOWNED" },
    };
  }

  if (sessionUserId) {
    if (!actorUserId || sessionUserId !== actorUserId) {
      return { ok: false as const, status: 403, body: { message: "Forbidden." } };
    }
    return { ok: true as const };
  }

  if (!actorGuestId || sessionGuestId !== actorGuestId) {
    return { ok: false as const, status: 403, body: { message: "Forbidden." } };
  }
  return { ok: true as const };
}

function lockExerciseTopic(exercise: Exercise, lockedTopic: TopicSlug): Exercise {
  return { ...(exercise as any), topic: lockedTopic } as Exercise;
}

async function countInstances(sessionId: string) {
  return prisma.practiceQuestionInstance.count({ where: { sessionId } });
}

// ---------------- FAIR assignment rotation helpers ----------------

type TopicRow = {
  id: string;
  slug: TopicSlug;
  genKey: string | null;
  meta: any;
};

function stableHash32(input: string) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildQuotaMap(sessionId: string, slugs: TopicSlug[], totalQuestions: number) {
  const n = slugs.length;
  const m = new Map<TopicSlug, number>();
  if (!n || totalQuestions <= 0) return m;

  const base = Math.floor(totalQuestions / n);
  const rem = totalQuestions % n;

  const order = [...slugs].sort(
    (a, b) => stableHash32(`${sessionId}|${a}`) - stableHash32(`${sessionId}|${b}`)
  );

  for (let i = 0; i < order.length; i++) {
    m.set(order[i], base + (i < rem ? 1 : 0));
  }
  return m;
}

async function pickNextAssignmentTopic(args: {
  sessionId: string;
  allowedTopics: TopicRow[];
  totalQuestions: number;
}): Promise<TopicRow> {
  const { sessionId, allowedTopics, totalQuestions } = args;

  if (!allowedTopics.length) throw new Error("Assignment has no allowed topics.");
  if (allowedTopics.length === 1) return allowedTopics[0];

  const allowedSlugs = allowedTopics.map((t) => t.slug);
  const quota = buildQuotaMap(sessionId, allowedSlugs, totalQuestions);

  const idToSlug = new Map<string, TopicSlug>();
  for (const t of allowedTopics) idToSlug.set(t.id, t.slug);

  const grouped = await prisma.practiceQuestionInstance.groupBy({
    by: ["topicId"],
    where: { sessionId },
    _count: { _all: true },
  });

  const countBySlug = new Map<TopicSlug, number>();
  for (const g of grouped) {
    const slug = idToSlug.get(g.topicId);
    if (!slug) continue;
    countBySlug.set(slug, g._count._all);
  }

  let best: TopicRow | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestCount = Number.POSITIVE_INFINITY;
  let bestTie = Number.POSITIVE_INFINITY;

  for (const t of allowedTopics) {
    const target = quota.get(t.slug) ?? 0;
    if (target <= 0) continue;

    const count = countBySlug.get(t.slug) ?? 0;
    if (count >= target) continue;

    const score = count / target;
    const tie = stableHash32(`${sessionId}|${t.slug}`);

    if (
      score < bestScore ||
      (score === bestScore && count < bestCount) ||
      (score === bestScore && count === bestCount && tie < bestTie)
    ) {
      best = t;
      bestScore = score;
      bestCount = count;
      bestTie = tie;
    }
  }

  if (best) return best;

  best = null;
  bestCount = Number.POSITIVE_INFINITY;
  bestTie = Number.POSITIVE_INFINITY;

  for (const t of allowedTopics) {
    const target = quota.get(t.slug) ?? 0;
    if (target <= 0) continue;

    const count = countBySlug.get(t.slug) ?? 0;
    const tie = stableHash32(`${sessionId}|${t.slug}`);

    if (count < bestCount || (count === bestCount && tie < bestTie)) {
      best = t;
      bestCount = count;
      bestTie = tie;
    }
  }

  return best ?? allowedTopics[0];
}

// ---------------- topic-matching generator (non-assignment) ----------------

async function getExerciseForTopic(args: {
  genTopic: GenKey;
  difficulty: Difficulty;
  desiredTopic?: TopicSlug | null;
  maxTries?: number;
}) {
  const { genTopic, difficulty, desiredTopic, maxTries = 24 } = args;

  const variantOpt =
    desiredTopic && (desiredTopic.startsWith("m2.") || desiredTopic.startsWith("m3."))
      ? { variant: String(desiredTopic) }
      : undefined;

  let last: { exercise: Exercise; expected: any } | null = null;

  for (let i = 0; i < maxTries; i++) {
    const out = await getExerciseWithExpected(genTopic, difficulty, variantOpt);
    last = out as any;

    if (!desiredTopic) return out as any;

    const exTopic = toDbTopicSlug(String((out.exercise as any)?.topic ?? ""));
    if (exTopic === desiredTopic) return out as any;
  }

  return last ?? (await getExerciseWithExpected(genTopic, difficulty, variantOpt));
}

// ---------------- main handler ----------------

export async function GET(req: Request) {
  const actor0 = await getActor();
  const ensured = ensureGuestId(actor0);
  const actor = ensured.actor;
  const setGuestId = ensured.setGuestId;

  try {
    const { searchParams } = new URL(req.url);
    const sessionIdParam = searchParams.get("sessionId");

    const allowRevealRequested = searchParams.get("allowReveal") === "true";

    // ----------------------------
    // Session mode
    // ----------------------------
    if (sessionIdParam) {
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionIdParam },
        select: {
          id: true,
          status: true,
          userId: true,
          guestId: true,
          targetCount: true,
          assignmentId: true,
          assignment: {
            select: {
              id: true,
              status: true,
              difficulty: true,
              questionCount: true,
              availableFrom: true,
              dueAt: true,
              allowReveal: true,
              topics: {
                select: {
                  topic: { select: { id: true, slug: true, genKey: true, meta: true } },
                },
              },
            },
          },
        },
      });

      if (!session) return withGuestCookie({ message: "Session not found." }, 404, setGuestId);
      if (session.status !== "active") {
        return withGuestCookie({ message: "Session is not active." }, 400, setGuestId);
      }

      const owns = assertOwnsSessionOrThrow({
        sessionUserId: session.userId ?? null,
        sessionGuestId: session.guestId ?? null,
        actorUserId: actor.userId ?? null,
        actorGuestId: actor.guestId ?? null,
      });
      if (!owns.ok) return withGuestCookie(owns.body, owns.status, setGuestId);

      const now = new Date();

      let topicSlug: TopicSlug;
      let topicIdHint: string | null = null;
      let genTopic: GenKey;
      let difficulty: Difficulty;
      let desiredTopic: TopicSlug | null = null;

      let exercise: Exercise;
      let expected: any;

      let allowRevealEffective = false;

      // ----------------------------
      // Assignment session rules
      // ----------------------------
      if (session.assignmentId) {
        const gate = await requireEntitledUser();
        if (!gate.ok) return attachGuestCookie(gate.res, setGuestId);

        if (!session.userId || session.userId !== gate.userId) {
          return withGuestCookie({ message: "Forbidden." }, 403, setGuestId);
        }

        const a = session.assignment;
        if (!a) return withGuestCookie({ message: "Assignment not found." }, 404, setGuestId);

        if (a.status !== "published") {
          return withGuestCookie({ message: "Assignment not available." }, 400, setGuestId);
        }
        if (a.availableFrom && now < a.availableFrom) {
          return withGuestCookie({ message: "Not available yet." }, 400, setGuestId);
        }
        if (a.dueAt && now > a.dueAt) {
          return withGuestCookie({ message: "Assignment is past due." }, 400, setGuestId);
        }

        allowRevealEffective = Boolean(a.allowReveal) && allowRevealRequested;

        const totalQuestions = Number(a.questionCount ?? session.targetCount ?? 10);

        // ✅ COMPLETE => return 200 JSON (NOT 400)
        const already = await countInstances(session.id);
        if (already >= totalQuestions) {
          return withGuestCookie(
            {
              complete: true,
              message: "Assignment complete.",
              sessionId: session.id,
              meta: {
                mode: "assignment",
                targetCount: totalQuestions,
                already,
                allowReveal: allowRevealEffective,
              },
            },
            200,
            setGuestId
          );
        }

        const allowedTopicRows: TopicRow[] = (a.topics ?? [])
          .map((x) => x.topic)
          .filter(Boolean)
          .map((t) => ({
            id: t!.id,
            slug: toDbTopicSlug(String(t!.slug)) as TopicSlug,
            genKey: t!.genKey ?? null,
            meta: t!.meta,
          }));

        if (!allowedTopicRows.length) {
          return withGuestCookie({ message: "Assignment has no topics." }, 400, setGuestId);
        }

        const chosen = await pickNextAssignmentTopic({
          sessionId: session.id,
          allowedTopics: allowedTopicRows,
          totalQuestions,
        });

        topicSlug = chosen.slug;
        topicIdHint = chosen.id;
        desiredTopic = chosen.slug;

        const dbGenKey = (chosen.genKey ?? null) as GenKey | null;
        const fallback = normalizeTopicQuery(chosen.slug).genKey ?? pick(GEN_TOPICS);
        genTopic = (dbGenKey ?? fallback) as GenKey;

        difficulty = (a.difficulty as Difficulty) ?? pick(DIFFICULTIES);

        const variant =
          (chosen.meta as any)?.variant && typeof (chosen.meta as any)?.variant === "string"
            ? String((chosen.meta as any).variant)
            : chosen.slug.startsWith("m2.") || chosen.slug.startsWith("m3.")
            ? String(chosen.slug)
            : null;

        const out = await getExerciseWithExpected(genTopic, difficulty, variant ? { variant } : undefined);
        expected = out.expected;
        exercise = lockExerciseTopic(out.exercise as Exercise, chosen.slug);
      } else {
        // ----------------------------
        // Normal session rules
        // ----------------------------
        const rawTopic = searchParams.get("topic");
        const rawDifficulty = searchParams.get("difficulty");

        allowRevealEffective = allowRevealRequested;

        // ✅ COMPLETE => return 200 JSON (NOT error)
        const totalQuestions = Number(session.targetCount ?? 10);
        const already = await countInstances(session.id);
        if (already >= totalQuestions) {
          return withGuestCookie(
            {
              complete: true,
              message: "Session complete.",
              sessionId: session.id,
              meta: {
                mode: "session",
                targetCount: totalQuestions,
                already,
                allowReveal: allowRevealEffective,
              },
            },
            200,
            setGuestId
          );
        }

        const { requestedDbSlug, genKey } = normalizeTopicQuery(rawTopic);

        genTopic = requestedDbSlug === "all" ? pick(GEN_TOPICS) : (genKey ?? pick(GEN_TOPICS));

        topicSlug =
          requestedDbSlug === "all"
            ? toDbTopicSlug(String(genTopic))
            : (requestedDbSlug as TopicSlug);

        desiredTopic = requestedDbSlug === "all" ? null : (requestedDbSlug as TopicSlug);

        difficulty =
          rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
            ? (rawDifficulty as Difficulty)
            : pick(DIFFICULTIES);

        const out = await getExerciseForTopic({ genTopic, difficulty, desiredTopic });
        exercise = out.exercise as Exercise;
        expected = out.expected;
      }

      if (!exercise || typeof (exercise as any).kind !== "string") {
        return withGuestCookie({ message: "Generator returned invalid exercise." }, 500, setGuestId);
      }

      const lockedTopic = (desiredTopic ?? topicSlug) as TopicSlug;

      const instance = await createInstance({
        sessionId: session.id,
        exercise: exercise as Exercise,
        expected,
        topicSlug: lockedTopic,
        topicIdHint,
        difficulty,
      });

      prisma.practiceSession
        .update({ where: { id: session.id }, data: { lastInstanceId: instance.id } })
        .catch(() => {});

      const key = signKey({
        instanceId: instance.id,
        sessionId: instance.sessionId ?? null,
        userId: actor.userId ?? null,
        guestId: actor.guestId ?? null,
        allowReveal: allowRevealEffective,
      });

      // ✅ include authoritative targetCount so client can display correct 4/4 etc.
      const targetCount =
        session.assignmentId
          ? Number(session.assignment?.questionCount ?? session.targetCount ?? 10)
          : Number(session.targetCount ?? 10);

      return withGuestCookie(
        {
          exercise: exercise as Exercise,
          key,
          sessionId: session.id,
          meta: {
            mode: session.assignmentId ? "assignment" : "session",
            targetCount,
            requestedTopic: lockedTopic,
            generatorTopic: genTopic,
            allowReveal: allowRevealEffective,
          },
        },
        200,
        setGuestId
      );
    }

    // ----------------------------
    // Stateless mode
    // ----------------------------
    const rawTopic = searchParams.get("topic");
    const rawDifficulty = searchParams.get("difficulty");

    const { requestedDbSlug, genKey } = normalizeTopicQuery(rawTopic);

    const genTopic: GenKey =
      requestedDbSlug === "all" ? pick(GEN_TOPICS) : genKey ?? pick(GEN_TOPICS);

    const topicSlug: TopicSlug =
      requestedDbSlug === "all" ? toDbTopicSlug(String(genTopic)) : (requestedDbSlug as TopicSlug);

    const desiredTopic = requestedDbSlug === "all" ? null : (requestedDbSlug as TopicSlug);

    const difficulty: Difficulty =
      rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
        ? (rawDifficulty as Difficulty)
        : pick(DIFFICULTIES);

    const allowRevealEffective = allowRevealRequested;

    const out = await getExerciseForTopic({ genTopic, difficulty, desiredTopic });

    if (!out.exercise || typeof (out.exercise as any).kind !== "string") {
      return withGuestCookie({ message: "Generator returned invalid exercise." }, 500, setGuestId);
    }

    const lockedTopic = (desiredTopic ?? topicSlug) as TopicSlug;
    const exercise = lockExerciseTopic(out.exercise as Exercise, lockedTopic);

    const instance = await createInstance({
      sessionId: null,
      exercise,
      expected: out.expected,
      topicSlug: lockedTopic,
      difficulty,
    });

    const key = signKey({
      instanceId: instance.id,
      sessionId: null,
      userId: actor.userId ?? null,
      guestId: actor.guestId ?? null,
      allowReveal: allowRevealEffective,
    });

    return withGuestCookie(
      {
        exercise,
        key,
        meta: {
          mode: "stateless",
          targetCount: null,
          requestedTopic: lockedTopic,
          generatorTopic: genTopic,
          allowReveal: allowRevealEffective,
        },
      },
      200,
      setGuestId
    );
  } catch (err: any) {
    return withGuestCookie(
      { message: "Practice API failed", explanation: err?.message ?? String(err) },
      500,
      setGuestId
    );
  }
}
