// src/lib/billing/requireEntitledUser.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEntitlementForUser } from "@/lib/billing/entitlement";

export async function requireEntitledUser() {
  const s = await auth();
  const userId = s?.user?.id;

  if (!userId) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const ent = await getEntitlementForUser(userId);
  if (!ent.ok) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          message: "Subscription required.",
          paywall: true,
          reason: ent.reason,
            redirectTo: "/billing",
        },
        { status: 402 } // Payment Required
      ),
    };
  }

  return { ok: true as const, userId, entitlement: ent };
}
