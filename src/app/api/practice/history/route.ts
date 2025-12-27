// src/app/api/practice/history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/practice/actor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Number(searchParams.get("take") ?? "40");
  const status = (searchParams.get("status") as "active" | "completed" | null) ?? null;

  const actor = await getActor();
  if (!actor.userId && !actor.guestId) {
    return NextResponse.json({ message: "No actor." }, { status: 401 });
  }

  const sessions = await prisma.practiceSession.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(actor.userId ? { userId: actor.userId } : { guestId: actor.guestId! }),
    },
    include: {
      section: true,
      attempts: {
        where: { ok: false, revealUsed: false },
        include: { instance: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startedAt: "desc" },
    take: Math.min(200, Math.max(1, take)),
  });
  console.log(`Found ${sessions.length} sessions for actor.`, sessions, actor);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      difficulty: s.difficulty,
      section: { slug: s.section.slug, title: s.section.title },
      correct: s.correct,
      total: s.total,
      targetCount: s.targetCount,
      missed: s.attempts.map((a) => ({
        title: a.instance.title,
        prompt: a.instance.prompt,
        yourAnswer: a.answerPayload,
        expected:
          (a.instance.secretPayload as any)?.expected ??
          (a.instance.secretPayload as any)?.correctOptionId ??
          (a.instance.secretPayload as any)?.correctOptionIds ??
          (a.instance.secretPayload as any)?.targetA,
      })),
    })),
  });
}
