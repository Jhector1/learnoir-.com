// src/app/billing/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BillingStatus = {
  isAuthenticated: boolean;
  isSubscribed: boolean;

  // pricing display strings (e.g. "$9/mo", "$90/yr")
  monthlyPriceLabel: string;
  yearlyPriceLabel: string;
  yearlySavingsLabel?: string | null; // e.g. "Save 20%"

  trialDays: number; // e.g. 7
  trialEligible: boolean; // can start trial?
  trialEndsAt: string | null; // ISO if currently in trial

  // optional helper
  currentPlan?: "monthly" | "yearly" | null;
};

const badge =
  "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-extrabold text-white/70";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BillingPage() {
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";

  // ---- load status ----
  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/billing/status", { cache: "no-store" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message ?? "Failed to load billing status");
        if (!dead) setStatus(data as BillingStatus);
      } catch (e: any) {
        if (!dead) setErr(e?.message ?? "Failed to load billing status");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const trialState = useMemo(() => {
    const ends = status?.trialEndsAt ? new Date(status.trialEndsAt) : null;
    const now = new Date();
    const inTrial = !!ends && ends.getTime() > now.getTime();
    const trialEnded = !!ends && ends.getTime() <= now.getTime();

    return { ends, inTrial, trialEnded };
  }, [status?.trialEndsAt]);

  function authRedirect() {
    router.push(`/authenticate?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  async function startCheckout(plan: "monthly" | "yearly") {
    if (!status?.isAuthenticated) {
      authRedirect();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, callbackUrl }),
      });
      const data = await r.json();
      if (!r.ok) {
        // if your API uses 402 to indicate paywall rules, handle it gracefully
        throw new Error(data?.message ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    if (!status?.isAuthenticated) {
      authRedirect();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message ?? "Portal failed");
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e?.message ?? "Portal failed");
    } finally {
      setBusy(false);
    }
  }

  const shell =
    "min-h-screen p-4 md:p-6 text-white bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_55%)]";
  const card =
    "rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]";
  const btnBase =
    "rounded-xl border px-4 py-2 text-sm font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary =
    "border-emerald-300/30 bg-emerald-300/10 hover:bg-emerald-300/15";
  const btnGhost = "border-white/10 bg-white/10 hover:bg-white/15";

  const canUseTrial = Boolean(status?.trialEligible) && !trialState.trialEnded;

  return (
    <div className={shell}>
      <div className="mx-auto max-w-5xl grid gap-4">
        {/* Header */}
        <div className={cn(card, "overflow-hidden")}>
          <div className="border-b border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-black tracking-tight">Billing</div>
                <div className="mt-1 text-sm text-white/70">
                  Choose a plan to unlock assignments & premium practice.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {status?.isSubscribed ? (
                    <span className={cn(badge, "border-emerald-300/20 bg-emerald-300/10 text-white/80")}>
                      ✅ Active subscription
                    </span>
                  ) : trialState.inTrial ? (
                    <span className={cn(badge, "border-emerald-300/20 bg-emerald-300/10 text-white/80")}>
                      🕒 Trial active • ends{" "}
                      {trialState.ends?.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className={badge}>Not subscribed</span>
                  )}

                  {status?.isAuthenticated ? (
                    <span className={badge}>Signed in</span>
                  ) : (
                    <span className={cn(badge, "border-rose-300/20 bg-rose-300/10 text-white/80")}>
                      Sign in required
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openPortal}
                  disabled={busy || loading || !status?.isAuthenticated}
                  className={cn(btnBase, btnGhost)}
                >
                  Manage billing
                </button>
                {!status?.isAuthenticated ? (
                  <button
                    onClick={authRedirect}
                    disabled={busy || loading}
                    className={cn(btnBase, "border-white/10 bg-white/5 hover:bg-white/10")}
                  >
                    Sign in
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {err ? (
            <div className="p-5">
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-white/85">
                <div className="font-black">⚠️ Something went wrong</div>
                <div className="mt-1 text-xs text-white/70">{err}</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Main */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Pricing cards */}
          <div className={cn(card, "lg:col-span-2 overflow-hidden")}>
            <div className="border-b border-white/10 bg-black/20 p-5">
              <div className="text-sm font-black tracking-tight">Plans</div>
              <div className="mt-1 text-xs text-white/70">
                {status?.trialDays ? `${status.trialDays}-day free trial if eligible.` : "Trial available if eligible."}
              </div>
            </div>

            {loading || !status ? (
              <div className="p-5 text-sm text-white/70">Loading plans…</div>
            ) : (
              <div className="p-5 grid gap-3 md:grid-cols-2">
                {/* Monthly */}
                <PlanCard
                  title="Monthly"
                  price={status.monthlyPriceLabel}
                  subtitle="Pay month-to-month. Cancel anytime."
                  highlight={status.currentPlan === "monthly"}
                  features={[
                    "Unlimited practice sessions",
                    "Assignments access",
                    "Progress tracking",
                  ]}
                  ctaLabel={
                    status.isSubscribed && status.currentPlan === "monthly"
                      ? "Current plan"
                      : "Subscribe monthly"
                  }
                  ctaDisabled={busy || status.isSubscribed}
                  onCta={() => startCheckout("monthly")}
                  trialLabel={
                    canUseTrial ? `Start ${status.trialDays}-day trial` : trialState.inTrial ? "Trial active" : "Trial unavailable"
                  }
                  trialDisabled={busy || !canUseTrial || status.isSubscribed}
                  onTrial={() => startCheckout("monthly")}
                  trialNote={
                    !status.trialEligible
                      ? "Trial already used on this account."
                      : trialState.trialEnded
                      ? "Trial period has ended."
                      : "No charge today. You can cancel before trial ends."
                  }
                />

                {/* Yearly */}
                <PlanCard
                  title="Yearly"
                  price={status.yearlyPriceLabel}
                  subtitle="Best value for committed learners."
                  recommended
                  highlight={status.currentPlan === "yearly"}
                  savings={status.yearlySavingsLabel ?? "Save vs monthly"}
                  features={[
                    "Everything in Monthly",
                    "Lower effective monthly cost",
                    "Fewer billing interruptions",
                  ]}
                  ctaLabel={
                    status.isSubscribed && status.currentPlan === "yearly"
                      ? "Current plan"
                      : "Subscribe yearly"
                  }
                  ctaDisabled={busy || status.isSubscribed}
                  onCta={() => startCheckout("yearly")}
                  trialLabel={
                    canUseTrial ? `Start ${status.trialDays}-day trial` : trialState.inTrial ? "Trial active" : "Trial unavailable"
                  }
                  trialDisabled={busy || !canUseTrial || status.isSubscribed}
                  onTrial={() => startCheckout("yearly")}
                  trialNote={
                    !status.trialEligible
                      ? "Trial already used on this account."
                      : trialState.trialEnded
                      ? "Trial period has ended."
                      : "No charge today. You can cancel before trial ends."
                  }
                />
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div className={cn(card, "overflow-hidden")}>
            <div className="border-b border-white/10 bg-black/20 p-5">
              <div className="text-sm font-black tracking-tight">What you get</div>
              <div className="mt-1 text-xs text-white/70">
                Premium features included with any plan.
              </div>
            </div>

            <div className="p-5 grid gap-3 text-sm">
              <InfoRow
                title="Assignments"
                desc="Start teacher/admin assignments with session tracking."
              />
              <InfoRow
                title="Unlimited practice"
                desc="Generate questions across topics and difficulty."
              />
              <InfoRow
                title="Progress history"
                desc="See sessions, accuracy, and missed items."
              />
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                Tip: If you get blocked while starting an assignment, you’ll land here to subscribe.
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/50">
          Payments are handled by Stripe. You can manage or cancel anytime from the billing portal.
        </div>
      </div>
    </div>
  );
}

function PlanCard(props: {
  title: string;
  price: string;
  subtitle: string;
  features: string[];

  recommended?: boolean;
  savings?: string;

  highlight?: boolean;

  ctaLabel: string;
  ctaDisabled?: boolean;
  onCta: () => void;

  trialLabel: string;
  trialDisabled?: boolean;
  onTrial: () => void;
  trialNote?: string;
}) {
  const btnBase =
    "rounded-xl border px-3 py-2 text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary =
    "border-emerald-300/30 bg-emerald-300/10 hover:bg-emerald-300/15";
  const btnGhost = "border-white/10 bg-white/10 hover:bg-white/15";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-black/20 p-4",
        props.recommended ? "border-emerald-300/25" : "border-white/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-black text-white/90">{props.title}</div>
          <div className="mt-1 text-xs text-white/60">{props.subtitle}</div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {props.recommended ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[11px] font-extrabold text-white/85">
              Recommended
            </span>
          ) : null}
          {props.savings ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-extrabold text-white/70">
              {props.savings}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60 font-extrabold">Price</div>
        <div className="mt-1 text-xl font-black tracking-tight">{props.price}</div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-white/70">
        {props.features.map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span className="text-emerald-200/90">•</span>
            <span>{f}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        <button
          onClick={props.onCta}
          disabled={props.ctaDisabled}
          className={cn(btnBase, btnPrimary)}
        >
          {props.ctaLabel}
        </button>

        <button
          onClick={props.onTrial}
          disabled={props.trialDisabled}
          className={cn(btnBase, btnGhost)}
        >
          {props.trialLabel}
        </button>

        {props.trialNote ? (
          <div className="text-[11px] text-white/55">{props.trialNote}</div>
        ) : null}
      </div>
    </div>
  );
}

function InfoRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-sm font-black text-white/85">{title}</div>
      <div className="mt-1 text-xs text-white/65">{desc}</div>
    </div>
  );
}
