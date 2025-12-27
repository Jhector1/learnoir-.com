"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { topicOptions } from "@/components/vectorpad/types";
import { Topic } from "@/lib/practice/types";

type PracticeTopic = Topic | "all";
type PracticeDifficulty = "easy" | "medium" | "hard";

type Section = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  topics: Exclude<PracticeTopic, "all">[]; // sections store real topics only
};

const DIFFS: { id: PracticeDifficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Warm up" },
  { id: "medium", label: "Medium", hint: "Solid practice" },
  { id: "hard", label: "Hard", hint: "Mastery" },
];

const TOPICS=topicOptions;

export default function PracticeSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("easy");
  const [topic, setTopic] = useState<PracticeTopic>("all");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/practice/sections", { cache: "no-store" });
        const data = await r.json();
        setSections(data.sections ?? []);
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  // optional: build a set of all topics that exist across sections (to disable impossible filters)
  const allSectionTopics = useMemo(() => {
    const set = new Set<Exclude<PracticeTopic, "all">>();
    for (const s of sections) for (const t of s.topics) set.add(t);
    return set;
  }, [sections]);

  const topicPills = (topics: Section["topics"]) => (
    <div className="flex flex-wrap gap-2">
      {topics.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTopic(t)}
          className={[
            "rounded-full border px-2 py-1 text-[11px] font-extrabold transition",
            topic === t
              ? "border-emerald-300/30 bg-emerald-300/10 text-white"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
          ].join(" ")}
          title="Click to set topic filter"
        >
          {t.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-black tracking-tight">Practice</div>
                <div className="mt-1 text-sm text-white/70">
                  Pick a section, difficulty, and topic.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DIFFS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                      difficulty === d.id
                        ? "border-emerald-300/30 bg-emerald-300/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {d.label} <span className="ml-1 text-white/50">• {d.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* topic picker */}
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => {
                const disabled =
                  t.id !== "all" && sections.length > 0 && !allSectionTopics.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTopic(t.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                      topic === t.id
                        ? "border-sky-300/30 bg-sky-300/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                      disabled ? "opacity-40 cursor-not-allowed hover:bg-white/5" : "",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* list */}
        <div className="mt-4 grid gap-3">
          {busy ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/70">
              Loading sections…
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/70">
              No sections found. (Run seed, or verify DB connection.)
            </div>
          ) : (
            sections.map((s) => {
              // Ensure we never pass an invalid topic for that section
              const topicForSection: PracticeTopic =
                topic === "all" || s.topics.includes(topic as any) ? topic : "all";

              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white/90">{s.title}</div>
                      {s.description ? (
                        <div className="mt-1 text-sm text-white/70">{s.description}</div>
                      ) : null}
                      <div className="mt-3">{topicPills(s.topics)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
                        href={`/practice?section=${encodeURIComponent(
                          s.slug
                        )}&difficulty=${difficulty}&topic=${topicForSection}`}
                      >
                        Start
                      </Link>

                      <Link
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/70 hover:bg-white/10"
                        href={`/practice/history?section=${encodeURIComponent(s.slug)}`}
                      >
                        View history
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 text-xs text-white/50">
          Tip: “Start” passes <code>section</code>, <code>difficulty</code>, and <code>topic</code>.
        </div>
      </div>
    </div>
  );
}
