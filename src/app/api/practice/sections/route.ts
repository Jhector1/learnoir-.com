// src/app/api/practice/sections/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const sections = await prisma.practiceSection.findMany({
    orderBy: { order: "asc" },
    select: { id: true, slug: true, title: true, description: true, topics: true },
  });
  return NextResponse.json({ sections });
}
