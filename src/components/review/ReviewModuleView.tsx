"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type {
  ReviewModule,
  ReviewCard,
  ReviewQuestion,
} from "@/lib/review/types";
import SketchHost from "./SketchHost";
import QuizBlock from "./QuizBlock";
import MathMarkdown from "../math/MathMarkdown";

export default function ReviewModuleView({ mod }: { mod: ReviewModule }) {
  const [topicId, setTopicId] = useState(mod.topics[0]?.id ?? "");
  const topic = useMemo(
    () => mod.topics.find((t) => t.id === topicId) ?? mod.topics[0],
    [mod, topicId]
  );

  // optional completion tracking
  const [passedQuizzes, setPassedQuizzes] = useState<Record<string, boolean>>(
    {}
  );

  const allCards = topic?.cards ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="mx-auto max-w-6xl p-4 md:p-6 grid gap-4 md:grid-cols-[280px_1fr]">
        {/* sidebar */}
        <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:sticky md:top-4 h-fit">
          <div className="text-lg font-black tracking-tight">{mod.title}</div>
          {mod.subtitle ? (
            <div className="mt-1 text-sm text-white/60">{mod.subtitle}</div>
          ) : null}

          <div className="mt-4 grid gap-2">
            {mod.topics.map((t) => {
              const done = Object.entries(passedQuizzes).some(
                ([k, v]) => v && k.startsWith(`${t.id}:`)
              );
              return (
                <button
                  key={t.id}
                  onClick={() => setTopicId(t.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2 transition",
                    topicId === t.id
                      ? "border-sky-300/30 bg-sky-300/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-extrabold">{t.label}</div>
                    {done ? (
                      <span className="text-[11px] font-black text-emerald-300/80">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  {t.summary ? (
                    <div className="mt-1 text-xs text-white/55">
                      {t.summary}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {mod.startPracticeHref && topic ? (
            <Link
              href={mod.startPracticeHref(mod.id)}
              className="mt-4 block rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 text-center"
            >
              Start practice for {topic.label}
            </Link>
          ) : null}
        </aside>

        {/* main */}
        <main className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white/60">Topic</div>
              <div className="text-xl font-black">{topic?.label}</div>
              {topic?.summary ? (
                <div className="mt-1 text-sm text-white/60">
                  {topic.summary}
                </div>
              ) : null}
            </div>
            {topic?.minutes ? (
              <div className="text-xs font-extrabold text-white/50">
                {topic.minutes} min
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {allCards.map((card) => (
              <CardRenderer
                key={card.id}
                card={card}
                onQuizPass={(quizId) =>
                  setPassedQuizzes((prev) => ({
                    ...prev,
                    [`${topic?.id}:${quizId}`]: true,
                  }))
                }
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function CardRenderer({
  card,
  onQuizPass,
}: {
  card: ReviewCard;
  onQuizPass: (quizId: string) => void;
}) {
  if (card.type === "text") {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        {card.title ? (
          <div className="text-sm font-black">{card.title}</div>
        ) : null}

        <MathMarkdown
          className="
    text-sm text-white/80
    [&_.katex]:text-white/90
    [&_.katex-display]:overflow-x-auto
    [&_.katex-display]:py-2
  "
          content={card.markdown}
        />
      </div>
    );
  }

  if (card.type === "sketch") {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        {card.title ? (
          <div className="text-sm font-black">{card.title}</div>
        ) : null}
        <div className="mt-3">
          <SketchHost
            sketchId={card.sketchId}
            props={card.props}
            height={card.height ?? 360}
          />
        </div>
      </div>
    );
  }

  // quiz
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      {card.title ? (
        <div className="text-sm font-black">{card.title}</div>
      ) : null}
      <QuizBlock
        quizId={card.id}
        questions={card.questions}
        passScore={card.passScore ?? 1.0}
        onPass={() => onQuizPass(card.id)}
      />
    </div>
  );
}
