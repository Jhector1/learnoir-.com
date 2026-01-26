"use client";

import React, { useMemo, useState } from "react";
import type {
  Exercise,
  Vec3,
  TopicSlug,
  Difficulty,
  ValidateResponse,
} from "@/lib/practice/types";
import type { VectorPadState } from "@/components/vectorpad/types";

import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";

import ConfirmResetModal from "./ConfirmResetModal";
import PracticeSummary from "./PracticeSummary";
import ExerciseRenderer from "./ExerciseRenderer";
import ExpectedSummary from "./ExpectedSummary";
import { PracticeSummaryCard } from "./PracticeSummary";

type TopicValue = TopicSlug | "all";

type QItem = {
  key: string;
  exercise: Exercise;
  single: string;
  multi: string[];
  num: string;
  dragA: Vec3;
  dragB: Vec3;
  matRows: number;
  matCols: number;
  mat: string[][];
  result: ValidateResponse | null;
  submitted: boolean;
  revealed?: boolean;
  attempts?: number;
};

type MissedItem = {
  id: string;
  at: number;
  topic: TopicSlug;
  kind: Exercise["kind"];
  title: string;
  prompt: string;
  userAnswer: any;
  expected: any;
  explanation?: string | null;
};

export default function PracticeShell(props: {
  t: any;

  isAssignmentRun: boolean;
  allowReveal: boolean;
  showDebug: boolean;
  maxAttempts: number;

  sessionSize: number;
  setSessionSize: (n: number) => void;

  topic: TopicValue;
  setTopic: (v: TopicValue) => void;

  difficulty: Difficulty | "all";
  setDifficulty: (v: Difficulty | "all") => void;

  section: string | null;
  setSection: (s: string | null) => void;

  topicOptionsFixed: { id: TopicValue; label: string }[];
  difficultyOptions: { id: Difficulty | "all"; label: string }[];

  badge: string;

  busy: boolean;
  loadErr: string | null;
  actionErr: string | null;

  phase: "practice" | "summary";
  setPhase: (p: "practice" | "summary") => void;

  showMissed: boolean;
  setShowMissed: (v: boolean) => void;

  pct: number;
  answeredCount: number;
  correctCount: number;

  stack: QItem[];
  idx: number;
  setIdx: (n: number) => void;

  current: QItem | null;
  exercise: Exercise | null;

  missed: MissedItem[];

  confirmOpen: boolean;
  applyPendingChange: () => void;
  cancelPendingChange: () => void;

  canGoPrev: boolean;
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => Promise<void> | void;
  submit: () => Promise<void> | void;
  reveal: () => Promise<void> | void;
  retryLoad: () => void;

  padRef: React.MutableRefObject<VectorPadState>;
  zHeldRef: React.MutableRefObject<boolean>;

  updateCurrent: (patch: Partial<QItem>) => void;
}) {
  const {
    t,
    isAssignmentRun,
    allowReveal,
    showDebug,
    maxAttempts,
    busy,
    loadErr,
    actionErr,
    phase,
    setPhase,
    showMissed,
    setShowMissed,
    pct,
    answeredCount,
    correctCount,
    sessionSize,
    topic,
    difficulty,
    topicOptionsFixed,
    difficultyOptions,
    badge,
    current,
    exercise,
    confirmOpen,
    applyPendingChange,
    cancelPendingChange,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    submit,
    reveal,
    retryLoad,
    padRef,
    zHeldRef,
    updateCurrent,
    missed,
  } = props;

  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiByKey, setAiByKey] = useState<Record<string, string>>({});
  const canExplain = Boolean(
    current?.key && current?.result && current.result.ok === false,
  );
  const aiText = current?.key ? normalizeAiMath(aiByKey[current.key]) : null;
  async function explainConcept() {
    const key = current?.key;
    if (!key || !exercise) return;

    if (aiByKey[key]) return;

    setAiBusy(true);
    setAiErr(null);

    try {
      const r = await fetch("/api/practice/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          key,
          mode: "concept",
          // send minimal info (better than sending whole `current`)
          userAnswer:
            current?.result?.ok === false
              ? {
                  kind: exercise.kind,
                  answer: pickAnswerForAI(current, exercise),
                }
              : undefined,
        }),
      });

      const text = await r.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Non-JSON response (status ${r.status}): ${text.slice(0, 180)}`,
        );
      }

      if (!r.ok)
        throw new Error(data?.message ?? `Explain failed (${r.status})`);

      const explanation = String(data?.explanation ?? "").trim();
      if (!explanation) throw new Error("Empty explanation.");

      setAiByKey((prev) => ({ ...prev, [key]: explanation }));
    } catch (e: any) {
      setAiErr(e?.message ?? "Failed to explain.");
    } finally {
      setAiBusy(false);
    }
  }

  const resultBox =
    current?.result?.ok === true
      ? "border-emerald-300/30 bg-emerald-300/10"
      : current?.result
        ? "border-rose-300/30 bg-rose-300/10"
        : "border-white/10 bg-white/5";

  // summary view
  if (phase === "summary") {
    return (
      <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
        <div className="mx-auto max-w-5xl grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
            <div className="border-b border-white/10 bg-black/20 p-5">
              <div className="text-lg font-black tracking-tight">
                {t("summary.title")} 🎉
              </div>
              <div className="mt-1 text-sm text-white/80">
                {t("summary.subtitle", {
                  answered: answeredCount,
                  sessionSize,
                })}
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                <div className="text-xs text-white/70 font-extrabold">
                  {t("summaryCards.score")}
                </div>
                <div className="mt-1 text-base font-black text-white/90">
                  {t("summary.scoreLine", {
                    correct: correctCount,
                    missed: answeredCount - correctCount,
                    pct,
                  })}
                </div>
              </div>
              <div className="mt-3 text-xs text-white/60">
                {t("summaryCards.niceWork")}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
            <div className="border-b border-white/10 bg-black/20 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black tracking-tight">
                  {t("summary.reviewTitle")}
                </div>
                <div className="mt-1 text-xs text-white/70">
                  {t("summary.reviewSubtitle")}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
onClick={() => setShowMissed(!showMissed)}
                >
                  {showMissed
                    ? t("summary.toggleMissedHide")
                    : t("summary.toggleMissedShow")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
                  onClick={() => setPhase("practice")}
                >
                  {t("summary.backToQuestions")}
                </button>
              </div>
            </div>

            {showMissed ? (
              <div className="max-h-[65vh] overflow-y-auto">
                <PracticeSummaryCard missed={missed} tCards={t} />
              </div>
            ) : (
              <div className="p-4 text-xs text-white/70">
                {t("summary.missedHidden")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // practice view
  const attempts = current?.attempts ?? 0;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
     {confirmOpen ? (
  <ConfirmResetModal
    open={confirmOpen}
    title={t("reset.title")}
    description={t("reset.description", {
      answered: answeredCount,
      sessionSize,
    })}
    confirmText={t("reset.confirm")}
    cancelText={t("reset.cancel")}
    danger={true}
    onConfirm={applyPendingChange}
    onClose={cancelPendingChange}
  />
) : null}


      <div className="mx-auto max-w-5xl grid gap-4 lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)]">
        {/* LEFT */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="border-b border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                {isAssignmentRun ? (
                  <div className="mt-2 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-extrabold text-amber-200/90">
                    {t("filters.assignmentLocked")}
                  </div>
                ) : null}

                <div className="text-sm font-black tracking-tight">
                  {t("title")}
                </div>
                <div className="mt-1 text-xs text-white/70">
                  {t("subtitle")}
                </div>

                <div className="mt-2 text-xs text-white/60">
                  {t("progress.label")}:{" "}
                  <span className="font-extrabold text-white/80">
                    {answeredCount}/{sessionSize}
                  </span>{" "}
                  • {t("progress.correct")}:{" "}
                  <span className="font-extrabold text-white/80">
                    {correctCount}
                  </span>
                </div>

                {isAssignmentRun && current ? (
                  <div className="mt-1 text-xs text-white/60">
                    Attempts:{" "}
                    <span className="font-extrabold">
                      {attempts}/{maxAttempts}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-extrabold text-white/70">
                {badge || t("status.dash")}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <label className="text-xs font-extrabold text-white/70">
                {t("filters.topic")}
              </label>
              <select
                disabled={isAssignmentRun}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold text-white/90 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                value={String(topic)}
                onChange={(e) => props.setTopic(e.target.value as any)}
              >
                {topicOptionsFixed.map((tt) => (
                  <option key={String(tt.id)} value={String(tt.id)}>
                    {tt.label}
                  </option>
                ))}
              </select>

              <label className="text-xs font-extrabold text-white/70">
                {t("filters.difficulty")}
              </label>
              <select
                disabled={isAssignmentRun}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold text-white/90 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                value={String(difficulty)}
                onChange={(e) => props.setDifficulty(e.target.value as any)}
              >
                {difficultyOptions.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {d.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={goPrev}
                  disabled={busy || !canGoPrev}
                >
                  {t("buttons.prev")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={() => goNext()}
                  disabled={busy || !canGoNext}
                >
                  {t("buttons.next")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={() => submit()}
                  disabled={
                    busy ||
                    !exercise ||
                    !!current?.submitted ||
                    (isAssignmentRun && attempts >= maxAttempts)
                  }
                >
                  {t("buttons.submit")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={() => reveal()}
                  disabled={busy || !exercise || !allowReveal}
                >
                  {t("buttons.reveal")}
                </button>
              </div>

              {isAssignmentRun && !allowReveal ? (
                <div className="text-[11px] text-white/45">
                  Reveal is disabled for this assignment run.
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-extrabold text-white/60">
              {t("result.title")}
            </div>
            <div
              className={`mt-2 rounded-2xl border p-3 text-xs leading-relaxed ${resultBox}`}
            >
              {actionErr ? (
                <div className="text-white/80">
                  <div className="font-extrabold">{t("result.errorTitle")}</div>
                  <div className="mt-1 text-white/70">{actionErr}</div>
                </div>
              ) : !current?.result ? (
                <div className="text-white/70">
                  {t("result.submitToValidate")}
                </div>
              ) : (
                <>
                  <div className="font-extrabold">
                    {current.revealed
                      ? t("result.revealed")
                      : current.result.ok
                        ? t("result.correct")
                        : current.submitted
                          ? t("result.incorrect")
                          : "Incorrect — try again"}
                  </div>

                  {isAssignmentRun &&
                  !current.result.ok &&
                  !current.submitted ? (
                    <div className="mt-2 text-white/70">
                      Attempts left:{" "}
                      <span className="font-extrabold text-white/85">
                        {Math.max(0, maxAttempts - attempts)}
                      </span>
                    </div>
                  ) : null}

                  {current.result.explanation ? (
                    <div className="mt-2 text-white/80">
                      {current.result.explanation}
                    </div>
                  ) : null}

                  <ExpectedSummary
                    result={current.result as any}
                    showDebug={showDebug}
                  />
                </>
              )}
              {/* AI concept helper (no answers) */}
              {/* AI concept helper (no answers) */}
              {canExplain ? (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={explainConcept}
                      disabled={busy || aiBusy}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-extrabold hover:bg-white/15 disabled:opacity-50"
                    >
                      {aiBusy ? "Explaining…" : "Explain concept"}
                    </button>
                    <div className="text-[11px] text-white/50">
                      Explains the idea + approach — no final answer.
                    </div>
                  </div>

                  {aiErr ? (
                    <div className="mt-2 text-[11px] text-rose-200/80">
                      {aiErr}
                    </div>
                  ) : null}

                  {aiText ? (
                    <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <MathMarkdown
                        content={aiText}
                        className="prose prose-invert max-w-none prose-p:my-2 prose-strong:text-white prose-code:text-white"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="border-b border-white/10 bg-black/20 p-4">
            <div className="text-sm font-black">
              {exercise?.title ??
                (busy ? t("status.loadingDots") : t("status.dash"))}
            </div>
            <div className="mt-1 text-sm text-white/80 break-words">
              <MathMarkdown
                content={exercise?.prompt ?? ""}
                className="prose prose-invert max-w-none prose-p:my-2 prose-strong:text-white prose-code:text-white"
              />
            </div>
          </div>

          <div className="p-4">
            {loadErr ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-white/85">
                <div className="font-black">{t("loadError.title")}</div>
                <div className="mt-1 text-xs text-white/70">{loadErr}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
                    onClick={retryLoad}
                    disabled={busy}
                  >
                    {t("buttons.retry")}
                  </button>
                </div>
              </div>
            ) : !current || !exercise ? (
              <div className="text-white/70">{t("status.loading")}</div>
            ) : (
              <>
                {/* Render exercise kinds (correct payload shapes) */}
              <ExerciseRenderer
  exercise={exercise}
  current={current}
  busy={busy}
  isAssignmentRun={isAssignmentRun}
  maxAttempts={maxAttempts}
  padRef={padRef}
  updateCurrent={updateCurrent}
/>


                {/* VectorPad lives here (only when needed) */}
                {exercise.kind === "vector_drag_target" ? (
                  <div className="mt-3">
                    <VectorPad
                      key={current.key}
                      mode="2d"
                      stateRef={padRef}
                      zHeldRef={zHeldRef}
                      handles={{ a: true, b: !(exercise as any).lockB }}
                      onPreview={(aNow, bNow) =>
                        updateCurrent({
                          dragA: aNow as any,
                          dragB: bNow as any,
                        })
                      }
                      onCommit={(aNow, bNow) =>
                        updateCurrent({
                          dragA: aNow as any,
                          dragB: bNow as any,
                        })
                      }
                      previewThrottleMs={80}
                      className="relative h-[520px] w-full"
                    />
                  </div>
                ) : null}

                {exercise.kind === "vector_drag_dot" ? (
                  <div className="mt-3">
                    <VectorPad
                      key={current.key}
                      mode="2d"
                      stateRef={padRef}
                      zHeldRef={zHeldRef}
                      handles={{ a: true, b: false }}
                      onPreview={(aNow) =>
                        updateCurrent({ dragA: aNow as any })
                      }
                      onCommit={(aNow) => updateCurrent({ dragA: aNow as any })}
                      previewThrottleMs={80}
                      className="relative h-[520px] w-full"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/10 p-3 text-xs text-white/55">
            {t("questionPanel.footerTip")}
          </div>
        </div>
      </div>
    </div>
  );
}


function parseNumOrNull(v: unknown): number | null {
  const s = typeof v === "string" ? v.trim() : v;
  if (s === "" || s === null || s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Return ONLY the user's current input (no expected/correct answers).
function pickAnswerForAI(current: QItem, exercise: Exercise) {
  switch (exercise.kind) {
    case "single_choice":
      return { kind: "single_choice", optionId: current.single ?? null };

    case "multi_choice":
      return { kind: "multi_choice", optionIds: current.multi ?? [] };

    case "numeric":
      return { kind: "numeric", value: parseNumOrNull(current.num) };

    case "vector_drag_target":
      return {
        kind: "vector_drag_target",
        a: current.dragA ?? null,
        // include b only if you want; usually helpful for context
        b: current.dragB ?? null,
      };

    case "vector_drag_dot":
      return { kind: "vector_drag_dot", a: current.dragA ?? null };

    case "matrix_input": {
      const raw = current.mat ?? [];
      const values = raw.map((row) => row.map((cell) => parseNumOrNull(cell)));
      return { kind: "matrix_input", values, raw };
    }

    default:
      return null;
  }
}
function normalizeAiMath(md?: string | null) {
  const s = (md ?? "").toString();
  return s
    // convert \[...\] to $$...$$
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    // convert \( ... \) to $...$
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}
