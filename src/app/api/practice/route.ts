// src/app/api/practice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachGuestCookie, ensureGuestId, getActor } from "@/lib/practice/actor";
import { signPracticeKey } from "@/lib/practice/key";
import { generateExercise } from "@/lib/practice/bank";
import { PracticeDifficulty, PracticeTopic } from "@/generated/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const topicParam = (searchParams.get("topic") ?? "dot") as PracticeTopic | "all";
  const difficulty = (searchParams.get("difficulty") ?? "easy") as PracticeDifficulty;
  const sessionId = searchParams.get("sessionId"); // optional
  const sectionSlug = searchParams.get("section"); // optional shortcut if you want to create instance without sessionId

 const actor0 = await getActor();
const { actor, setGuestId } = ensureGuestId(actor0);


  let session = null as null | { id: string; sectionId: string; difficulty: PracticeDifficulty };
  if (sessionId) {
    const s = await prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!s) return NextResponse.json({ message: "Session not found." }, { status: 404 });
    session = { id: s.id, sectionId: s.sectionId, difficulty: s.difficulty };
  } else if (sectionSlug) {
    const section = await prisma.practiceSection.findUnique({ where: { slug: sectionSlug } });
    if (!section) return NextResponse.json({ message: "Section not found." }, { status: 404 });

    // Find active session for this actor+section+difficulty or create one
    const active = await prisma.practiceSession.findFirst({
      where: {
        status: "active",
        sectionId: section.id,
        difficulty,
        OR: [
          actor.userId ? { userId: actor.userId } : undefined,
          actor.guestId ? { guestId: actor.guestId } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { startedAt: "desc" },
    });

    const created =
      active ??
      (await prisma.practiceSession.create({
        data: {
          sectionId: section.id,
          difficulty,
          targetCount: 10,
          userId: actor.userId ?? null,
          guestId: actor.guestId ?? null,
        },
      }));

    session = { id: created.id, sectionId: created.sectionId, difficulty: created.difficulty };
  }

  // choose topic: if "all" and session exists, use section topics; otherwise pick any
  let topic: PracticeTopic = topicParam === "all" ? "dot" : topicParam;

  if (topicParam === "all" && session) {
    const section = await prisma.practiceSection.findUnique({ where: { id: session.sectionId } });
    const allowed = section?.topics?.length ? section.topics : (["dot", "projection", "angle", "vectors"] as PracticeTopic[]);
    topic = allowed[Math.floor(Math.random() * allowed.length)]!;
  } else if (topicParam === "all") {
    const pool: PracticeTopic[] = ["dot", "projection", "angle", "vectors"];
    topic = pool[Math.floor(Math.random() * pool.length)]!;
  }

  const gen = generateExercise({ topic, difficulty: session?.difficulty ?? difficulty });

  const instance = await prisma.practiceQuestionInstance.create({
    data: {
      sessionId: session?.id ?? null,
      topic: gen.topic,
      kind: gen.kind,
      difficulty: gen.difficulty,
      title: gen.title,
      prompt: gen.prompt,
      publicPayload: gen.publicPayload,
      secretPayload: gen.secretPayload,
    },
  });

  if (session?.id) {
    await prisma.practiceSession.update({
      where: { id: session.id },
      data: { lastInstanceId: instance.id },
    });
  }

  const key = signPracticeKey({
    instanceId: instance.id,
    sessionId: instance.sessionId,
    userId: actor.userId ?? null,
    guestId: actor.guestId ?? null,
    exp: Math.floor(Date.now() / 1000) + 60 * 30, // 30 min
  });

  // IMPORTANT: return an Exercise object compatible with your PracticePage
  const exercise = {
    id: instance.id,
    topic: instance.topic,
    kind: instance.kind,
    difficulty: instance.difficulty,
    title: instance.title,
    prompt: instance.prompt,
    ...instance.publicPayload,
  };

 const res = NextResponse.json({ exercise, key, sessionId: instance.sessionId });
return attachGuestCookie(res, setGuestId);

}
