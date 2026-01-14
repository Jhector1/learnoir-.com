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
import MathMarkdown from "@/components/math/MathMarkdown";
import { useTranslations } from "next-intl";

const SESSION_DEFAULT = 10;

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

  single: string;
  multi: string[];
  num: string;
  dragA: Vec3;
  dragB: Vec3;

  result: ValidateResponse | null;
  submitted: boolean;
  revealed?: boolean;
};

function cloneVec(v: any): Vec3 {
  return { x: Number(v?.x ?? 0), y: Number(v?.y ?? 0), z: Number(v?.z ?? 0) };
}

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

export default function PracticePage() {
  const t = useTranslations("Practice");

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [topic, setTopic] = useState<Topic | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [section, setSection] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("practice");
  const [showMissed, setShowMissed] = useState(true);

  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null); // /api/practice
  const [actionErr, setActionErr] = useState<string | null>(null); // validate/reveal

  const [stack, setStack] = useState<QItem[]>([]);
  const [idx, setIdx] = useState(0);

  const [hydrated, setHydrated] = useState(false);
  const restoredRef = useRef(false);
  const firstFiltersEffectRef = useRef(true);
  const skipUrlSyncRef = useRef(true);

  const abortRef = useRef<AbortController | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);

  const current = stack[idx] ?? null;
  const exercise = current?.exercise ?? null;

  // ✅ session size is state (not a let)
  const [sessionSize, setSessionSize] = useState<number>(SESSION_DEFAULT);

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

  const isAssignmentRun =
    sp.get("type") === "assignment" || !!sp.get("assignmentId");

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
    if (isAssignmentRun) return;
    if (!hasProgress) {
      if (next.kind === "topic") setTopic(next.value);
      if (next.kind === "difficulty") setDifficulty(next.value);
      return;
    }

    setPendingChange(next);
    setConfirmOpen(true);
  }

  type GridMode = "auto" | "fixed";
  const BASE_PX_PER_SQUARE = 44;
  const GRID_STEPS: number[] = [0.25, 0.5, 1, 2, 5, 10, 20];

  const [gridMode, setGridMode] = useState<GridMode>("auto");
  const [gridLabelStep, setGridLabelStep] = useState<number>(1);

  // --- VectorPad (2D only) ---
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

  function setGrid(step: number) {
    const s = Number(step);
    if (!Number.isFinite(s) || s <= 0) return;

    padRef.current.gridStep = s;
    padRef.current.scale = BASE_PX_PER_SQUARE / s;
    setGridLabelStep(s);
  }

  function chooseGridStep(maxAbs: number) {
    if (maxAbs >= 100) return 20;
    if (maxAbs >= 50) return 10;
    if (maxAbs >= 20) return 5;
    if (maxAbs >= 10) return 2;
    if (maxAbs >= 4) return 1;
    if (maxAbs >= 2) return 0.5;
    return 0.25;
  }

  function autoGridForExercise(ex: Exercise) {
    if (ex.kind !== "vector_drag_target" && ex.kind !== "vector_drag_dot")
      return;

    const vals: number[] = [];
    const pushVec = (v?: any) => {
      if (!v) return;
      vals.push(Math.abs(Number(v.x ?? 0)), Math.abs(Number(v.y ?? 0)));
    };

    pushVec((ex as any).initialA);
    pushVec((ex as any).initialB);
    pushVec((ex as any).targetA);
    pushVec((ex as any).b);

    if (ex.kind === "vector_drag_dot") {
      const bx = Number((ex as any).b?.x ?? 0);
      const by = Number((ex as any).b?.y ?? 0);
      const bmag = Math.sqrt(bx * bx + by * by) || 1;

      const targetDot = Math.abs(Number((ex as any).targetDot ?? 0));
      const estAlong = targetDot / bmag;
      if (Number.isFinite(estAlong)) vals.push(estAlong);
    }

    const maxAbs = Math.max(1, ...vals);
    setGrid(chooseGridStep(maxAbs));
  }

  useEffect(() => {
    if (!exercise) return;
    if (gridMode !== "auto") return;
    autoGridForExercise(exercise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, gridMode]);

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

  function storageKeyV3(
    s: string | null,
    t: Topic | "all",
    d: Difficulty | "all"
  ) {
    return `practice:v3:${s ?? "no-section"}:${t}:${d}`;
  }

  function storageKeyV4(
    s: string | null,
    t: Topic | "all",
    d: Difficulty | "all",
    n: number
  ) {
    return `practice:v4:${s ?? "no-section"}:${t}:${d}:n=${n}`;
  }

  // ✅ hydrate (restore)
  useEffect(() => {
    if (hydrated) return;

    const sectionParam = sp.get("section");
    const difficultyParam = sp.get("difficulty");
    const topicParam = sp.get("topic");

    const questionCountParam = sp.get("questionCount");
    const qcParsed = questionCountParam ? parseInt(questionCountParam, 10) : NaN;
    const sizeFromParam =
      Number.isFinite(qcParsed) && qcParsed > 0 ? qcParsed : null;

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
      topicParam === "vectors" ||
      topicParam === "vectors_part2" ||
      topicParam === "vectors_part1"
        ? (topicParam as any)
        : "all";

    const initialSize = sizeFromParam ?? SESSION_DEFAULT;
    setSessionSize(initialSize);

    try {
      const k4 = storageKeyV4(
        nextSection,
        nextTopic,
        nextDifficulty,
        initialSize
      );
      const raw4 = sessionStorage.getItem(k4);

      if (raw4) {
        const saved = JSON.parse(raw4);
        if (saved?.v === 4) {
          setSection(saved.section ?? nextSection);
          setTopic(saved.topic ?? nextTopic);
          setDifficulty(saved.difficulty ?? nextDifficulty);

          setSessionId(saved.sessionId ?? null);
          setPhase(saved.phase ?? "practice");
          setShowMissed(saved.showMissed ?? true);

          setStack(Array.isArray(saved.stack) ? saved.stack : []);
          setIdx(
            typeof saved.idx === "number"
              ? Math.max(
                  0,
                  Math.min(saved.idx, (saved.stack?.length ?? 1) - 1)
                )
              : 0
          );

          setSessionSize(
            typeof saved.sessionSize === "number" && saved.sessionSize > 0
              ? saved.sessionSize
              : initialSize
          );

          setLoadErr(null);
          restoredRef.current = true;
          firstFiltersEffectRef.current = true;
          skipUrlSyncRef.current = true;
          setHydrated(true);
          return;
        }
      }

      const k3 = storageKeyV3(nextSection, nextTopic, nextDifficulty);
      const raw3 = sessionStorage.getItem(k3);

      if (raw3) {
        const saved = JSON.parse(raw3);
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
              ? Math.max(
                  0,
                  Math.min(saved.idx, (saved.stack?.length ?? 1) - 1)
                )
              : 0
          );

          setSessionSize(initialSize);

          setLoadErr(null);
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

    // fresh
    setSection(nextSection);
    setTopic(nextTopic);
    setDifficulty(nextDifficulty);

    setSessionId(null);
    setPhase("practice");
    setShowMissed(true);
    setStack([]);
    setIdx(0);
    setLoadErr(null);

    restoredRef.current = false;
    firstFiltersEffectRef.current = true;
    skipUrlSyncRef.current = true;
    setHydrated(true);
  }, [sp, hydrated]);

  // ✅ persist
  useEffect(() => {
    if (!hydrated) return;

    const payload = {
      v: 4,
      savedAt: Date.now(),
      section,
      topic,
      difficulty,
      sessionId,
      phase,
      showMissed,
      stack,
      idx,
      sessionSize,
    };

    try {
      sessionStorage.setItem(
        storageKeyV4(section, topic, difficulty, sessionSize),
        JSON.stringify(payload)
      );
    } catch {}
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
    sessionSize,
  ]);

  // ✅ URL sync (includes questionCount)
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

    if (sessionSize && sessionSize !== SESSION_DEFAULT)
      qs.set("questionCount", String(sessionSize));
    else qs.delete("questionCount");

    const desired = qs.toString();
    const currentSearch = sp.toString();
    if (desired === currentSearch) return;

    router.replace(`${pathname}?${desired}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, section, topic, difficulty, sessionSize, pathname, router, sp]);

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
      a = cloneVec(ex.initialA);
      b = cloneVec(ex.initialB ?? { x: 2, y: 1, z: 0 });
    } else if (ex.kind === "vector_drag_dot") {
      a = cloneVec(ex.initialA);
      b = cloneVec(ex.b ?? { x: 2, y: 1, z: 0 });
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
      revealed: false,
    };
  }

  async function loadNextExercise(opts?: { forceNew?: boolean }) {
    if (answeredCount >= sessionSize && !opts?.forceNew) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setLoadErr(null);

    try {
      const qs = new URLSearchParams();

      qs.set("topic", topic);
      if (difficulty !== "all") qs.set("difficulty", difficulty);

      const sid = opts?.forceNew ? null : sessionId;

      if (sid) qs.set("sessionId", sid);
      else if (section) qs.set("section", section);

      const r = await fetch(`/api/practice?${qs.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const data = await readJsonSafe(r);
      if (!r.ok)
        throw new Error(data?.message || `Request failed (${r.status})`);

      const ex: Exercise = data.exercise;
      const k: string = data.key;

      if (data.sessionId) setSessionId(data.sessionId);

      const item = initItemFromExercise(ex, k);

      setStack((prev) => {
        const next = [...prev, item];
        setIdx(next.length - 1);
        return next;
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setLoadErr(e?.message ?? t("errors.failedToLoad"));
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  }

  useEffect(() => {
    if (!hydrated) return;

    if (firstFiltersEffectRef.current) {
      firstFiltersEffectRef.current = false;
      return;
    }

    setLoadErr(null);
    setPhase("practice");
    setShowMissed(true);
    setSessionId(null);
    setStack([]);
    setIdx(0);

    void loadNextExercise({ forceNew: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, difficulty, section, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (restoredRef.current && stack.length > 0) return;
    if (stack.length === 0) void loadNextExercise({ forceNew: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (phase === "practice" && answeredCount >= sessionSize)
      setPhase("summary");
  }, [answeredCount, phase, sessionSize]);

  function canGoPrev() {
    return idx > 0;
  }

  function canGoNext() {
    if (idx < stack.length - 1) return true;
    return answeredCount < sessionSize;
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

  const submitLockRef = useRef(false);

  async function submitAnswer() {
    if (submitLockRef.current) return;
    if (!current || !exercise) return;
    if (busy) return;

    submitLockRef.current = true;
    setActionErr(null);

    try {
      let answer: SubmitAnswer | undefined;

      if (exercise.kind === "vector_drag_dot") {
        answer = { kind: "vector_drag_dot", a: cloneVec(padRef.current.a) };
      } else if (exercise.kind === "vector_drag_target") {
        answer = {
          kind: "vector_drag_target",
          a: cloneVec(padRef.current.a),
          b: cloneVec(padRef.current.b),
        };
      } else {
        answer = buildSubmitAnswerFromItem(current);
      }

      if (!answer) {
        setActionErr(t("errors.incompleteAnswer"));
        return;
      }

      if (exercise.kind === "vector_drag_dot") {
        updateCurrent({ dragA: cloneVec(padRef.current.a) });
      } else if (exercise.kind === "vector_drag_target") {
        updateCurrent({
          dragA: cloneVec(padRef.current.a),
          dragB: cloneVec(padRef.current.b),
        });
      }

      setBusy(true);

      const r = await fetch("/api/practice/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key, answer }),
      });

      const data = (await readJsonSafe(r)) as ValidateResponse;
      if (!r.ok) {
        throw new Error(
          (data as any)?.message || `${t("errors.failedToSubmit")} (${r.status})`
        );
      }

      updateCurrent({ result: data, submitted: true, revealed: false });
    } catch (e: any) {
      setActionErr(e?.message ?? t("errors.failedToSubmit"));
    } finally {
      setBusy(false);
      submitLockRef.current = false;
    }
  }

  async function revealAnswer() {
    if (!current || busy) return;

    setBusy(true);
    setActionErr(null);

    try {
      const r = await fetch("/api/practice/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key, reveal: true }),
      });

      const data = (await readJsonSafe(r)) as ValidateResponse;
      if (!r.ok)
        throw new Error(
          (data as any)?.message || `${t("buttons.reveal")} (${r.status})`
        );

      const solA = (data as any)?.expected?.solutionA;
      const bExp = (data as any)?.expected?.b;

      updateCurrent({
        result: data,
        revealed: true,
        ...(solA ? { dragA: cloneVec(solA) } : {}),
        ...(bExp ? { dragB: cloneVec(bExp) } : {}),
      });

      if (solA) padRef.current.a = cloneVec(solA) as any;
      if (bExp) padRef.current.b = cloneVec(bExp) as any;
    } catch (e: any) {
      setActionErr(e?.message ?? t("errors.failedToSubmit"));
    } finally {
      setBusy(false);
    }
  }

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
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;

      const tag = el.tagName.toLowerCase();
      if (tag === "select" || tag === "textarea") return true;

      if (tag === "input") {
        const tt = (el as HTMLInputElement).type;
        if (tt === "checkbox" || tt === "radio") return true;
      }

      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (confirmOpen) return;
      if (phase !== "practice") return;
      if (busy) return;
      if (!exercise) return;
      if (e.repeat) return;

      if (e.key === "Enter") {
        if (shouldBlockEnter()) return;
        if (current?.submitted) return;
        e.preventDefault();
        void submitAnswer();
        return;
      }

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
  }, [
    confirmOpen,
    phase,
    busy,
    exercise,
    current,
    idx,
    stack.length,
    answeredCount,
  ]);

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

  useEffect(() => {
    if (!current) return;

    padRef.current.mode = "2d";
    padRef.current.a = { ...current.dragA } as any;
    padRef.current.b = { ...current.dragB } as any;

    padRef.current.showProjection = current.exercise.topic === "projection";
    padRef.current.showAngle = current.exercise.topic === "angle";
    padRef.current.showComponents = true;
    padRef.current.showGrid = true;
  }, [current]);

  const allowBDrag =
    exercise?.kind === "vector_drag_target" ? !exercise.lockB : false;

  const gridModeSuffix =
    gridMode === "auto" ? t("vectorPad.gridModeAuto") : t("vectorPad.gridModeLocked");

  // SUMMARY VIEW
  if (phase === "summary") {
    const pct = scorePct(correctCount, answeredCount);
    return (
      <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
        <div className="mx-auto max-w-5xl grid gap-4">
          <CongratsCard
            title={t("summary.title")}
            subtitle={t("summary.subtitle", {
              answered: answeredCount,
              sessionSize,
            })}
            scoreLine={t("summary.scoreLine", {
              correct: correctCount,
              missed: answeredCount - correctCount,
              pct,
            })}
          />

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
                  onClick={() => setShowMissed((v) => !v)}
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
              <PracticeSummary missed={missed} />
            ) : (
              <div className="p-4 text-xs text-white/70">
                {t("summary.missedHidden")}
              </div>
            )}
          </div>

          <div className="text-xs text-white/50">{t("summary.urlTip")}</div>
        </div>
      </div>
    );
  }

  // PRACTICE VIEW
  const bFixed = current?.dragB;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
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
                {t("confirm.title")}
              </div>
              <div className="mt-1 text-xs text-white/60">
                {t("confirm.subtitle")}
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-white/80">
                {t("confirm.loseProgress")}{" "}
                <span className="font-extrabold">
                  {answeredCount}/{sessionSize}
                </span>
                .
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={cancelPendingChange}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10"
                >
                  {t("confirm.keep")}
                </button>

                <button
                  onClick={applyPendingChange}
                  className="rounded-xl border border-rose-300/30 bg-rose-300/15 px-3 py-2 text-xs font-extrabold text-white hover:bg-rose-300/25"
                >
                  {t("confirm.restart")}
                </button>
              </div>

              <div className="mt-3 text-[11px] text-white/50">{t("confirm.esc")}</div>
            </div>
          </div>
        </div>
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
                <div className="mt-1 text-xs text-white/70">{t("subtitle")}</div>

                <div className="mt-2 text-xs text-white/60">
                  {t("progress.label")}:{" "}
                  <span className="font-extrabold text-white/80">
                    {answeredCount}/{sessionSize}
                  </span>{" "}
                  • {t("progress.correct")}:{" "}
                  <span className="font-extrabold text-white/80">
                    {correctCount}
                  </span>{" "}
                  • {t("progress.question")}:{" "}
                  <span className="font-extrabold text-white/80">
                    {stack.length ? idx + 1 : 0}/{stack.length}
                  </span>
                </div>
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
                value={topic}
                onChange={(e) => {
                  if (isAssignmentRun) return;
                  const next = e.target.value as Topic | "all";
                  if (next === topic) return;
                  requestChange({ kind: "topic", value: next });
                }}
              >
                {topicOptions.map((tt) => (
                  <option key={tt.id} value={tt.id}>
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
                value={difficulty}
                onChange={(e) => {
                  if (isAssignmentRun) return;
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
                >
                  {t("buttons.prev")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={goNext}
                  disabled={busy || !canGoNext()}
                >
                  {t("buttons.next")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={submitAnswer}
                  disabled={busy || !exercise || !!current?.submitted}
                >
                  {t("buttons.submit")}
                </button>

                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 disabled:opacity-50"
                  onClick={revealAnswer}
                  disabled={busy || !exercise}
                >
                  {t("buttons.reveal")}
                </button>
              </div>
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
                <div className="text-white/70">{t("result.submitToValidate")}</div>
              ) : (
                <>
                  <div className="font-extrabold">
                    {current.revealed
                      ? t("result.revealed")
                      : current.result.ok
                      ? t("result.correct")
                      : t("result.incorrect")}
                  </div>

                  {current.result.explanation ? (
                    <div className="mt-2 text-white/80">
                      {current.result.explanation}
                    </div>
                  ) : null}

                  <ExpectedSummary result={current.result as any} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="border-b border-white/10 bg-black/20 p-4">
            <div className="text-sm font-black">
              {exercise?.title ?? (busy ? t("status.loadingDots") : t("status.dash"))}
            </div>
            <div className="mt-1 text-sm text-white/80 break-words">
              <MathMarkdown
                content={exercise?.prompt ?? ""}
                className="prose prose-invert max-w-none
               prose-p:my-2 prose-strong:text-white
               prose-code:text-white"
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
                    onClick={() => void loadNextExercise({ forceNew: true })}
                    disabled={busy}
                  >
                    {t("buttons.retry")}
                  </button>
                </div>
              </div>
            ) : !current || !exercise ? (
              <div className="text-white/70">{t("status.loading")}</div>
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
                    <span className="text-sm font-extrabold text-white/85 break-words">
                      <MathMarkdown content={o.text} />
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
                      <span className="text-sm font-extrabold text-white/85 break-words">
                        <MathMarkdown content={o.text} />
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : exercise.kind === "numeric" ? (
              <div className="grid gap-3">
                {exercise.hint ? (
                  <MathMarkdown
                    className="prose prose-sm max-w-none"
                    content={exercise.hint}
                  />
                ) : null}

                <div className="grid grid-cols-[1fr_140px] items-center gap-2">
                  <div className="text-xs font-extrabold text-white/70">
                    {t("answer.yourAnswer")}
                  </div>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold tabular-nums text-white/90 outline-none"
                    value={current.num}
                    onChange={(e) => updateCurrent({ num: e.target.value })}
                    placeholder={t("answer.placeholder")}
                  />
                </div>
              </div>
            ) : exercise.kind === "vector_drag_target" ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  {t("exercises.vectorDragTarget.instructions", {
                    x: exercise.targetA.x,
                    y: exercise.targetA.y,
                    tolerance: exercise.tolerance,
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60 mb-2">
                  <div className="font-extrabold text-white/70">
                    {t("vectorPad.title")}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                      {t("vectorPad.gridBadge", {
                        step: gridLabelStep,
                        mode: gridModeSuffix,
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGridMode("auto");
                        if (exercise) autoGridForExercise(exercise);
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-extrabold hover:bg-white/15 ${
                        gridMode === "auto"
                          ? "border-emerald-300/30 bg-emerald-300/15 text-white"
                          : "border-white/10 bg-white/10 text-white/85"
                      }`}
                    >
                      {t("buttons.auto")}
                    </button>

                    <select
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-extrabold text-white/90 outline-none"
                      value={gridLabelStep}
                      onChange={(e) => {
                        const step = Number(e.target.value);
                        setGridMode("fixed");
                        setGrid(step);
                      }}
                    >
                      {GRID_STEPS.map((s) => (
                        <option key={s} value={s}>
                          {t("vectorPad.gridSelectOption", { step: s })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <VectorPad
                  key={current.key}
                  mode="2d"
                  stateRef={padRef}
                  zHeldRef={zHeldRef}
                  handles={{ a: true, b: allowBDrag }}
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
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  {t("exercises.vectorDragDot.instructions", {
                    targetDot: exercise.targetDot,
                    tolerance: exercise.tolerance,
                  })}
                  <div className="mt-1 text-white/60">
                    {t("exercises.vectorDragDot.bFixed", {
                      x: current.dragB.x,
                      y: current.dragB.y,
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60 mb-2">
                  <div className="font-extrabold text-white/70">
                    {t("vectorPad.title")}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                      {t("vectorPad.gridBadge", {
                        step: gridLabelStep,
                        mode: gridModeSuffix,
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGridMode("auto");
                        if (exercise) autoGridForExercise(exercise);
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-extrabold hover:bg-white/15 ${
                        gridMode === "auto"
                          ? "border-emerald-300/30 bg-emerald-300/15 text-white"
                          : "border-white/10 bg-white/10 text-white/85"
                      }`}
                    >
                      {t("buttons.auto")}
                    </button>

                    <select
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-extrabold text-white/90 outline-none"
                      value={gridLabelStep}
                      onChange={(e) => {
                        const step = Number(e.target.value);
                        setGridMode("fixed");
                        setGrid(step);
                      }}
                    >
                      {GRID_STEPS.map((s) => (
                        <option key={s} value={s}>
                          {t("vectorPad.gridSelectOption", { step: s })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <VectorPad
                  key={current.key}
                  mode="2d"
                  stateRef={padRef}
                  zHeldRef={zHeldRef}
                  handles={{ a: true, b: false }}
                  onPreview={(aNow) => updateCurrent({ dragA: cloneVec(aNow) })}
                  onCommit={(aNow) => updateCurrent({ dragA: cloneVec(aNow) })}
                  previewThrottleMs={80}
                  className="relative h-[520px] w-full"
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60 font-extrabold">
                      {t("exercises.vectorDragDot.cards.aCurrent")}
                    </div>
                    <div className="font-mono text-white/85">
                      ({current.dragA.x.toFixed(2)}, {current.dragA.y.toFixed(2)})
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60 font-extrabold">
                      {t("exercises.vectorDragDot.cards.dotCurrent")}
                    </div>
                    <div className="font-mono text-white/85">
                      {(
                        current.dragA.x * (bFixed?.x ?? 0) +
                        current.dragA.y * (bFixed?.y ?? 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
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

/* ---------- UI components ---------- */

function CongratsCard({
  title,
  subtitle,
  scoreLine,
}: {
  title: string;
  subtitle: string;
  scoreLine: string;
}) {
  const tCards = useTranslations("Practice.summaryCards");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-black/20 p-5">
        <div className="text-lg font-black tracking-tight">{title} 🎉</div>
        <div className="mt-1 text-sm text-white/80">{subtitle}</div>
      </div>

      <div className="p-5">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="text-xs text-white/70 font-extrabold">
            {tCards("score")}
          </div>
          <div className="mt-1 text-base font-black text-white/90">
            {scoreLine}
          </div>
        </div>

        <div className="mt-3 text-xs text-white/60">{tCards("niceWork")}</div>
      </div>
    </div>
  );
}

function PracticeSummary({ missed }: { missed: MissedItem[] }) {
  const tCards = useTranslations("Practice.summaryCards");

  if (!missed.length) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm">
          <div className="font-black">{tCards("perfectRunTitle")}</div>
          <div className="mt-1 text-xs text-white/70">
            {tCards("perfectRunSubtitle")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 grid gap-3">
      <div className="text-xs text-white/70 font-extrabold">
        {tCards("missedLabel", { count: missed.length })}
      </div>

      {missed.map((m) => (
        <div
          key={m.id}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black break-words">{m.title}</div>
              <div className="mt-1 text-xs text-white/70 whitespace-pre-wrap break-words">
                {m.prompt}
              </div>
            </div>
            <div className="rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-[11px] font-extrabold text-white/80">
              {m.topic.toUpperCase()} • {m.kind.replaceAll("_", " ")}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 font-extrabold">
                {tCards("yourAnswer")}
              </div>
              <pre className="mt-1 text-white/85 whitespace-pre-wrap break-words">
                {JSON.stringify(m.userAnswer, null, 2)}
              </pre>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 font-extrabold">
                {tCards("expected")}
              </div>
              <pre className="mt-1 text-white/85 whitespace-pre-wrap break-words">
                {JSON.stringify(m.expected, null, 2)}
              </pre>
            </div>

            {m.explanation ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60 font-extrabold">
                  {tCards("explanation")}
                </div>
                <div className="mt-1 text-white/85 whitespace-pre-wrap break-words">
                  {m.explanation}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailsBlock({ value }: { value: any }) {
  const t = useTranslations("Practice.answer");
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-white/60 hover:text-white/80">
        {t("details")}
      </summary>
      <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-white/75">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function ExpectedSummary({ result }: { result: any }) {
  const t = useTranslations("Practice.expectedSummary");

  const exp = result?.expected;
  if (!exp) return null;

  const card = "mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs";
  const row = "flex items-center justify-between gap-2";
  const label = "text-white/60 font-extrabold";
  const mono = "font-mono text-white/85";

  if (exp.kind === "numeric") {
    return (
      <div className={card}>
        <div className={row}>
          <div className={label}>{t("expected")}</div>
          <div className={mono}>
            {exp.value}
            {exp.tolerance ? ` ± ${exp.tolerance}` : ""}
          </div>
        </div>

        <div className={row + " mt-1"}>
          <div className={label}>{t("you")}</div>
          <div className={mono}>{exp.debug?.receivedValue ?? "—"}</div>
        </div>

        <div className={row + " mt-1"}>
          <div className={label}>{t("delta")}</div>
          <div className={mono}>
            {typeof exp.debug?.delta === "number"
              ? exp.debug.delta.toFixed(4)
              : "—"}
          </div>
        </div>

        <DetailsBlock value={exp} />
      </div>
    );
  }

  if (exp.kind === "single_choice") {
    return (
      <div className={card}>
        <div className={row}>
          <div className={label}>{t("chosen")}</div>
          <div className={mono}>{exp.debug?.chosen ?? "—"}</div>
        </div>
        <div className={row + " mt-1"}>
          <div className={label}>{t("correct")}</div>
          <div className={mono}>{exp.optionId ?? "—"}</div>
        </div>
        <DetailsBlock value={exp} />
      </div>
    );
  }

  if (exp.kind === "multi_choice") {
    return (
      <div className={card}>
        <div className={row}>
          <div className={label}>{t("chosen")}</div>
          <div className={mono}>
            {(exp.debug?.chosen ?? []).join(", ") || "—"}
          </div>
        </div>
        <div className={row + " mt-1"}>
          <div className={label}>{t("correct")}</div>
          <div className={mono}>{(exp.optionIds ?? []).join(", ") || "—"}</div>
        </div>
        {exp.debug?.missing?.length || exp.debug?.extra?.length ? (
          <div className="mt-2 text-white/70">
            {exp.debug?.missing?.length ? (
              <div>
                <span className="font-extrabold">{t("missing")}</span>{" "}
                {exp.debug.missing.join(", ")}
              </div>
            ) : null}
            {exp.debug?.extra?.length ? (
              <div>
                <span className="font-extrabold">{t("extra")}</span>{" "}
                {exp.debug.extra.join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}
        <DetailsBlock value={exp} />
      </div>
    );
  }

  if (exp.kind === "vector_drag_target") {
    return (
      <div className={card}>
        <div className={row}>
          <div className={label}>{t("targetAStar")}</div>
          <div className={mono}>
            ({exp.targetA?.x ?? "—"}, {exp.targetA?.y ?? "—"})
          </div>
        </div>
        <div className={row + " mt-1"}>
          <div className={label}>{t("you")}</div>
          <div className={mono}>
            {exp.debug?.receivedA
              ? `(${exp.debug.receivedA.x}, ${exp.debug.receivedA.y})`
              : "—"}
          </div>
        </div>
        <div className={row + " mt-1"}>
          <div className={label}>{t("tolerance")}</div>
          <div className={mono}>± {exp.tolerance}</div>
        </div>
        <DetailsBlock value={exp} />
      </div>
    );
  }

  if (exp.kind === "vector_drag_dot") {
    return (
      <div className={card}>
        <div className={row}>
          <div className={label}>{t("targetDot")}</div>
          <div className={mono}>
            {exp.targetDot} ± {exp.tolerance}
          </div>
        </div>
        <div className={row + " mt-1"}>
          <div className={label}>{t("yourDot")}</div>
          <div className={mono}>
            {typeof exp.debug?.dot === "number"
              ? exp.debug.dot.toFixed(4)
              : "—"}
          </div>
        </div>
        <div className={row + " mt-1"}>
          <div className={label}>{t("aMag")}</div>
          <div className={mono}>
            {typeof exp.debug?.aMag === "number"
              ? exp.debug.aMag.toFixed(4)
              : "—"}{" "}
            ({t("min")} {exp.minMag})
          </div>
        </div>
        <DetailsBlock value={exp} />
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="text-white/70">{t("generic")}</div>
      <DetailsBlock value={exp} />
    </div>
  );
}
