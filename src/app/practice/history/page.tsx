"use client";

import React, { useEffect, useMemo, useState } from "react";
import SectionSummaryModal, { MissedItem } from "@/components/practice/SectionSummaryModal";

type SessionListItem = {
  id: string;
  status: "active" | "completed";
  difficulty: "easy" | "medium" | "hard";
  targetCount: number;
  total: number;
  correct: number;
  missedCount: number;
  startedAt: string;
  completedAt: string | null;
  section: { slug: string; title: string };
};

type DetailResponse = {
  session: {
    id: string;
    status: "active" | "completed";
    difficulty: "easy" | "medium" | "hard";
    targetCount: number;
    total: number;
    correct: number;
    startedAt: string;
    completedAt: string | null;
    section: { slug: string; title: string; description?: string | null };
  };
  missed: Array<
    MissedItem & {
      instanceId: string;
      attemptedAt?: string;
      revealUsed?: boolean;
      kind?: string;
      topic?: string;
      difficulty?: string;
    }
  >;
};

function pct(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function PracticeHistoryPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState<DetailResponse | null>(null);
  const [open, setOpen] = useState(false);

  const [status, setStatus] = useState<"all" | "completed" | "active">("all");
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");

  async function load() {
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      qs.set("take", "40");
      if (status !== "all") qs.set("status", status);
      if (difficulty !== "all") qs.set("difficulty", difficulty);

      const r = await fetch(`/api/practice/history?${qs.toString()}`, { cache: "no-store" });
      const data = await r.json();
      setSessions(data.sessions ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function openSession(id: string) {
    const r = await fetch(`/api/practice/history/${id}`, { cache: "no-store" });
    const data = (await r.json()) as DetailResponse;
    setSelected(data);
    setOpen(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, difficulty]);

  const overall = useMemo(() => {
    const total = sessions.reduce((acc, s) => acc + (s.total ?? 0), 0);
    const correct = sessions.reduce((acc, s) => acc + (s.correct ?? 0), 0);
    return { total, correct, pct: pct(correct, total) };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-black tracking-tight">Practice History</div>
              <div className="mt-1 text-xs text-white/65">
                Review past section runs, missed questions, and your progress over time.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="text-[11px] font-extrabold text-white/60">Overall</div>
                <div className="text-sm font-black">
                  {overall.correct}/{overall.total}{" "}
                  <span className="text-white/50">({overall.pct}%)</span>
                </div>
              </div>

              <select
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-extrabold outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="all">All status</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
              </select>

              <select
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-extrabold outline-none"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
              >
                <option value="all">All difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <button
                onClick={load}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                disabled={busy}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/70">
            No sessions yet. Finish a section and it’ll show up here.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sessions.map((s) => {
              const p = pct(s.correct, s.total);
              const good = p >= 70;
              return (
                <button
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  className="text-left rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black">{s.section.title}</div>
                      <div className="mt-1 text-xs text-white/60">
                        {fmtDate(s.completedAt ?? s.startedAt)} • {s.difficulty.toUpperCase()} •{" "}
                        {s.status.toUpperCase()}
                      </div>
                    </div>

                    <div
                      className={[
                        "rounded-xl border px-3 py-2 text-right",
                        good ? "border-emerald-300/30 bg-emerald-300/10" : "border-white/10 bg-white/10",
                      ].join(" ")}
                    >
                      <div className="text-[11px] font-extrabold text-white/60">Score</div>
                      <div className="text-sm font-black">
                        {s.correct}/{s.total} <span className="text-white/50">({p}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-white/60 font-extrabold">Target</div>
                      <div className="font-black">{s.targetCount}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-white/60 font-extrabold">Correct</div>
                      <div className="font-black">{s.correct}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-white/60 font-extrabold">Missed</div>
                      <div className="font-black">{Math.max(s.total - s.correct, 0)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: reuse your SectionSummaryModal */}
      <SectionSummaryModal
        open={open}
        onClose={() => setOpen(false)}
        title={selected ? `${selected.session.section.title} • Summary` : "Session Summary"}
        subtitle={
          selected
            ? `${selected.session.difficulty.toUpperCase()} • ${fmtDate(selected.session.completedAt ?? selected.session.startedAt)}`
            : undefined
        }
        correct={selected?.session.correct ?? 0}
        total={selected?.session.total ?? 0}
        missed={selected?.missed ?? []}
      />
    </div>
  );
}
