// src/app/api/practice/session/[id]/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  const session = await prisma.practiceSession.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      difficulty: true,
      targetCount: true,
      total: true,
      correct: true,
      startedAt: true,
      completedAt: true,
      section: { select: { slug: true, title: true } },
    },
  });

  if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });

  const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;

  return NextResponse.json({ session, scorePct: pct });
}
