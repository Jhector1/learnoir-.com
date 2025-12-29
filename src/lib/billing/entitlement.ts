// src/lib/billing/entitlement.ts
import { prisma } from "@/lib/prisma";

export type Entitlement =
  | { ok: true; reason: "active" | "trialing"; subscriptionId?: string }
  | { ok: false; reason: "none" | "expired" | "canceled" | "past_due" | "unpaid" };

export async function getEntitlementForUser(userId: string): Promise<Entitlement> {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      stripeSubscriptionId: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      trialEnd: true,
    },
  });

  if (!sub) return { ok: false, reason: "none" };

  const now = Date.now();
  const periodEnd = sub.currentPeriodEnd?.getTime() ?? 0;

  // If user is canceled but still inside paid/trial period, allow access until period end
  const stillWithinPeriod = periodEnd > now;

  if (sub.status === "active") return { ok: true, reason: "active", subscriptionId: sub.stripeSubscriptionId };
  if (sub.status === "trialing") return { ok: true, reason: "trialing", subscriptionId: sub.stripeSubscriptionId };

  if (sub.status === "canceled") return stillWithinPeriod ? { ok: true, reason: "active", subscriptionId: sub.stripeSubscriptionId } : { ok: false, reason: "canceled" };
  if (sub.status === "past_due") return stillWithinPeriod ? { ok: true, reason: "active", subscriptionId: sub.stripeSubscriptionId } : { ok: false, reason: "past_due" };
  if (sub.status === "unpaid") return { ok: false, reason: "unpaid" };

  return stillWithinPeriod ? { ok: true, reason: "active", subscriptionId: sub.stripeSubscriptionId } : { ok: false, reason: "expired" };
}
