// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";

function toDate(sec: number | null | undefined) {
  return typeof sec === "number" ? new Date(sec * 1000) : null;
}

async function upsertFromStripeSubscription(sub: Stripe.Subscription, userId?: string | null) {
  const customerId = String(sub.customer);

  // Prefer userId if provided; otherwise resolve by stripeCustomerId
  const user =
    (userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : null) ??
    (await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    }));

  if (!user) return;

  const priceId = sub.items.data[0]?.price?.id ?? null;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      status: sub.status as any,
      priceId: priceId ?? undefined,
      currentPeriodEnd: toDate(sub.ended_at) ?? undefined,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      trialEnd: toDate(sub.trial_end) ?? undefined,
    },
    update: {
      status: sub.status as any,
      priceId: priceId ?? undefined,
      currentPeriodEnd: toDate(sub.ended_at) ?? undefined,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      trialEnd: toDate(sub.trial_end) ?? undefined,
    },
  });

  // Mark trialUsedAt once we actually have a subscription with a trial
  if (sub.trial_end) {
    await prisma.user.update({
      where: { id: user.id },
      data: { trialUsedAt: new Date(sub.trial_end * 1000) },
    });
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ message: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ message: `Webhook error: ${err?.message ?? "Invalid"}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.mode !== "subscription") break;

        const userId = cs.metadata?.userId ?? null;
        const subId = cs.subscription ? String(cs.subscription) : null;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromStripeSubscription(sub, userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertFromStripeSubscription(sub, sub.metadata?.userId ?? null);
        break;
      }
    }
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
