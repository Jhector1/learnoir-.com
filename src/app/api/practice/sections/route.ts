import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const sections = await prisma.practiceSection.findMany({
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      order: true,
      topics: true,
        meta: true, // ✅ add
      module: { select: { slug: true, title: true, order: true, weekStart: true, weekEnd: true } },
    },
  });

  return NextResponse.json({ sections });
}
