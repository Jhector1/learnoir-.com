// src/app/api/practice/session/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revealExpected } from "@/lib/practice/validate";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await prisma.practiceSession.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });

  // For MVP, allow review anytime; if you want: require status === completed.
  const instances = await prisma.practiceQuestionInstance.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      prompt: true,
      kind: true,
      publicPayload: true,
      secretPayload: true,
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { ok: true, answerPayload: true, createdAt: true, revealUsed: true },
      },
    },
  });

  const missed = instances
    .map((q) => {
      const last = q.attempts[0];
      const ok = last?.ok === true && last?.revealUsed === false;
      if (ok) return null;

      return {
        instanceId: q.id,
        title: q.title,
        prompt: q.prompt,
        kind: q.kind,
        yourAnswer: last?.answerPayload ?? null,
        correctAnswer: revealExpected(q.kind, q.secretPayload),
        explanation: (q.secretPayload as any)?.explanation ?? null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ missed });
}
