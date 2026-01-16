// src/app/api/practice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExerciseWithExpected } from "@/lib/practice/generator";
import { signPracticeKey } from "@/lib/practice/key";
import {
  attachGuestCookie,
  ensureGuestId,
  getActor,
} from "@/lib/practice/actor";
import type { Difficulty, Exercise, GenKey, TopicSlug } from "@/lib/practice/types";

import { DIFFICULTIES, pick } from "@/lib/practice/catalog";
import { genKeyFromAnySlug, toDbTopicSlug } from "@/lib/practice/topicSlugs";
import { requireEntitledUser } from "@/lib/billing/requireEntitledUser";
import { TOPIC_GENERATORS } from "@/lib/practice/generatorImpl/topicRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ engine-supported topics only
const GEN_TOPICS = Object.keys(TOPIC_GENERATORS) as GenKey[];

// Small helper so you never forget cookies again
function withGuestCookie<T>(
  body: T,
  status: number,
  setGuestId: string | undefined
) {
  const res = NextResponse.json(body as any, { status });
  return attachGuestCookie(res, setGuestId);
}

/**
 * Convert ANY incoming topic query to:
 * - canonical DB slug (TopicSlug)
 * - generator key (GenKey | null)
 */
function normalizeTopicQuery(input: string | null | undefined): {
  requestedDbSlug: TopicSlug | "all";
  genKey: GenKey | null;
} {
  const raw = String(input ?? "").trim();
  if (!raw || raw === "all") return { requestedDbSlug: "all", genKey: null };

  // canonical DB-style slug
  const dbSlug = toDbTopicSlug(raw);

  // Matrices Part 1 subtopics (all share one engine)
  const m2Part1 = new Set([
    "m2.matrices_intro",
    "m2.index_slice",
    "m2.special",
    "m2.elementwise_shift",
    "m2.matmul",
    "m2.matvec",
    "m2.transpose_liveevil",
    "m2.symmetric",
  ]);

  if (m2Part1.has(dbSlug)) {
    return { requestedDbSlug: dbSlug, genKey: "matrices_part1" };
  }

  // general fallback: suffix/legacy mapping
  const gk = genKeyFromAnySlug(dbSlug) ?? genKeyFromAnySlug(raw);
  return { requestedDbSlug: dbSlug, genKey: gk };
}

/**
 * Resolve a topic slug (TopicSlug) to the DB topic id.
 * PracticeQuestionInstance requires topicId.
 */
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

async function createInstance(args: {
  sessionId: string | null;
  exercise: Exercise;
  expected: any;
  topic: TopicSlug; // DB slug
  difficulty: Difficulty;
}) {
  const { sessionId, exercise, expected, topic, difficulty } = args;

  const difficultyValue = ((exercise as any).difficulty ?? difficulty) as Difficulty;

  // exercise may override topic; treat it as slug too
  const rawTopicSlug = String((exercise as any).topic ?? topic);
  const dbTopicSlug = toDbTopicSlug(rawTopicSlug);
  const topicId = await resolveTopicIdOrThrow(dbTopicSlug);

  return prisma.practiceQuestionInstance.create({
    data: {
      sessionId,
      kind: (exercise as any).kind,
      topicId,
      difficulty: difficultyValue,
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
}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return signPracticeKey({
    instanceId: args.instanceId,
    sessionId: args.sessionId,
    userId: args.userId,
    guestId: args.guestId,
    exp: nowSec + 60 * 60,
  });
}

/**
 * Strict session ownership:
 * - If the session has no owner -> error
 * - If session is user-owned -> actor.userId must match
 * - If session is guest-owned -> actor.guestId must match
 */
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
      return {
        ok: false as const,
        status: 403,
        body: { message: "Forbidden." },
      };
    }
    return { ok: true as const };
  }

  // guest-owned
  if (!actorGuestId || sessionGuestId !== actorGuestId) {
    return { ok: false as const, status: 403, body: { message: "Forbidden." } };
  }
  return { ok: true as const };
}

export async function GET(req: Request) {
  // ✅ actor + guest cookie must be available in BOTH session + stateless mode
  const actor0 = await getActor();
  const ensured = ensureGuestId(actor0);
  const actor = ensured.actor;
  const setGuestId = ensured.setGuestId;

  try {
    const { searchParams } = new URL(req.url);
    const sessionIdParam = searchParams.get("sessionId");

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
              topics: { select: { topic: { select: { slug: true } } } },
              difficulty: true,
              questionCount: true,
              availableFrom: true,
              dueAt: true,
            },
          },
        },
      });

      if (!session) {
        return withGuestCookie({ message: "Session not found." }, 404, setGuestId);
      }
      if (session.status !== "active") {
        return withGuestCookie(
          { message: "Session is not active." },
          400,
          setGuestId
        );
      }

      const owns = assertOwnsSessionOrThrow({
        sessionUserId: session.userId ?? null,
        sessionGuestId: session.guestId ?? null,
        actorUserId: actor.userId ?? null,
        actorGuestId: actor.guestId ?? null,
      });
      if (!owns.ok) {
        return withGuestCookie(owns.body, owns.status, setGuestId);
      }

      const now = new Date();

      let topicSlug: TopicSlug;
      let genTopic: GenKey;
      let difficulty: Difficulty;

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
        if (!a)
          return withGuestCookie({ message: "Assignment not found." }, 404, setGuestId);

        if (a.status !== "published") {
          return withGuestCookie(
            { message: "Assignment not available." },
            400,
            setGuestId
          );
        }
        if (a.availableFrom && now < a.availableFrom) {
          return withGuestCookie({ message: "Not available yet." }, 400, setGuestId);
        }
        if (a.dueAt && now > a.dueAt) {
          return withGuestCookie({ message: "Assignment is past due." }, 400, setGuestId);
        }

        const allowedSlugs = (a.topics ?? [])
          .map((x) => x.topic?.slug)
          .filter(Boolean)
          .map((s) => toDbTopicSlug(String(s))) as TopicSlug[];

        const allowedGen = allowedSlugs
          .map((s) => normalizeTopicQuery(s).genKey)
          .filter(Boolean) as GenKey[];

        genTopic = allowedGen.length ? pick(allowedGen) : pick(GEN_TOPICS);

        // store a *reasonable* slug (DB) for instance creation
        topicSlug =
          allowedSlugs.length
            ? pick(allowedSlugs)
            : toDbTopicSlug(String(genTopic));

        difficulty = (a.difficulty as Difficulty) ?? pick(DIFFICULTIES);
      } else {
        // ----------------------------
        // Normal session rules
        // ----------------------------
        const rawTopic = searchParams.get("topic");
        const rawDifficulty = searchParams.get("difficulty");

        const { requestedDbSlug, genKey } = normalizeTopicQuery(rawTopic);

        genTopic =
          requestedDbSlug === "all"
            ? pick(GEN_TOPICS)
            : genKey ?? pick(GEN_TOPICS);

        topicSlug =
          requestedDbSlug === "all"
            ? toDbTopicSlug(String(genTopic))
            : requestedDbSlug;

        difficulty =
          rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
            ? (rawDifficulty as Difficulty)
            : pick(DIFFICULTIES);
      }

      const { exercise, expected } = await getExerciseWithExpected(genTopic, difficulty);

      if (!exercise || typeof (exercise as any).kind !== "string") {
        return withGuestCookie(
          { message: "Generator returned invalid exercise." },
          500,
          setGuestId
        );
      }

      const instance = await createInstance({
        sessionId: session.id,
        exercise: exercise as Exercise,
        expected,
        topic: topicSlug,
        difficulty,
      });

      prisma.practiceSession
        .update({
          where: { id: session.id },
          data: { lastInstanceId: instance.id },
        })
        .catch(() => {});

      const key = signKey({
        instanceId: instance.id,
        sessionId: instance.sessionId ?? null,
        userId: actor.userId ?? null,
        guestId: actor.guestId ?? null,
      });

      return withGuestCookie(
        {
          exercise: exercise as Exercise,
          key,
          sessionId: session.id,
          meta: {
            mode: session.assignmentId ? "assignment" : "session",
            targetCount: session.targetCount,
            requestedTopic: topicSlug,
            generatorTopic: genTopic,
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
      requestedDbSlug === "all" ? toDbTopicSlug(String(genTopic)) : requestedDbSlug;

    const difficulty: Difficulty =
      rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
        ? (rawDifficulty as Difficulty)
        : pick(DIFFICULTIES);

    const { exercise, expected } = await getExerciseWithExpected(genTopic, difficulty);

    if (!exercise || typeof (exercise as any).kind !== "string") {
      return withGuestCookie(
        { message: "Generator returned invalid exercise." },
        500,
        setGuestId
      );
    }

    const instance = await createInstance({
      sessionId: null,
      exercise: exercise as Exercise,
      expected,
      topic: topicSlug,
      difficulty,
    });

    const key = signKey({
      instanceId: instance.id,
      sessionId: null,
      userId: actor.userId ?? null,
      guestId: actor.guestId ?? null,
    });

    return withGuestCookie(
      {
        exercise: exercise as Exercise,
        key,
        meta: { requestedTopic: topicSlug, generatorTopic: genTopic },
      },
      200,
      setGuestId
    );
  } catch (err: any) {
    console.error("[/api/practice] error:", err);
    return withGuestCookie(
      {
        message: "Practice API failed",
        explanation: err?.message ?? String(err),
      },
      500,
      setGuestId
    );
  }
}
