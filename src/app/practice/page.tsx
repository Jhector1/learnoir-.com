// src/app/practice/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import VectorPad from "@/components/vectorpad/VectorPad";
import {
  difficultyOptions,
  topicOptions,
  type VectorPadState,
} from "@/components/vectorpad/types";

import type {
  Exercise,
  Topic,
  ValidateResponse,
  SubmitAnswer,
  Vec3,
  Difficulty,
} from "@/lib/practice/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SESSION_SIZE = 10;

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) throw new Error(`Empty response body (status ${res.status})`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Non-JSON response (status ${res.status}): ${text.slice(0, 200)}`
    );
  }
}

type Phase = "practice" | "summary";

type MissedItem = {
  id: string;
  at: number;
  topic: Topic;
  kind: Exercise["kind"];
  title: string;
  prompt: string;
  userAnswer: SubmitAnswer;
  expected: any;
  explanation?: string | null;
};

function scorePct(correct: number, attempts: number) {
  if (!attempts) return 0;
  return Math.round((correct / attempts) * 100);
}

type PendingChange =
  | { kind: "topic"; value: Topic | "all" }
  | { kind: "difficulty"; value: Difficulty | "all" }
  | null;

type QItem = {
  key: string;
  exercise: Exercise;

  // user work-in-progress
  single: string;
  multi: string[];
  num: string;
  dragA: Vec3;
  dragB: Vec3;

  // validation state
  result: ValidateResponse | null;
  submitted: boolean;
};

export default function PracticePage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // filters
  const [topic, setTopic] = useState<Topic | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [section, setSection] = useState<string | null>(null);

  // session id from API
  const [sessionId, setSessionId] = useState<string | null>(null);

  // phase + UI
  const [phase, setPhase] = useState<Phase>("practice");
  const [showMissed, setShowMissed] = useState(true);

  // loading + error
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ question stack + navigation index
  const [stack, setStack] = useState<QItem[]>([]);
  const [idx, setIdx] = useState(0);

  // hydration + guards
  const [hydrated, setHydrated] = useState(false);
  const restoredRef = useRef(false);
  const firstFiltersEffectRef = useRef(true);
  const skipUrlSyncRef = useRef(true);

  // ---- confirm modal ----
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);

  const current = stack[idx] ?? null;
  const exercise = current?.exercise ?? null;

  const answeredCount = useMemo(
    () => stack.filter((q) => q.submitted).length,
    [stack]
  );

  const correctCount = useMemo(
    () => stack.filter((q) => q.submitted && q.result?.ok).length,
    [stack]
  );

  const missed: MissedItem[] = useMemo(() => {
    const out: MissedItem[] = [];
    for (const q of stack) {
      if (!q.submitted) continue;
      if (q.result?.ok) continue;

      const ans = buildSubmitAnswerFromItem(q);
      if (!ans) continue;

      out.push({
        id: `${q.key}-missed`,
        at: Date.now(),
        topic: q.exercise.topic,
        kind: q.exercise.kind,
        title: q.exercise.title,
        prompt: q.exercise.prompt,
        userAnswer: ans,
        expected: (q.result as any)?.expected,
        explanation: (q.result as any)?.explanation ?? null,
      });
    }
    return out;
  }, [stack]);

  const hasProgress =
    phase === "practice" &&
    (answeredCount > 0 ||
      !!sessionId ||
      !!current?.result ||
      (current?.single?.trim()?.length ?? 0) > 0 ||
      (current?.multi?.length ?? 0) > 0 ||
      (current?.num?.trim()?.length ?? 0) > 0);

  function requestChange(next: PendingChange) {
    if (!next) return;

    if (!hasProgress) {
      if (next.kind === "topic") setTopic(next.value);
      if (next.kind === "difficulty") setDifficulty(next.value);
      return;
    }

    setPendingChange(next);
    setConfirmOpen(true);
  }

  function applyPendingChange() {
    if (!pendingChange) return;
    if (pendingChange.kind === "topic") setTopic(pendingChange.value);
    if (pendingChange.kind === "difficulty") setDifficulty(pendingChange.value);
    setConfirmOpen(false);
    setPendingChange(null);
  }

  function cancelPendingChange() {
    setConfirmOpen(false);
    setPendingChange(null);
  }

  useEffect(() => {
    if (!confirmOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelPendingChange();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [confirmOpen]);

  // ---- persistence (refresh keeps progress) ----
  function storageKey(
    s: string | null,
    t: Topic | "all",
    d: Difficulty | "all"
  ) {
    return `practice:v3:${s ?? "no-section"}:${t}:${d}`;
  }

  // Restore on first mount using URL filters
  useEffect(() => {
    if (hydrated) return;

    const sectionParam = sp.get("section");
    const difficultyParam = sp.get("difficulty");
    const topicParam = sp.get("topic");

    const nextSection = sectionParam ?? null;

    const nextDifficulty: Difficulty | "all" =
      difficultyParam === "easy" ||
      difficultyParam === "medium" ||
      difficultyParam === "hard" ||
      difficultyParam === "all"
        ? (difficultyParam as any)
        : "all";

    const nextTopic: Topic | "all" =
      topicParam === "all" ||
      topicParam === "dot" ||
      topicParam === "projection" ||
      topicParam === "angle" ||
      topicParam === "vectors"
        ? (topicParam as any)
        : "all";

    // try restore
    try {
      const k = storageKey(nextSection, nextTopic, nextDifficulty);
      const raw = sessionStorage.getItem(k);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.v === 3) {
          setSection(saved.section ?? nextSection);
          setTopic(saved.topic ?? nextTopic);
          setDifficulty(saved.difficulty ?? nextDifficulty);

          setSessionId(saved.sessionId ?? null);
          setPhase(saved.phase ?? "practice");
          setShowMissed(saved.showMissed ?? true);

          setStack(Array.isArray(saved.stack) ? saved.stack : []);
          setIdx(
            typeof saved.idx === "number"
              ? Math.max(0, Math.min(saved.idx, (saved.stack?.length ?? 1) - 1))
              : 0
          );

          setErr(null);
          restoredRef.current = true;
          firstFiltersEffectRef.current = true;
          skipUrlSyncRef.current = true;
          setHydrated(true);
          return;
        }
      }
    } catch {
      // ignore
    }

    // fallback: hydrate from URL
    setSection(nextSection);
    setTopic(nextTopic);
    setDifficulty(nextDifficulty);

    setSessionId(null);
    setPhase("practice");
    setShowMissed(true);
    setStack([]);
    setIdx(0);
    setErr(null);

    restoredRef.current = false;
    firstFiltersEffectRef.current = true;
    skipUrlSyncRef.current = true;
    setHydrated(true);
  }, [sp, hydrated]);

  // Save
  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      v: 3,
      savedAt: Date.now(),
      section,
      topic,
      difficulty,
      sessionId,
      phase,
      showMissed,
      stack,
      idx,
    };
    try {
      sessionStorage.setItem(
        storageKey(section, topic, difficulty),
        JSON.stringify(payload)
      );
    } catch {
      // ignore
    }
  }, [
    hydrated,
    section,
    topic,
    difficulty,
    sessionId,
    phase,
    showMissed,
    stack,
    idx,
  ]);

  // Keep URL params synced when topic/difficulty/section change
  useEffect(() => {
    if (!hydrated) return;

    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }

    const qs = new URLSearchParams(sp.toString());

    if (section) qs.set("section", section);
    else qs.delete("section");

    qs.set("topic", topic);
    qs.set("difficulty", difficulty);

    const desired = qs.toString();
    const currentSearch = sp.toString();
    if (desired === currentSearch) return;

    router.replace(`${pathname}?${desired}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, section, topic, difficulty, pathname, router]);

  // When filters change: reset + load first question
  useEffect(() => {
    if (!hydrated) return;

    if (firstFiltersEffectRef.current) {
      firstFiltersEffectRef.current = false;
      return;
    }

    setErr(null);
    setPhase("practice");
    setShowMissed(true);
    setSessionId(null);
    setStack([]);
    setIdx(0);

    void loadNextExercise({ forceNew: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, difficulty, section, hydrated]);

  // Initial load after hydration (if not restored)
  useEffect(() => {
    if (!hydrated) return;
    if (restoredRef.current && stack.length > 0) return;
    if (stack.length === 0) void loadNextExercise({ forceNew: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Auto summary
  useEffect(() => {
    if (phase === "practice" && answeredCount >= SESSION_SIZE)
      setPhase("summary");
  }, [answeredCount, phase]);

  function updateCurrent(patch: Partial<QItem>) {
    setStack((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function initItemFromExercise(ex: Exercise, k: string): QItem {
    let a: Vec3 = { x: 0, y: 0, z: 0 };
    let b: Vec3 = { x: 2, y: 1, z: 0 };

    if (ex.kind === "vector_drag_target") {
      a = ex.initialA;
      b = ex.initialB ?? { x: 2, y: 1, z: 0 };
    } else if (ex.kind === "vector_drag_dot") {
      a = ex.initialA;
      b = ex.b;
    }

    return {
      key: k,
      exercise: ex,
      single: "",
      multi: [],
      num: "",
      dragA: a,
      dragB: b,
      result: null,
      submitted: false,
    };
  }

  async function loadNextExercise(opts?: { forceNew?: boolean }) {
    if (answeredCount >= SESSION_SIZE && !opts?.forceNew) return;

    setBusy(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();

      // topic (including "all") is safe
      qs.set("topic", topic);

      // ✅ IMPORTANT: do NOT send difficulty=all (matches your older working logic)
      if (difficulty !== "all") qs.set("difficulty", difficulty);

      // session routing
      if (sessionId) qs.set("sessionId", sessionId);
      else if (section) qs.set("section", section);

      const r = await fetch(`/api/practice?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await readJsonSafe(r);

      if (!r.ok)
        throw new Error(data?.message || `Request failed (${r.status})`);

      const ex: Exercise = data.exercise;
      const k: string = data.key;

      if (data.sessionId) setSessionId(data.sessionId);

      const item = initItemFromExercise(ex, k);

      // ✅ append and jump to it, without using stale stack.length
      setStack((prev) => {
        const next = [...prev, item];
        setIdx(next.length - 1);
        return next;
      });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load question");
    } finally {
      setBusy(false);
    }
  }

  function canGoPrev() {
    return idx > 0;
  }

  function canGoNext() {
    if (idx < stack.length - 1) return true;
    return answeredCount < SESSION_SIZE;
  }

  function goPrev() {
    if (!canGoPrev()) return;
    setIdx((i) => Math.max(0, i - 1));
  }

  async function goNext() {
    if (!canGoNext()) return;

    if (idx < stack.length - 1) {
      setIdx((i) => Math.min(stack.length - 1, i + 1));
      return;
    }

    await loadNextExercise();
  }
  function cloneVec(v: any): Vec3 {
    return { x: Number(v.x), y: Number(v.y), z: Number(v.z ?? 0) };
  }

  async function submitAnswer() {
    if (!current || !exercise) return;

    // optionally prevent resubmit
    // if (current.submitted) return;

    const answer = buildSubmitAnswerFromItem(current);
    if (!answer) {
      setErr("Answer is incomplete or invalid.");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const r = await fetch("/api/practice/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key, answer }),
      });

      const data = (await readJsonSafe(r)) as ValidateResponse;

      if (!r.ok)
        throw new Error(
          (data as any)?.message || `Validate failed (${r.status})`
        );

      updateCurrent({
        result: data,
        submitted: true,
      });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  async function revealAnswer() {
    if (!current) return;

    setBusy(true);
    setErr(null);

    try {
      const r = await fetch("/api/practice/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key, reveal: true }),
      });

      const data = (await readJsonSafe(r)) as ValidateResponse;

      if (!r.ok)
        throw new Error(
          (data as any)?.message || `Reveal failed (${r.status})`
        );

      updateCurrent({ result: data });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to reveal");
    } finally {
      setBusy(false);
    }
  }

  // Keyboard shortcuts:
  // - Enter: submit (even if numeric input is focused; not if select/textarea)
  // - Left arrow: prev (disabled while typing in input/select/textarea)
  // - Right arrow: next (disabled while typing in input/select/textarea)
  useEffect(() => {
    const activeTag = () => {
      const el = document.activeElement as HTMLElement | null;
      return el?.tagName?.toLowerCase() ?? "";
    };

    const isTypingForArrows = () => {
      const tag = activeTag();
      if (tag === "textarea" || tag === "select") return true;
      if (tag === "input") return true;
      return false;
    };

    const shouldBlockEnter = () => {
      const tag = activeTag();
      // don't hijack enter on select/textarea
      return tag === "select" || tag === "textarea";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (confirmOpen) return;
      if (phase !== "practice") return;
      if (busy) return;
      if (!exercise) return;

      if (e.key === "Enter") {
        if (shouldBlockEnter()) return;
        e.preventDefault();
        void submitAnswer();
        return;
      }

      // arrows: don't hijack while typing
      if (isTypingForArrows()) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void goNext();
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, phase, busy, exercise, idx, stack.length, answeredCount]);

  const badge = useMemo(() => {
    if (!exercise) return "";
    return `${exercise.topic.toUpperCase()} • ${exercise.kind.replaceAll(
      "_",
      " "
    )}`;
  }, [exercise]);

  const resultBox =
    current?.result?.ok === true
      ? "border-emerald-300/30 bg-emerald-300/10"
      : current?.result
      ? "border-rose-300/30 bg-rose-300/10"
      : "border-white/10 bg-white/5";

  // --- VectorPad (2D only for practice) ---
  const zHeldRef = useRef(false);

  const padRef = useRef<VectorPadState>({
    mode: "2d",
    scale: 40,
    gridStep: 1,
    snapToGrid: true,
    showGrid: true,
    showComponents: true,
    showAngle: false,
    showProjection: false,
    showUnitB: false,
    showPerp: false,
    depthMode: false,
    a: { x: 0, y: 0, z: 0 } as any,
    b: { x: 2, y: 1, z: 0 } as any,
  });

  useEffect(() => {
    if (!current) return;

    padRef.current.mode = "2d";
    padRef.current.a = current.dragA as any;
    padRef.current.b = current.dragB as any;

    padRef.current.showProjection = current.exercise.topic === "projection";
    padRef.current.showAngle = current.exercise.topic === "angle";
    padRef.current.showComponents = true;
    padRef.current.showGrid = true;
  }, [current]);

  const allowBDrag =
    exercise?.kind === "vector_drag_target" ? !exercise.lockB : false;

  // ✅ SUMMARY VIEW
  if (phase === "summary") {
    const pct = scorePct(correctCount, answeredCount);

    return (
      <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
        <div className="mx-auto max-w-5xl grid gap-4">
          <CongratsCard
            title="Session complete"
            subtitle={`You finished ${answeredCount}/${SESSION_SIZE} exercises`}
            scoreLine={`${correctCount} correct • ${
              answeredCount - correctCount
            } missed • ${pct}%`}
          />

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
            <div className="border-b border-white/10 bg-black/20 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black tracking-tight">
                  Review & next steps
                </div>
                <div className="mt-1 text-xs text-white/70">
                  Refresh won’t lose progress • You can also go back to
                  questions.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
                  onClick={() => setShowMissed((v) => !v)}
                >
                  {showMissed ? "Hide missed" : "Show missed"}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
                  onClick={() => setPhase("practice")}
                >
                  Back to questions
                </button>
              </div>
            </div>

            {showMissed ? (
              <PracticeSummary missed={missed} />
            ) : (
              <div className="p-4 text-xs text-white/70">
                Missed list hidden.
              </div>
            )}
          </div>

          <div className="text-xs text-white/50">
            Tip: changing topic/difficulty updates the URL params.
          </div>
        </div>
      </div>
    );
  }

  // ✅ PRACTICE VIEW
  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      {/* Confirm modal */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            aria-label="Close"
            onClick={cancelPendingChange}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12]/95 shadow-2xl">
            <div className="border-b border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-black tracking-tight text-white/90">
                Restart session?
              </div>
              <div className="mt-1 text-xs text-white/60">
                Changing topic or difficulty will reset your current run.
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-white/80">
                You’ll lose progress:{" "}
                <span className="font-extrabold">
                  {answeredCount}/{SESSION_SIZE}
                </span>
                .
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={cancelPendingChange}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10"
                >
                  Keep current session
                </button>

                <button
                  onClick={applyPendingChange}
                  className="rounded-xl border border-rose-300/30 bg-rose-300/15 px-3 py-2 text-xs font-extrabold text-white hover:bg-rose-300/25"
                >
                  Yes, restart
                </button>
              </div>

              <div className="mt-3 text-[11px] text-white/50">
                Press <span className="font-extrabold">Esc</span> to close.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="border-b border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black tracking-tight">
                  Practice Generator
                </div>
                <div className="mt-1 text-xs text-white/70">
                  Refresh keeps progress • ←/→ navigate • Enter submits
                </div>

                <div className="mt-2 text-xs text-white/60">
                  Progress:{" "}
                  <span className="font-extrabold text-white/80">
                    {answeredCount}/{SESSION_SIZE}
                  </span>{" "}
                  • Correct:{" "}
                  <span className="font-extrabold text-white/80">
                    {correctCount}
                  </span>{" "}
                  • Q:{" "}
                  <span className="font-extrabold text-white/80">
                    {stack.length ? idx + 1 : 0}/{stack.length}
                  </span>
                </div>
              </div>

              <div className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-extrabold text-white/70">
                {badge || "—"}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <label className="text-xs font-extrabold text-white/70">
                Topic
              </label>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold text-white/90 outline-none"
                value={topic}
                onChange={(e) => {
                  const next = e.target.value as Topic | "all";
                  if (next === topic) return;
                  requestChange({ kind: "topic", value: next });
                }}
              >
                {topicOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label className="text-xs font-extrabold text-white/70">
                Difficulty
              </label>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold text-white/90 outline-none"
                value={difficulty}
                onChange={(e) => {
                  const next = e.target.value as Difficulty | "all";
                  if (next === difficulty) return;
                  requestChange({ kind: "difficulty", value: next });
                }}
              >
                {difficultyOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={goPrev}
                  disabled={busy || !canGoPrev()}
                  title="ArrowLeft"
                >
                  Prev
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={goNext}
                  disabled={busy || !canGoNext()}
                  title="ArrowRight"
                >
                  Next
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={submitAnswer}
  disabled={busy || !exercise || !!current?.submitted}
                  title="Enter"
                >
                  Submit
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={revealAnswer}
                  disabled={busy || !exercise}
                >
                  Reveal
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-extrabold text-white/60">Result</div>
            <div
              className={`mt-2 rounded-2xl border p-3 text-xs leading-relaxed ${resultBox}`}
            >
              {err ? (
                <div className="text-white/80">
                  <div className="font-extrabold">⚠️ Error</div>
                  <div className="mt-1 text-white/70">{err}</div>
                </div>
              ) : !current?.result ? (
                <div className="text-white/70">
                  Submit your answer to get validation.
                </div>
              ) : (
                <>
                  <div className="font-extrabold">
                    {current.result.ok ? "✅ Correct" : "❌ Not quite"}
                  </div>
                  {current.result.explanation ? (
                    <div className="mt-2 text-white/80">
                      {current.result.explanation}
                    </div>
                  ) : null}
                  <div className="mt-2 text-white/60">
                    <span className="font-extrabold">Expected:</span>{" "}
                    <span className="font-mono">
                      {JSON.stringify((current.result as any).expected)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="border-b border-white/10 bg-black/20 p-4">
            <div className="text-sm font-black">
              {exercise?.title ?? (busy ? "Loading..." : "—")}
            </div>
            <div className="mt-1 text-sm text-white/80">
              {exercise?.prompt ?? ""}
            </div>
          </div>

          <div className="p-4">
            {err ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-white/85">
                <div className="font-black">Couldn’t load a question</div>
                <div className="mt-1 text-xs text-white/70">{err}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
                    onClick={() => void loadNextExercise({ forceNew: true })}
                    disabled={busy}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !current || !exercise ? (
              <div className="text-white/70">Loading…</div>
            ) : exercise.kind === "single_choice" ? (
              <div className="grid gap-2">
                {exercise.options.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="single"
                      className="scale-110 accent-blue-500"
                      checked={current.single === o.id}
                      onChange={() => updateCurrent({ single: o.id })}
                    />
                    <span className="text-sm font-extrabold text-white/85">
                      {o.text}
                    </span>
                  </label>
                ))}
              </div>
            ) : exercise.kind === "multi_choice" ? (
              <div className="grid gap-2">
                {exercise.options.map((o) => {
                  const checked = current.multi.includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="scale-110 accent-blue-500"
                        checked={checked}
                        onChange={() =>
                          updateCurrent({
                            multi: checked
                              ? current.multi.filter((x) => x !== o.id)
                              : [...current.multi, o.id],
                          })
                        }
                      />
                      <span className="text-sm font-extrabold text-white/85">
                        {o.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : exercise.kind === "numeric" ? (
              <div className="grid gap-3">
                {exercise.hint ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                    <span className="font-extrabold text-white/80">Hint:</span>{" "}
                    {exercise.hint}
                  </div>
                ) : null}

                <div className="grid grid-cols-[1fr_140px] items-center gap-2">
                  <div className="text-xs font-extrabold text-white/70">
                    Your answer
                  </div>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold tabular-nums text-white/90 outline-none"
                    value={current.num}
                    onChange={(e) => updateCurrent({ num: e.target.value })}
                    placeholder="e.g. 3.5"
                  />
                </div>
              </div>
            ) : exercise.kind === "vector_drag_target" ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  Drag <b>a</b> (blue) to match target <b>a*</b> ={" "}
                  <span className="font-mono text-white/85">
                    ({exercise.targetA.x}, {exercise.targetA.y})
                  </span>{" "}
                  within tolerance <b>{exercise.tolerance}</b>.
                </div>

                <VectorPad
                  mode="2d"
                  stateRef={padRef}
                  zHeldRef={zHeldRef}
                  handles={{ a: true, b: allowBDrag }}
                  onPreview={(aNow, bNow) => {
                    // ✅ CLONE to avoid VectorPad mutating the same object reference
                    updateCurrent({
                      dragA: cloneVec(aNow),
                      dragB: cloneVec(bNow),
                    });
                  }}
                  previewThrottleMs={80}
                  onCommit={(aNow, bNow) => {
                    updateCurrent({
                      dragA: cloneVec(aNow),
                      dragB: cloneVec(bNow),
                    });
                  }}
                  className="relative h-[520px] w-full"
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60 font-extrabold">
                      a (current)
                    </div>
                    <div className="font-mono text-white/85">
                      ({current.dragA.x.toFixed(2)},{" "}
                      {current.dragA.y.toFixed(2)})
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60 font-extrabold">b</div>
                    <div className="font-mono text-white/85">
                      ({current.dragB.x.toFixed(2)},{" "}
                      {current.dragB.y.toFixed(2)})
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // vector_drag_dot
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  Drag <b>a</b> so that <b>a · b</b> ≈{" "}
                  <span className="font-mono text-white/85">
                    {exercise.targetDot}
                  </span>{" "}
                  (tolerance <b>{exercise.tolerance}</b>).
                  <div className="mt-1 text-white/60">
                    b is fixed:{" "}
                    <span className="font-mono text-white/85">
                      ({exercise.b.x}, {exercise.b.y})
                    </span>
                  </div>
                </div>

                <VectorPad
                  mode="2d"
                  stateRef={padRef}
                  zHeldRef={zHeldRef}
                  handles={{ a: true, b: false }}
                  onPreview={(aNow, bNow) => {
                    updateCurrent({
                      dragA: cloneVec(aNow),
                      dragB: cloneVec(bNow),
                    });
                  }}
                  previewThrottleMs={80}
                  onCommit={(aNow, bNow) => {
                    updateCurrent({
                      dragA: cloneVec(aNow),
                      dragB: cloneVec(bNow),
                    });
                  }}
                  className="relative h-[520px] w-full"
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60 font-extrabold">
                      a (current)
                    </div>
                    <div className="font-mono text-white/85">
                      ({current.dragA.x.toFixed(2)},{" "}
                      {current.dragA.y.toFixed(2)})
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60 font-extrabold">
                      a · b (current)
                    </div>
                    <div className="font-mono text-white/85">
                      {(
                        current.dragA.x * current.dragB.x +
                        current.dragA.y * current.dragB.y
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/10 p-3 text-xs text-white/55">
            ← / → moves between loaded questions • Next loads a new question at
            the end • Enter submits
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function buildSubmitAnswerFromItem(item: QItem): SubmitAnswer | undefined {
  const ex = item.exercise;

  if (ex.kind === "single_choice") {
    if (!item.single) return undefined;
    return { kind: "single_choice", optionId: item.single };
  }

  if (ex.kind === "multi_choice") {
    if (!item.multi?.length) return undefined;
    return { kind: "multi_choice", optionIds: item.multi };
  }

  if (ex.kind === "numeric") {
    if (!item.num?.trim()) return undefined;
    const v = Number(item.num);
    if (!Number.isFinite(v)) return undefined;
    return { kind: "numeric", value: v };
  }

  if (ex.kind === "vector_drag_target") {
    return {
      kind: "vector_drag_target",
      a: { ...item.dragA },
      b: { ...item.dragB },
    };
  }

  if (ex.kind === "vector_drag_dot") {
    return { kind: "vector_drag_dot", a: { ...item.dragA } };
  }

  return undefined;
}

/* ----------------- UI components ----------------- */

function CongratsCard({
  title,
  subtitle,
  scoreLine,
}: {
  title: string;
  subtitle: string;
  scoreLine: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-black/20 p-5">
        <div className="text-lg font-black tracking-tight">{title} 🎉</div>
        <div className="mt-1 text-sm text-white/80">{subtitle}</div>
      </div>

      <div className="p-5">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="text-xs text-white/70 font-extrabold">Score</div>
          <div className="mt-1 text-base font-black text-white/90">
            {scoreLine}
          </div>
        </div>

        <div className="mt-3 text-xs text-white/60">
          Nice work. Review missed ones (below) to lock it in.
        </div>
      </div>
    </div>
  );
}

function PracticeSummary({ missed }: { missed: MissedItem[] }) {
  if (!missed.length) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm">
          <div className="font-black">Perfect run ✅</div>
          <div className="mt-1 text-xs text-white/70">
            You didn’t miss any questions in this session.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 grid gap-3">
      <div className="text-xs text-white/70 font-extrabold">
        Missed ({missed.length})
      </div>

      {missed.map((m) => (
        <div
          key={m.id}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black">{m.title}</div>
              <div className="mt-1 text-xs text-white/70">{m.prompt}</div>
            </div>
            <div className="rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-[11px] font-extrabold text-white/80">
              {m.topic.toUpperCase()} • {m.kind.replaceAll("_", " ")}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 font-extrabold">Your answer</div>
              <pre className="mt-1 text-white/85 whitespace-pre-wrap break-words">
                {JSON.stringify(m.userAnswer, null, 2)}
              </pre>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 font-extrabold">Expected</div>
              <pre className="mt-1 text-white/85 whitespace-pre-wrap break-words">
                {JSON.stringify(m.expected, null, 2)}
              </pre>
            </div>

            {m.explanation ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60 font-extrabold">Explanation</div>
                <div className="mt-1 text-white/85">{m.explanation}</div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
