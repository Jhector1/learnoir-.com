// src/app/api/assignments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/practice/actor";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor(); // ok if empty
  const now = new Date();

  const assignments = await prisma.assignment.findMany({
    where: {
      status: "published",
      AND: [
        { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
        { OR: [{ dueAt: null }, { dueAt: { gte: now } }] },
      ],
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      topics: true,
      difficulty: true,
      questionCount: true,
      availableFrom: true,
      dueAt: true,
      timeLimitSec: true,
      maxAttempts: true,
    },
  });

  // optional: attempts remaining (only if actor exists)
  let counts = new Map<string, number>();
  if (actor.userId || actor.guestId) {
    const rows = await prisma.practiceSession.groupBy({
      by: ["assignmentId"],
      where: {
        assignmentId: { in: assignments.map((a) => a.id) },
        ...(actor.userId ? { userId: actor.userId } : { guestId: actor.guestId }),
      },
      _count: { _all: true },
    });
    counts = new Map(rows.map((r) => [r.assignmentId!, r._count._all]));
  }

  return NextResponse.json({
    assignments: assignments.map((a) => {
      const used = counts.get(a.id) ?? 0;
      return {
        ...a,
        attemptsUsed: used,
        attemptsRemaining:
          a.maxAttempts == null ? null : Math.max(0, a.maxAttempts - used),
      };
    }),
  });
}
