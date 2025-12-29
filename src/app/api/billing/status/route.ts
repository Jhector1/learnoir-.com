// src/app/api/billing/status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { StripeSubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: StripeSubscriptionStatus[] = ["active", "trialing"];

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function pickCurrentSubscription(subs: any[]) {
  // prefer active/trialing; else newest
  const preferred = subs.find((s) => s.status === "active" || s.status === "trialing");
  return preferred ?? subs[0] ?? null;
}

export async function GET() {
  const session = await auth();

  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY_ID!;
  const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY_ID!;
  const trialDays = Number(process.env.TRIAL_DAYS ?? 7);

  // price labels from Stripe (safe even if not logged in)
  let monthlyPriceLabel = "$10 / mo";
  let yearlyPriceLabel = "$100 / yr";
  let yearlySavingsLabel: string | null = null;

  try {
    const [pM, pY] = await Promise.all([
      stripe.prices.retrieve(monthlyPriceId),
      stripe.prices.retrieve(yearlyPriceId),
    ]);

    const mAmt = (pM.unit_amount ?? 0) / 100;
    const yAmt = (pY.unit_amount ?? 0) / 100;
    const cur = pM.currency ?? "usd";

    monthlyPriceLabel = `${money(mAmt, cur)} / mo`;
    yearlyPriceLabel = `${money(yAmt, cur)} / yr`;

    if (mAmt > 0 && yAmt > 0) {
      const impliedYear = mAmt * 12;
      const pct = Math.round(((impliedYear - yAmt) / impliedYear) * 100);
      if (Number.isFinite(pct) && pct > 0) yearlySavingsLabel = `Save ${pct}%`;
    }
  } catch {
    // keep fallback
  }

  if (!session?.user) {
    return NextResponse.json({
      isAuthenticated: false,
      isSubscribed: false,
      currentPlan: null,
      trialEligible: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,

      monthlyPriceId,
      yearlyPriceId,
      monthlyPriceLabel,
      yearlyPriceLabel,
      yearlySavingsLabel,
      trialDays,
    });
  }

  const userId = (session.user as any).id as string;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeCustomerId: true,
      trialUsedAt: true,
      subscriptions: {
        select: {
          status: true,
          priceId: true,
          trialEnd: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
    },
  });

  const current = pickCurrentSubscription(u?.subscriptions ?? []);

  const isSubscribed = current ? ACTIVE_STATUSES.includes(current.status) : false;

  const currentPlan =
    current?.priceId === monthlyPriceId
      ? "monthly"
      : current?.priceId === yearlyPriceId
      ? "yearly"
      : null;

  // Trial eligibility: you control it with trialUsedAt (set it when a trial starts)
  const trialEligible = !u?.trialUsedAt;

  return NextResponse.json({
    isAuthenticated: true,
    isSubscribed,
    currentPlan,
    trialEligible,
    trialEndsAt: current?.trialEnd ? current.trialEnd.toISOString() : null,
    currentPeriodEnd: current?.currentPeriodEnd ? current.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: Boolean(current?.cancelAtPeriodEnd),

    monthlyPriceId,
    yearlyPriceId,
    monthlyPriceLabel,
    yearlyPriceLabel,
    yearlySavingsLabel,
    trialDays,
  });
}
