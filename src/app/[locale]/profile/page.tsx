import { redirect } from "next/navigation";
// import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import ProfileForm from "@/components/profile/ProfileForm";

import db from "@/lib/db";
export const runtime = "nodejs";


export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;

  if (!userId) redirect("/api/auth/signin?callbackUrl=/profile");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) redirect("/api/auth/signin?callbackUrl=/profile");

  return (
    <main className="mx-auto max-w-3xl px-4 md:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white/90">Account</h1>
        <p className="mt-1 text-sm text-white/55">Your profile and billing shortcuts.</p>
      </div>

      <ProfileForm initialUser={user} />
    </main>
  );
}
