"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import type {
  Exercise,
  ValidateResponse,
  SubmitAnswer,
  Vec3,
  Difficulty,
  TopicSlug,
} from "@/lib/practice/types";

import { toDbTopicSlug } from "@/lib/practice/topicSlugs";
import {
  difficultyOptions,
  topicOptions,
  type VectorPadState,
} from "@/components/vectorpad/types";

import {
  fetchPracticeExercise,
  submitPracticeAnswer,
  type PracticeGetResponse,
} from "@/lib/practice/clientApi";

import PracticeShell from "@/components/practice/PracticeShell";

const SESSION_DEFAULT = 10;

type Phase = "practice" | "summary";
type TopicValue = TopicSlug | "all";

type PendingChange =
  | { kind: "topic"; value: TopicValue }
  | { kind: "difficulty"; value: Difficulty | "all" }
  | null;

type QItem = {
  key: string;
  exercise: Exercise;

  // answers (non-vector)
  single: string;
  multi: string[];
  num: string;

  // vector answers
  dragA: Vec3;
  dragB: Vec3;

  // matrix answers
  matRows: number;
  matCols: number;
  mat: string[][];

  // validation state
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
  userAnswer: SubmitAnswer;
  expected: any;
  explanation?: string | null;
};

function scorePct(correct: number, attempts: number) {
  if (!attempts) return 0;
  return Math.round((correct / attempts) * 100);
}

function resizeGrid(prev: string[][], rows: number, cols: number) {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  return Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => String(prev?.[i]?.[j] ?? ""))
  );
}

function cloneVec(v: any): Vec3 {
  return { x: Number(v?.x ?? 0), y: Number(v?.y ?? 0), z: Number(v?.z ?? 0) };
}

function isExpiredKey(k: unknown) {
  if (typeof k !== "string") return true;
  const dot = k.indexOf(".");
  if (dot <= 0) return true;

  const body = k.slice(0, dot);
  try {
    const json = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    const exp = Number(json?.exp);
    const now = Math.floor(Date.now() / 1000);
    return !Number.isFinite(exp) || exp <= now;
  } catch {
    return true;
  }
}

/**
 * Normalize anything coming from UI/URL into a DB slug.
 * - "all" stays "all"
 * - "dot" -> "m0.dot"
 * - "matmul" -> "m2.matmul"
 * - "m2.matmul" stays
 */
function normalizeTopicValue(v: string | null | undefined): TopicValue {
  const raw = String(v ?? "").trim();
  if (!raw || raw === "all") return "all";
  return toDbTopicSlug(raw);
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
    return { kind: "vector_drag_target", a: { ...item.dragA }, b: { ...item.dragB } };
  }

  if (ex.kind === "vector_drag_dot") {
    return { kind: "vector_drag_dot", a: { ...item.dragA } };
  }

  if (ex.kind === "matrix_input") {
    const rows = Math.max(1, Math.floor(item.matRows || 0));
    const cols = Math.max(1, Math.floor(item.matCols || 0));

    if (!item.mat || item.mat.length !== rows) return undefined;
    for (const row of item.mat) {
      if (!Array.isArray(row) || row.length !== cols) return undefined;
    }

    const values: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const raw = String(item.mat[r][c] ?? "").trim();
        if (!raw) return undefined;

        const v = Number(raw);
        if (!Number.isFinite(v)) return undefined;

        row.push((ex as any).integerOnly ? Math.trunc(v) : v);
      }
      values.push(row);
    }
    return { kind: "matrix_input", values };
  }

  return undefined;
}

function initItemFromExercise(ex: Exercise, k: string): QItem {
  let a: Vec3 = { x: 0, y: 0, z: 0 };
  let b: Vec3 = { x: 2, y: 1, z: 0 };

  if (ex.kind === "vector_drag_target") {
    a = cloneVec((ex as any).initialA);
    b = cloneVec((ex as any).initialB ?? { x: 2, y: 1, z: 0 });
  } else if (ex.kind === "vector_drag_dot") {
    a = cloneVec((ex as any).initialA);
    b = cloneVec((ex as any).b ?? { x: 2, y: 1, z: 0 });
  }

  const exDiff = String((ex as any).difficulty ?? "easy");
  const allowDimEdit = ex.kind === "matrix_input" && (exDiff === "medium" || exDiff === "hard");

  const matRows =
    ex.kind === "matrix_input"
      ? allowDimEdit
        ? 2
        : Number((ex as any).rows ?? 2)
      : 0;

  const matCols =
    ex.kind === "matrix_input"
      ? allowDimEdit
        ? 2
        : Number((ex as any).cols ?? 2)
      : 0;

  const mat = ex.kind === "matrix_input" ? resizeGrid([], matRows, matCols) : [];

  return {
    key: k,
    exercise: ex,

    single: "",
    multi: [],
    num: "",

    dragA: a,
    dragB: b,

    matRows,
    matCols,
    mat,

    result: null,
    submitted: false,
    revealed: false,
    attempts: 0,
  };
}

function storageKeyV5(section: string | null, topic: TopicValue, difficulty: Difficulty | "all", n: number) {
  return `practice:v5:${section ?? "no-section"}:${topic}:${difficulty}:n=${n}`;
}

export default function PracticeClient() {
  const t = useTranslations("Practice");

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // assignment detection
  const isAssignmentRun = sp.get("type") === "assignment" || !!sp.get("assignmentId");

  // reveal/debug gating
  const allowRevealParam = sp.get("allowReveal") === "true";
  const showDebugParam = sp.get("showDebug") === "true";

  const allowReveal = !isAssignmentRun ? true : allowRevealParam;
  const showDebug = !isAssignmentRun ? showDebugParam : allowRevealParam && showDebugParam;

  const maxAttempts = isAssignmentRun ? 3 : 1;

  const [topic, setTopic] = useState<TopicValue>("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [section, setSection] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("practice");
  const [showMissed, setShowMissed] = useState(true);

  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const [stack, setStack] = useState<QItem[]>([]);
  const [idx, setIdx] = useState(0);

  const [hydrated, setHydrated] = useState(false);
  const restoredRef = useRef(false);
  const firstFiltersEffectRef = useRef(true);
  const skipUrlSyncRef = useRef(true);

  const abortRef = useRef<AbortController | null>(null);
  const submitLockRef = useRef(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);

  const current = stack[idx] ?? null;
  const exercise = current?.exercise ?? null;

  const [sessionSize, setSessionSize] = useState<number>(SESSION_DEFAULT);

  // VectorPad ref (shared)
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

  const topicOptionsFixed = useMemo(() => {
    return topicOptions.map((o) => ({
      ...o,
      id: o.id === "all" ? ("all" as const) : (toDbTopicSlug(String(o.id)) as TopicSlug),
    }));
  }, []);

  const answeredCount = useMemo(() => stack.filter((q) => q.submitted).length, [stack]);
  const correctCount = useMemo(() => stack.filter((q) => q.submitted && q.result?.ok).length, [stack]);

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
        topic: String(q.exercise.topic) as TopicSlug,
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
    if (isAssignmentRun) return;

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

  // hydrate (restore)
  useEffect(() => {
    if (hydrated) return;

    const sectionParam = sp.get("section");
    const difficultyParam = sp.get("difficulty");
    const topicParam = sp.get("topic");
    const sidParam = sp.get("sessionId");

    const questionCountParam = sp.get("questionCount");
    const qcParsed = questionCountParam ? parseInt(questionCountParam, 10) : NaN;
    const sizeFromParam = Number.isFinite(qcParsed) && qcParsed > 0 ? qcParsed : null;

    const nextSection = sectionParam ?? null;
    const nextDifficulty: Difficulty | "all" =
      difficultyParam === "easy" ||
      difficultyParam === "medium" ||
      difficultyParam === "hard" ||
      difficultyParam === "all"
        ? (difficultyParam as any)
        : "all";

    const nextTopic: TopicValue = normalizeTopicValue(topicParam);
    const initialSize = sizeFromParam ?? SESSION_DEFAULT;
    setSessionSize(initialSize);

    if (sidParam) setSessionId(sidParam);

    try {
      const k5 = storageKeyV5(nextSection, nextTopic, nextDifficulty, initialSize);
      const raw5 = sessionStorage.getItem(k5);

      if (raw5) {
        const saved = JSON.parse(raw5);
        if (saved?.v === 5) {
          setSection(saved.section ?? nextSection);
          setTopic(saved.topic ?? nextTopic);
          setDifficulty(saved.difficulty ?? nextDifficulty);

          setSessionId(saved.sessionId ?? sidParam ?? null);
          setPhase(saved.phase ?? "practice");
          setShowMissed(saved.showMissed ?? true);

          const restoredStack = Array.isArray(saved.stack) ? saved.stack : [];
          const cleaned = restoredStack.filter((q: any) => !isExpiredKey(q.key));

          setStack(cleaned);
          setIdx(
            typeof saved.idx === "number"
              ? Math.max(0, Math.min(saved.idx, Math.max(0, cleaned.length - 1)))
              : 0
          );

          if (cleaned.length === 0) {
            setSessionId(saved.sessionId ?? sidParam ?? null);
            setPhase("practice");
          }

          setSessionSize(
            typeof saved.sessionSize === "number" && saved.sessionSize > 0 ? saved.sessionSize : initialSize
          );

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

    setSection(nextSection);
    setTopic(nextTopic);
    setDifficulty(nextDifficulty);

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

  // persist
  useEffect(() => {
    if (!hydrated) return;

    const payload = {
      v: 5,
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
        storageKeyV5(section, topic, difficulty, sessionSize),
        JSON.stringify(payload)
      );
    } catch {}
  }, [hydrated, section, topic, difficulty, sessionId, phase, showMissed, stack, idx, sessionSize]);

  // URL sync (don’t fight assignment URLs)
  useEffect(() => {
    if (!hydrated) return;
    if (isAssignmentRun) return;

    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }

    const qs = new URLSearchParams(sp.toString());

    if (section) qs.set("section", section);
    else qs.delete("section");

    qs.set("topic", String(topic));
    qs.set("difficulty", String(difficulty));

    if (sessionSize && sessionSize !== SESSION_DEFAULT) qs.set("questionCount", String(sessionSize));
    else qs.delete("questionCount");

    const desired = qs.toString();
    const currentSearch = sp.toString();
    if (desired === currentSearch) return;

    router.replace(`${pathname}?${desired}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, section, topic, difficulty, sessionSize, pathname, router, sp, isAssignmentRun]);

  function updateCurrent(patch: Partial<QItem>) {
    setStack((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  // ✅ load lock prevents double fetch on rapid clicks / rerenders
  const loadLockRef = useRef(false);

  async function loadNextExercise(opts?: { forceNew?: boolean }) {
    if (loadLockRef.current) return;
    if (answeredCount >= sessionSize && !opts?.forceNew) return;

    loadLockRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setLoadErr(null);

    try {
      // ✅ ALWAYS prefer URL sessionId (avoids state race on first render)
      const sidFromUrl = sp.get("sessionId");
      const effectiveSid = sidFromUrl ?? sessionId;

      // ✅ only clear session when explicitly forcing new AND there is no URL session
      const sid = opts?.forceNew ? null : effectiveSid;
      const useSession = Boolean(sid);

      const res: PracticeGetResponse = await fetchPracticeExercise({
        sessionId: useSession ? sid ?? undefined : undefined,
        allowReveal: allowReveal ? true : undefined,
        signal: controller.signal,

        // only send filters when NOT using sessionId
        topic: useSession ? undefined : String(topic),
        difficulty: useSession ? undefined : (difficulty === "all" ? undefined : difficulty),
        section: useSession ? undefined : section ?? undefined,
      } as any);

      // ✅ handle server “complete” JSON without crashing
      if ((res as any)?.complete) {
        const sid2 = (res as any)?.sessionId;
        if (sid2) setSessionId(String(sid2));
        setPhase("summary");
        return;
      }

      // ✅ hard-guard against malformed responses (prevents “…reading 'kind'”)
      const ex = (res as any)?.exercise;
      const key = (res as any)?.key;
      if (!ex || typeof ex?.kind !== "string" || typeof key !== "string") {
        throw new Error("Malformed response from /api/practice (missing exercise/key).");
      }

      if ((res as any).sessionId) setSessionId(String((res as any).sessionId));

      const item = initItemFromExercise(ex as Exercise, key);

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
      loadLockRef.current = false;
    }
  }

  // when filters change (non-assignment)
  useEffect(() => {
    if (!hydrated) return;
    if (isAssignmentRun) return;

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
  }, [topic, difficulty, section, hydrated, isAssignmentRun]);

  // ✅ initial load: DO NOT forceNew if URL has sessionId (fixes “stateless first question”)
  useEffect(() => {
    if (!hydrated) return;
    if (restoredRef.current && stack.length > 0) return;
    if (stack.length > 0) return;

    const sidFromUrl = sp.get("sessionId");
    const forceNew = !sidFromUrl && !sessionId;

    void loadNextExercise({ forceNew });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, sp, sessionId]);

  useEffect(() => {
    if (phase === "practice" && answeredCount >= sessionSize) setPhase("summary");
  }, [answeredCount, phase, sessionSize]);

  function canGoPrev() {
    return idx > 0;
  }

  function canGoNext() {
    if (idx < stack.length - 1) return true;
    if (!current?.submitted) return false;
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

  async function submit() {
    if (submitLockRef.current) return;
    if (!current || !exercise) return;
    if (busy) return;

    if (current.submitted) return;
    if (isAssignmentRun && (current.attempts ?? 0) >= maxAttempts) return;

    submitLockRef.current = true;
    setActionErr(null);

    try {
      let answer: SubmitAnswer | undefined;

      if (exercise.kind === "vector_drag_dot") {
        answer = { kind: "vector_drag_dot", a: cloneVec(padRef.current.a) };
        updateCurrent({ dragA: cloneVec(padRef.current.a) });
      } else if (exercise.kind === "vector_drag_target") {
        answer = {
          kind: "vector_drag_target",
          a: cloneVec(padRef.current.a),
          b: cloneVec(padRef.current.b),
        };
        updateCurrent({
          dragA: cloneVec(padRef.current.a),
          dragB: cloneVec(padRef.current.b),
        });
      } else {
        answer = buildSubmitAnswerFromItem(current);
      }

      if (!answer) {
        setActionErr(t("errors.incompleteAnswer"));
        return;
      }

      setBusy(true);

      const data = await submitPracticeAnswer({
        key: current.key,
        answer,
      } as any);

      const nextAttempts = (current.attempts ?? 0) + 1;
      const ok = !!(data as any).ok;
      const finalize = ok || nextAttempts >= maxAttempts;

      updateCurrent({
        result: data as any,
        attempts: nextAttempts,
        submitted: finalize,
        revealed: false,
      });
    } catch (e: any) {
      setActionErr(e?.message ?? t("errors.failedToSubmit"));
    } finally {
      setBusy(false);
      submitLockRef.current = false;
    }
  }

  async function reveal() {
    if (!current || busy) return;
    if (!allowReveal) return;

    setBusy(true);
    setActionErr(null);

    try {
      const data = await submitPracticeAnswer({
        key: current.key,
        reveal: true,
      } as any);

      const solA = (data as any)?.expected?.solutionA;
      const bExp = (data as any)?.expected?.b;

      const finalized = Boolean((data as any)?.finalized);

updateCurrent({
  result: data as any,
  revealed: true,
  submitted: finalized,          // ✅ allows Next
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

  // keyboard shortcuts
  useEffect(() => {
    const activeTag = () => (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
    const isTypingForArrows = () => {
      const tag = activeTag();
      return tag === "textarea" || tag === "select" || tag === "input";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (confirmOpen) return;
      if (phase !== "practice") return;
      if (busy) return;
      if (!exercise) return;
      if (e.repeat) return;

      if (e.key === "Enter") {
        if (current?.submitted) return;
        if (isAssignmentRun && (current?.attempts ?? 0) >= maxAttempts) return;
        if (isTypingForArrows()) return;
        e.preventDefault();
        void submit();
        return;
      }

      if (isTypingForArrows()) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void goNext();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, phase, busy, exercise, current, idx, isAssignmentRun, maxAttempts]);

  // keep padRef synced to current
  useEffect(() => {
    if (!current) return;
    padRef.current.mode = "2d";
    padRef.current.a = { ...current.dragA } as any;
    padRef.current.b = { ...current.dragB } as any;
  }, [current]);

  const badge = useMemo(() => {
    if (!exercise) return "";
    return `${String(exercise.topic).toUpperCase()} • ${exercise.kind.replaceAll("_", " ")}`;
  }, [exercise]);

  const pct = scorePct(correctCount, answeredCount);

  return (
    <PracticeShell
      t={t}
      // state
      isAssignmentRun={isAssignmentRun}
      allowReveal={allowReveal}
      showDebug={showDebug}
      maxAttempts={maxAttempts}
      sessionSize={sessionSize}
      setSessionSize={setSessionSize}
      topic={topic}
      setTopic={(v) => requestChange({ kind: "topic", value: v })}
      difficulty={difficulty}
      setDifficulty={(v) => requestChange({ kind: "difficulty", value: v })}
      section={section}
      setSection={setSection}
      topicOptionsFixed={topicOptionsFixed}
      difficultyOptions={difficultyOptions}
      badge={badge}
      busy={busy}
      loadErr={loadErr}
      actionErr={actionErr}
      phase={phase}
      setPhase={setPhase}
      showMissed={showMissed}
      setShowMissed={setShowMissed}
      pct={pct}
      answeredCount={answeredCount}
      correctCount={correctCount}
      stack={stack}
      idx={idx}
      setIdx={setIdx}
      current={current}
      exercise={exercise}
      missed={missed}
      // modal
      confirmOpen={confirmOpen}
      applyPendingChange={applyPendingChange}
      cancelPendingChange={cancelPendingChange}
      // actions
      canGoPrev={canGoPrev()}
      canGoNext={canGoNext()}
      goPrev={goPrev}
      goNext={goNext}
      submit={submit}
      reveal={reveal}
      retryLoad={() => void loadNextExercise({ forceNew: false })}
      // vectorpad
      padRef={padRef}
      zHeldRef={zHeldRef}
      updateCurrent={updateCurrent}
    />
  );
}
