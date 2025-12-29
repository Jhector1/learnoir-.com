// src/app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json(
      { message: "Not signed in.", redirectTo: "/authenticate?callbackUrl=/billing" },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { priceId?: string; useTrial?: boolean }
    | null;

  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY_ID!;
  const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY_ID!;
  const trialDays = Number(process.env.TRIAL_DAYS ?? 7);

  const priceId =
    body?.priceId === yearlyPriceId ? yearlyPriceId : monthlyPriceId;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true, trialUsedAt: true },
  });

  // Create / reuse Stripe customer
  let customerId = u?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: u?.email ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  // Only allow trial if eligible
  const useTrial = Boolean(body?.useTrial) && !u?.trialUsedAt;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: useTrial ? { trial_period_days: trialDays } : undefined,
    allow_promotion_codes: true,
    success_url: `${process.env.AUTH_URL}/billing?success=1`,
    cancel_url: `${process.env.AUTH_URL}/billing?canceled=1`,
    metadata: { userId, priceId, useTrial: String(useTrial) },
  });

  return NextResponse.json({ url: checkout.url });
}
