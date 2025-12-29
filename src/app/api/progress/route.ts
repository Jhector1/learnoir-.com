// src/app/api/progress/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/practice/actor";

export const runtime = "nodejs";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30d";

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const from = daysAgo(days);

  const actor = await getActor();
  console.log("Progress for actor:", actor);

  const whereActor = {
    OR: [
      actor.userId ? { userId: actor.userId } : undefined,
      actor.guestId ? { guestId: actor.guestId } : undefined,
    ].filter(Boolean) as any,
  };

  // Attempts within range (include instance for topic/difficulty)
  const attempts = await prisma.practiceAttempt.findMany({
    where: {
      ...whereActor,
      createdAt: { gte: from },
    },
    include: { instance: true },
    orderBy: { createdAt: "asc" },
  });

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.ok).length;
  const accuracy = totalAttempts ? correctAttempts / totalAttempts : 0;

  // sessions completed
  const sessionsCompleted = await prisma.practiceSession.count({
    where: {
      ...whereActor,
      status: "completed",
      completedAt: { gte: from },
    },
  });

  // byTopic and byDifficulty
  const byTopicMap = new Map<string, { attempts: number; correct: number }>();
  const byDiffMap = new Map<string, { attempts: number; correct: number }>();
  const byDayMap = new Map<string, { attempts: number; correct: number }>();

  for (const a of attempts) {
    const t = a.instance.topic;
    const d = a.instance.difficulty;

    byTopicMap.set(t, {
      attempts: (byTopicMap.get(t)?.attempts ?? 0) + 1,
      correct: (byTopicMap.get(t)?.correct ?? 0) + (a.ok ? 1 : 0),
    });

    byDiffMap.set(d, {
      attempts: (byDiffMap.get(d)?.attempts ?? 0) + 1,
      correct: (byDiffMap.get(d)?.correct ?? 0) + (a.ok ? 1 : 0),
    });

    const day = a.createdAt.toISOString().slice(0, 10);
    byDayMap.set(day, {
      attempts: (byDayMap.get(day)?.attempts ?? 0) + 1,
      correct: (byDayMap.get(day)?.correct ?? 0) + (a.ok ? 1 : 0),
    });
  }

  const byTopic = Array.from(byTopicMap.entries()).map(([topic, v]) => ({
    topic,
    attempts: v.attempts,
    correct: v.correct,
    accuracy: v.attempts ? v.correct / v.attempts : 0,
  }));

  const byDifficulty = Array.from(byDiffMap.entries()).map(([difficulty, v]) => ({
    difficulty,
    attempts: v.attempts,
    correct: v.correct,
    accuracy: v.attempts ? v.correct / v.attempts : 0,
  }));

  const accuracyTimeline = Array.from(byDayMap.entries()).map(([date, v]) => ({
    date,
    attempts: v.attempts,
    correct: v.correct,
    accuracy: v.attempts ? v.correct / v.attempts : 0,
  }));

  // Best topic (highest accuracy among topics with enough attempts)
  const bestTopic =
    byTopic
      .filter((x) => x.attempts >= 5)
      .sort((a, b) => b.accuracy - a.accuracy)[0]?.topic ?? (byTopic[0]?.topic ?? "dot");

  // Recent sessions
  const recentSessionsRaw = await prisma.practiceSession.findMany({
    where: { ...whereActor, status: "completed" },
    orderBy: { completedAt: "desc" },
    take: 12,
  });

  const recentSessions = recentSessionsRaw.map((s) => ({
    id: s.id,
    createdAt: (s.completedAt ?? s.startedAt).toISOString(),
    topic: "dot", // sessions are by section; topic is per instance, not per session. (keep UI compatible)
    difficulty: s.difficulty,
    totalCount: s.total,
    correctCount: s.correct,
    accuracy: s.total ? s.correct / s.total : 0,
  }));

  // Missed attempts list
  const missedRaw = await prisma.practiceAttempt.findMany({
    where: {
      ...whereActor,
      ok: false,
      revealUsed: false,
      createdAt: { gte: from },
    },
    include: { instance: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const missed = missedRaw.map((a) => ({
    occurredAt: a.createdAt.toISOString(),
    topic: a.instance.topic,
    difficulty: a.instance.difficulty,
    kind: a.instance.kind,
    title: a.instance.title,
    prompt: a.instance.prompt,
    userAnswer: a.answerPayload,
    expected:
      (a.instance.secretPayload as any)?.expected ??
      (a.instance.secretPayload as any)?.correctOptionId ??
      (a.instance.secretPayload as any)?.targetA,
    explanation: undefined,
  }));

  // Streak days: count consecutive days (from today backwards) with >=1 attempt
  const daysWithAttempts = new Set(attempts.map((a) => a.createdAt.toISOString().slice(0, 10)));
  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daysWithAttempts.has(key)) streakDays++;
    else break;
  }

  return NextResponse.json({
    totals: {
      sessionsCompleted,
      attempts: totalAttempts,
      correct: correctAttempts,
      accuracy,
      bestTopic,
      streakDays,
    },
    byTopic,
    byDifficulty,
    accuracyTimeline,
    recentSessions,
    missed,
    meta: { range },
  });
}
