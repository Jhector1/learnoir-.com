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
import type { Topic, Difficulty, Exercise } from "@/lib/practice/types";

// ✅ gate for assignment sessions
import { requireEntitledUser } from "@/lib/billing/requireEntitledUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPICS: Topic[] = [
  "dot","projection","angle","vectors",
  "linear_systems","rref","solution_types","parametric",
  "matrix_ops","matrix_inverse","matrix_properties",
];
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

function asTopicOrAll(v: string | null): Topic | "all" {
  if (!v || v === "all") return "all";
  return (TOPICS as readonly string[]).includes(v) ? (v as Topic) : "all";
}
function asDifficultyOrAll(v: string | null): Difficulty | "all" {
  if (!v || v === "all") return "all";
  return (DIFFS as readonly string[]).includes(v) ? (v as Difficulty) : "all";
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const sessionIdParam = searchParams.get("sessionId");

    // ✅ resolve actor (ties key to user/guest)
    const actor0 = await getActor();
    const ensured = ensureGuestId(actor0);
    const actor = ensured.actor;
    const setGuestId = ensured.setGuestId;

    // ------------------------------------------
    // ✅ If sessionId present: run as a session
    // ------------------------------------------
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
        const res = NextResponse.json(
          { message: "Session not found." },
          { status: 404 }
        );
        return attachGuestCookie(res, setGuestId);
      }

      if (session.status !== "active") {
        const res = NextResponse.json(
          { message: "Session is not active." },
          { status: 400 }
        );
        return attachGuestCookie(res, setGuestId);
      }

      // ✅ ownership check
      if (
        (session.userId && session.userId !== (actor.userId ?? null)) ||
        (session.guestId && session.guestId !== (actor.guestId ?? null))
      ) {
        const res = NextResponse.json({ message: "Forbidden." }, { status: 403 });
        return attachGuestCookie(res, setGuestId);
      }

      const now = new Date();

      // ✅ If this is an assignment session => subscription required + lock rules
      let topic: Topic;
      let difficulty: Difficulty;

      if (session.assignmentId) {
        // hard-block if not entitled
        const gate = await requireEntitledUser();
        if (!gate.ok) return gate.res;

        // optional safety: ensure session user matches gate user
        if (session.userId && session.userId !== gate.userId) {
          return NextResponse.json({ message: "Forbidden." }, { status: 403 });
        }

        const a = session.assignment;
        if (!a) {
          return NextResponse.json(
            { message: "Assignment not found." },
            { status: 404 }
          );
        }
        if (a.status !== "published") {
          return NextResponse.json(
            { message: "Assignment not available." },
            { status: 400 }
          );
        }
        if (a.availableFrom && now < a.availableFrom) {
          return NextResponse.json(
            { message: "Not available yet." },
            { status: 400 }
          );
        }
        if (a.dueAt && now > a.dueAt) {
          return NextResponse.json(
            { message: "Assignment is past due." },
            { status: 400 }
          );
        }

        const allowedTopics = (a.topics ?? []) as Topic[];
        topic = allowedTopics.length ? pick(allowedTopics) : pick(TOPICS);
        difficulty = a.difficulty as Difficulty;
      } else {
        // normal session (not assignment) -> allow query params or random
        const topicOrAll = asTopicOrAll(searchParams.get("topic"));
        const difficultyOrAll = asDifficultyOrAll(searchParams.get("difficulty"));
        topic = topicOrAll === "all" ? pick(TOPICS) : topicOrAll;
        difficulty = difficultyOrAll === "all" ? pick(DIFFS) : difficultyOrAll;
      }

      const { exercise, expected } = await getExerciseWithExpected(topic, difficulty);

      if (!exercise || typeof (exercise as any).kind !== "string") {
        const res = NextResponse.json(
          { message: "Generator returned invalid exercise." },
          { status: 500 }
        );
        return attachGuestCookie(res, setGuestId);
      }

      // ✅ persist instance with sessionId
      const instance = await prisma.practiceQuestionInstance.create({
        data: {
          sessionId: session.id,
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

      // optional: track last instance on session
      await prisma.practiceSession.update({
        where: { id: session.id },
        data: { lastInstanceId: instance.id },
      }).catch(() => {});

      const nowSec = Math.floor(Date.now() / 1000);
      const key = signPracticeKey({
        instanceId: instance.id,
        sessionId: instance.sessionId ?? null,
        userId: actor.userId ?? null,
        guestId: actor.guestId ?? null,
        exp: nowSec + 60 * 60,
      });

      const res = NextResponse.json(
        {
          exercise: exercise as Exercise,
          key,
          sessionId: session.id,
          // extra metadata (safe; front-end can ignore)
          meta: {
            mode: session.assignmentId ? "assignment" : "session",
            targetCount: session.targetCount,
          },
        },
        { status: 200 }
      );

      return attachGuestCookie(res, setGuestId);
    }

    // ------------------------------------------
    // ✅ No sessionId: legacy “stateless” practice
    // ------------------------------------------
    const topicOrAll = asTopicOrAll(searchParams.get("topic"));
    const difficultyOrAll = asDifficultyOrAll(searchParams.get("difficulty"));

    const topic: Topic = topicOrAll === "all" ? pick(TOPICS) : topicOrAll;
    const difficulty: Difficulty =
      difficultyOrAll === "all" ? pick(DIFFS) : difficultyOrAll;

    const { exercise, expected } = await getExerciseWithExpected(topic, difficulty);

    if (!exercise || typeof (exercise as any).kind !== "string") {
      const res = NextResponse.json(
        { message: "Generator returned invalid exercise." },
        { status: 500 }
      );
      return attachGuestCookie(res, setGuestId);
    }

    const instance = await prisma.practiceQuestionInstance.create({
      data: {
        sessionId: null,
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

    const now = Math.floor(Date.now() / 1000);
    const key = signPracticeKey({
      instanceId: instance.id,
      sessionId: null,
      userId: actor.userId ?? null,
      guestId: actor.guestId ?? null,
      exp: now + 60 * 60,
    });

    const res = NextResponse.json({ exercise: exercise as Exercise, key }, { status: 200 });
    return attachGuestCookie(res, setGuestId);
  } catch (err: any) {
    console.error("[/api/practice] error:", err);
    return NextResponse.json(
      { message: "Practice API failed", explanation: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
