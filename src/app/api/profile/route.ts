import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth"; // NextAuth v5 style. If you're on v4, see note below.
// import { PrismaClient } from "@prisma/client";

// export const runtime = "nodejs";
import db from "@/lib/db";
export const runtime = "nodejs";


const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60, "Name is too long"),
  image: z
    .string()
    .trim()
    .url("Image must be a valid URL")
    .optional()
    .nullable(),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      image: parsed.data.image ?? null,
    },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user: updated });
}
