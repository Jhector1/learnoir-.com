import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AssignmentCreateSchema } from "@/lib/validators/assignment";
import { assignmentListQuery, type AssignmentListItem } from "@/types/assignment";

export async function GET(req: Request) {
  await requireAdmin(req);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where =
    status && ["draft", "published", "archived"].includes(status)
      ? { status: status as any }
      : undefined;

  const assignments = await assignmentListQuery(where);

  return NextResponse.json({ assignments });
}

export async function POST(req: Request) {
  await requireAdmin(req);

  const body = await req.json().catch(() => null);
  const parsed = AssignmentCreateSchema.safeParse(body);
  console.log(`Admin fetched ${JSON.stringify(body)} assignments with status }`);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.assignment.create({
    data: {
      ...parsed.data,
      description: parsed.data.description ?? null,
      status: "draft",
    },
    include: {
      section: { select: { id: true, title: true, slug: true } },
    },
  });

  return NextResponse.json({ assignment: created }, { status: 201 });
}
