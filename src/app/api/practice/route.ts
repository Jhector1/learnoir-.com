// src/app/api/practice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExerciseWithExpected } from "@/lib/practice/generator";
import { signPracticeKey } from "@/lib/practice/key";
import { attachGuestCookie, ensureGuestId, getActor } from "@/lib/practice/actor";
import type { Topic, Difficulty, Exercise } from "@/lib/practice/types";
import { TOPICS, DIFFICULTIES, asTopicOrAll, asDifficultyOrAll, pick } from "@/lib/practice/catalog";
import { requireEntitledUser } from "@/lib/billing/requireEntitledUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Small helper so you never forget cookies again
function withGuestCookie<T>(
  body: T,
  status: number,
  setGuestId: string | undefined
) {
  const res = NextResponse.json(body as any, { status });
  return attachGuestCookie(res, setGuestId);
}

async function createInstance(args: {
  sessionId: string | null;
  exercise: Exercise;
  expected: any;
  topic: Topic;
  difficulty: Difficulty;
}) {
  const { sessionId, exercise, expected, topic, difficulty } = args;

  return prisma.practiceQuestionInstance.create({
    data: {
      sessionId,
      kind: (exercise as any).kind,
      topic: (exercise as any).topic ?? topic,
      difficulty: (exercise as any).difficulty ?? difficulty,
      title: String((exercise as any).title ?? "Practice"),
      prompt: String((exercise as any).prompt ?? ""),
      publicPayload: exercise as any,
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionIdParam = searchParams.get("sessionId");

    const actor0 = await getActor();
    const ensured = ensureGuestId(actor0);
    const actor = ensured.actor;
    const setGuestId = ensured.setGuestId;

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
              topics: true,
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
        return withGuestCookie({ message: "Session is not active." }, 400, setGuestId);
      }

      // ownership check (user OR guest)
      if (
        (session.userId && session.userId !== (actor.userId ?? null)) ||
        (session.guestId && session.guestId !== (actor.guestId ?? null))
      ) {
        return withGuestCookie({ message: "Forbidden." }, 403, setGuestId);
      }

      const now = new Date();

      let topic: Topic;
      let difficulty: Difficulty;

      // ----------------------------
      // Assignment session rules
      // ----------------------------
      if (session.assignmentId) {
        const gate = await requireEntitledUser();
        // IMPORTANT: still attach guest cookie if one was created
        if (!gate.ok) {
          return attachGuestCookie(gate.res, setGuestId);
        }
        if (session.userId && session.userId !== gate.userId) {
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

        // make sure it’s mutable + typed
        const allowedTopics = Array.from(a.topics ?? []) as Topic[];
        topic = allowedTopics.length ? pick(allowedTopics) : pick(TOPICS);

        // if DB can ever be null, fallback
        difficulty = (a.difficulty as Difficulty) ?? pick(DIFFICULTIES);
      } else {
        // ----------------------------
        // Normal session rules
        // ----------------------------
        const topicOrAll = asTopicOrAll(searchParams.get("topic"));
        const difficultyOrAll = asDifficultyOrAll(searchParams.get("difficulty"));

        topic = topicOrAll === "all" ? pick(TOPICS) : topicOrAll;
        difficulty = difficultyOrAll === "all" ? pick(DIFFICULTIES) : difficultyOrAll;
      }

      const { exercise, expected } = await getExerciseWithExpected(topic, difficulty);

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
        topic,
        difficulty,
      });

      // optional: track last instance
      prisma.practiceSession
        .update({ where: { id: session.id }, data: { lastInstanceId: instance.id } })
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
          },
        },
        200,
        setGuestId
      );
    }

    // ----------------------------
    // Stateless mode
    // ----------------------------
    const topicOrAll = asTopicOrAll(searchParams.get("topic"));
    const difficultyOrAll = asDifficultyOrAll(searchParams.get("difficulty"));

    const topic: Topic = topicOrAll === "all" ? pick(TOPICS) : topicOrAll;
    const difficulty: Difficulty =
      difficultyOrAll === "all" ? pick(DIFFICULTIES) : difficultyOrAll;

    const { exercise, expected } = await getExerciseWithExpected(topic, difficulty);

    if (!exercise || typeof (exercise as any).kind !== "string") {
      return withGuestCookie({ message: "Generator returned invalid exercise." }, 500, setGuestId);
    }

    const instance = await createInstance({
      sessionId: null,
      exercise: exercise as Exercise,
      expected,
      topic,
      difficulty,
    });

    const key = signKey({
      instanceId: instance.id,
      sessionId: null,
      userId: actor.userId ?? null,
      guestId: actor.guestId ?? null,
    });

    return withGuestCookie({ exercise: exercise as Exercise, key }, 200, setGuestId);
  } catch (err: any) {
    console.error("[/api/practice] error:", err);
    return NextResponse.json(
      { message: "Practice API failed", explanation: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
