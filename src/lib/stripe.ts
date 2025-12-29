// src/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.LEARNOIR_STRIPE_SECRET_KEY!, {
  // leaving apiVersion unset is ok; Stripe uses your account default
});
