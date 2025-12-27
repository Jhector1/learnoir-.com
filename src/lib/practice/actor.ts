// src/lib/practice/actor.ts
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export type Actor = { userId?: string; guestId?: string };

export async function getActor(): Promise<Actor> {
  // Optional: allow header override during dev/tests
  const h = await headers();
  const devUserId = h.get("x-user-id") || undefined;
  const devGuestId = h.get("x-guest-id") || undefined;

  const c = await cookies();
  const cookieGuestId = c.get("guestId")?.value;

  // If you later add NextAuth:
  // - fill userId when logged-in
  // - otherwise guestId

  if (devUserId) return { userId: devUserId };
  return { guestId: devGuestId ?? cookieGuestId ?? "anon" };
}
export function ensureGuestId(actor: Actor) {
  if (actor.userId || actor.guestId) return { actor, setGuestId: undefined as string | undefined };

  const gid = crypto.randomUUID();
  return { actor: { ...actor, guestId: gid }, setGuestId: gid };
}

export function attachGuestCookie(res: NextResponse, guestId?: string) {
  if (!guestId) return res;
  res.cookies.set("guestId", guestId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}