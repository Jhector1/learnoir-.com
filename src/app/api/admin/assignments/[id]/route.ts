import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AssignmentPatchSchema } from "@/lib/validators/assignment";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      section: { select: { id: true, title: true, slug: true, topics: true } },
      _count: { select: { sessions: true } },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ assignment });
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

  const updated = await prisma.assignment.update({
    where: { id },
    data: {
      ...parsed.data,
      // normalize nullable strings
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description ?? null,
    },
    include: {
      section: { select: { id: true, title: true, slug: true } },
      _count: { select: { sessions: true } },
    },
  });

  return NextResponse.json({ assignment: updated });
}

export async function DELETE(req: Request, ctx: Ctx) {
  await requireAdmin(req);
  const { id } = await ctx.params;

  // Optional: block delete if already has sessions
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
