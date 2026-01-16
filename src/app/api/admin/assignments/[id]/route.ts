import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AssignmentPatchSchema } from "@/lib/validators/assignment";

type Ctx = { params: Promise<{ id: string }> };

function serializeAssignment(a: any) {
  return {
    ...a,
    // flatten for UI convenience
    topicIds: (a.topics ?? []).map((t: any) => t.topicId),
    topics: (a.topics ?? []).map((t: any) => ({
      topicId: t.topicId,
      order: t.order,
      topic: t.topic,
    })),
  };
}

export async function GET(req: Request, ctx: Ctx) {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          id: true,
          title: true,
          slug: true,
          topics: {
            orderBy: { order: "asc" },
            include: {
              topic: { select: { id: true, slug: true, titleKey: true, order: true } },
            },
          },
        },
      },
      topics: {
        orderBy: { order: "asc" },
        include: {
          topic: { select: { id: true, slug: true, titleKey: true, order: true } },
        },
      },
      _count: { select: { sessions: true } },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ assignment: serializeAssignment(assignment) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = AssignmentPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // ✅ accept either topicIds: string[] or topics: { topicId, order }[]
  const topicIdsFromPayload: string[] | undefined =
    Array.isArray((parsed.data as any).topicIds) ? (parsed.data as any).topicIds : undefined;

  const topicsFromPayload:
    | { topicId: string; order?: number }[]
    | undefined = Array.isArray((parsed.data as any).topics) ? (parsed.data as any).topics : undefined;

  const normalizedTopicRows =
    topicsFromPayload?.map((t, i) => ({
      topicId: t.topicId,
      order: t.order ?? i,
    })) ??
    topicIdsFromPayload?.map((topicId, i) => ({ topicId, order: i }));

  const updated = await prisma.assignment.update({
    where: { id },
    data: {
      // IMPORTANT: don’t blindly spread if your zod includes topicIds/topics
      // Prefer picking fields in your schema; but if you keep spread, delete these first.
      ...(parsed.data as any),

      // normalize nullable strings
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description ?? null,

      // ✅ rewrite join table if provided
      topics: normalizedTopicRows
        ? {
            deleteMany: {}, // wipe existing assignment-topic links
            createMany: { data: normalizedTopicRows },
          }
        : undefined,
    },
    include: {
      section: {
        select: {
          id: true,
          title: true,
          slug: true,
          topics: {
            orderBy: { order: "asc" },
            include: { topic: { select: { id: true, slug: true, titleKey: true, order: true } } },
          },
        },
      },
      topics: {
        orderBy: { order: "asc" },
        include: { topic: { select: { id: true, slug: true, titleKey: true, order: true } } },
      },
      _count: { select: { sessions: true } },
    },
  });

  return NextResponse.json({ assignment: serializeAssignment(updated) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const count = await prisma.practiceSession.count({ where: { assignmentId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "Cannot delete: assignment has sessions." },
      { status: 409 }
    );
  }

  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
