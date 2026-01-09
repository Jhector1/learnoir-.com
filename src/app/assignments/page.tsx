// src/app/assignments/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Assignment = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  questionCount: number;
  availableFrom: string | null;
  dueAt: string | null;
  timeLimitSec: number | null;
  maxAttempts: number | null;
  attemptsUsed?: number;
  attemptsRemaining?: number | null;
};

const badge = (txt: string) =>
  "rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-extrabold text-white/70";

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/assignments", { cache: "no-store" });
        const data = await r.json();
        setItems(data.assignments ?? []);
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const start = async (id: string, difficulty: string, topicForSection: string, questionCount: number) => {
    const r = await fetch(`/api/assignments/${id}/start`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) {
      alert(data?.message ?? "Unable to start.");
      return;
    }
   
    // ✅ route into your practice runner (add sessionId support there)
    router.push(`/practice?sessionId=${encodeURIComponent(data.sessionId)}&type=assignment&difficulty=${difficulty}&topic=${topicForSection}&questionCount=${questionCount}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="text-lg font-black tracking-tight">Assignments</div>
          <div className="mt-1 text-sm text-white/70">
            Published assignments your admin has made available.
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {busy ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/70">
              Loading assignments…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/70">
              No assignments available right now.
            </div>
          ) : (
            items.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white/90">{a.title}</div>
                    {a.description ? (
                      <div className="mt-1 text-sm text-white/70">{a.description}</div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={badge(a.difficulty.toUpperCase())}>{a.difficulty.toUpperCase()}</span>
                      <span className={badge(`${a.questionCount} Qs`)}>{a.questionCount} Qs</span>
                      {a.timeLimitSec ? (
                        <span className={badge(`${Math.round(a.timeLimitSec / 60)} min`)}>
                          {Math.round(a.timeLimitSec / 60)} min
                        </span>
                      ) : null}
                      {a.maxAttempts != null ? (
                        <span className={badge(`Attempts: ${a.attemptsRemaining ?? 0} left`)}>
                          Attempts: {a.attemptsRemaining ?? 0} left
                        </span>
                      ) : (
                        <span className={badge("Attempts: ∞")}>Attempts: ∞</span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.topics?.map((t) => (
                        <span key={t} className={badge(t.toUpperCase())}>{t.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => start(a.id, a.difficulty, a.topics?.[0] ?? "", a.questionCount??10)}
                      className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold hover:bg-emerald-300/15"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => router.push(`/practice/history?assignment=${encodeURIComponent(a.id)}`)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/70 hover:bg-white/10"
                    >
                      History
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
