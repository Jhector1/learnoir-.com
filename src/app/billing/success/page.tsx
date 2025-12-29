"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ConfirmResp =
  | {
      ok: true;
      status: string;
      priceId: string | null;
      currentPeriodEnd: string | null;
      trialEnd: string | null;
      customerId: string | null;
      subscriptionId: string | null;
    }
  | { ok: false; message: string };

const pill =
  "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-extrabold text-white/70";

export default function BillingSuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const sessionId = sp.get("session_id");

  const [busy, setBusy] = useState(true);
  const [data, setData] = useState<ConfirmResp | null>(null);

  useEffect(() => {
    (async () => {
      if (!sessionId) {
        setData({ ok: false, message: "Missing session_id in URL." });
        setBusy(false);
        return;
      }

      setBusy(true);
      try {
        const r = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const j = (await r.json().catch(() => null)) as ConfirmResp | null;

        if (!r.ok || !j) {
          setData({ ok: false, message: (j as any)?.message ?? "Confirm failed." });
        } else {
          setData(j);
        }
      } catch (e: any) {
        setData({ ok: false, message: e?.message ?? "Confirm failed." });
      } finally {
        setBusy(false);
      }
    })();
  }, [sessionId]);

  const ok = data?.ok === true;

  return (
    <div className="min-h-screen p-6 text-white bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)]">
      <div className="mx-auto max-w-2xl grid gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="border-b border-white/10 bg-black/20 p-6">
            <div className="text-lg font-black tracking-tight">
              {busy ? "Finalizing subscription…" : ok ? "✅ Subscription active" : "⚠️ Subscription not confirmed"}
            </div>
            <div className="mt-1 text-sm text-white/70">
              {busy
                ? "One moment — we’re syncing your plan."
                : ok
                ? "You’re all set. You can manage billing anytime."
                : "We couldn’t confirm the subscription yet."}
            </div>
          </div>

          <div className="p-6 grid gap-4">
            {!busy && !ok ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-white/85">
                <div className="font-black">Error</div>
                <div className="mt-1 text-xs text-white/70">{(data as any)?.message ?? "Unknown error."}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-extrabold hover:bg-white/15"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => router.push("/billing")}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10"
                  >
                    Go to Billing
                  </button>
                </div>
              </div>
            ) : null}

            {!busy && ok ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={pill}>Status: {(data as any).status}</span>
                  {(data as any).trialEnd ? <span className={pill}>Trial ends: {new Date((data as any).trialEnd).toLocaleString()}</span> : null}
                  {(data as any).currentPeriodEnd ? (
                    <span className={pill}>Renews: {new Date((data as any).currentPeriodEnd).toLocaleString()}</span>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-extrabold text-white/60">Plan</div>
                  <div className="mt-1 text-sm font-black text-white/90">
                    {((data as any).priceId ?? "").includes("year")
                      ? "Yearly"
                      : ((data as any).priceId ?? "").includes("month")
                      ? "Monthly"
                      : "Subscription"}
                  </div>
                  <div className="mt-1 text-xs text-white/60 break-all">
                    Price ID: {(data as any).priceId ?? "—"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push("/practice")}
                    className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-extrabold hover:bg-emerald-300/15"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => router.push("/billing")}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15"
                  >
                    Manage billing
                  </button>
                </div>
              </div>
            ) : null}

            {busy ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                Syncing your Stripe subscription into your database…
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
