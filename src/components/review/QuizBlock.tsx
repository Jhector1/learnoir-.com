"use client";

import React, { useMemo, useState } from "react";
import type { ReviewQuestion } from "@/lib/review/types";
import MathMarkdown from "../math/MathMarkdown";

export default function QuizBlock({
  quizId,
  questions,
  passScore,
  onPass,
}: {
  quizId: string;
  questions: ReviewQuestion[];
  passScore: number;
  onPass: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;

    for (const q of questions) {
      if (q.kind === "mcq") {
        if (answers[q.id] === q.answerId) correct++;
      } else if (q.kind === "numeric") {
        const v = Number(answers[q.id]);
        const tol = q.tolerance ?? 0;
        if (Number.isFinite(v) && Math.abs(v - q.answer) <= tol) correct++;
      }
    }

    const score = questions.length ? correct / questions.length : 1;
    return { correct, score, passed: score >= passScore };
  }, [submitted, answers, questions, passScore]);

  return (
    <div className="mt-3 grid gap-3">
      {questions.map((q) => (
        <div
          key={q.id}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
        >
          {/* PROMPT (renders math) */}
          <MathMarkdown
            className="
              text-sm text-white/80
              [&_.katex]:text-white/90
              [&_.katex-display]:overflow-x-auto
              [&_.katex-display]:py-2
            "
            content={q.prompt}
          />

          {q.kind === "mcq" ? (
            <div className="mt-2 grid gap-2">
              {q.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                  className={[
                    "text-left rounded-lg border px-3 py-2 text-xs font-extrabold transition",
                    answers[q.id] === c.id
                      ? "border-sky-300/30 bg-sky-300/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {/* CHOICE LABEL (FIX: render with MathMarkdown inline) */}
                  <MathMarkdown
                    inline
                    className="
                      text-xs font-extrabold text-white/90
                      [&_.katex]:text-white/90
                      [&_.katex-display]:overflow-x-auto
                      [&_.katex-display]:py-1
                    "
                    content={c.label}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/90 outline-none"
                placeholder="Enter a number"
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
              {q.tolerance ? (
                <div className="text-xs text-white/50">± {q.tolerance}</div>
              ) : null}
            </div>
          )}

          {/* EXPLANATION (FIX: render with MathMarkdown so math works) */}
          {submitted && q.explain ? (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
              <MathMarkdown
                className="
                  text-xs text-white/70
                  [&_.katex]:text-white/90
                  [&_.katex-display]:overflow-x-auto
                  [&_.katex-display]:py-1
                "
                content={q.explain}
              />
            </div>
          ) : null}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
        >
          Check answers
        </button>

        {result ? (
          <div className="text-xs font-extrabold text-white/70">
            Score: {Math.round(result.score * 100)}%{" "}
            {result.passed ? (
              <span className="ml-2 text-emerald-300/80">✓ Passed</span>
            ) : (
              <span className="ml-2 text-rose-300/80">Try again</span>
            )}
          </div>
        ) : null}
      </div>

      {result?.passed ? (
        <button
          type="button"
          onClick={onPass}
          className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold hover:bg-emerald-300/15"
        >
          Mark complete
        </button>
      ) : null}
    </div>
  );
}
