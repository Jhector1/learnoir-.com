"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import { useTranslations } from "next-intl";

import type { Mode, Vec3 } from "@/lib/math/vec3";
import {
  COLORS,
  angleBetween,
  clamp,
  dot,
  fmt,
  fmt2,
  mag,
  projOfAonB,
  radToDeg,
  scalarProjOfAonB,
  sub,
} from "@/lib/math/vec3";
import { useZHeldRef } from "@/components/vectorpad/useZHeldRef";

type QuestionType = "dot" | "angle" | "scalarProj" | "projX" | "projY" | "projZ";
type StatusKind = "idle" | "good" | "bad";

type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  correct: number;
  unit?: string;
  tolerance: number;
  createdAt: number;
};

export default function Module0VectorSimulatorP5Hybrid({
  mode = "2d",
}: {
  mode?: Mode;
}) {
  const t = useTranslations("Module0");

  // ✅ Z key tracking shared (deduped)
  const { zHeldRef, zKeyUI } = useZHeldRef();

  // IMPORTANT: match VectorPad clamp range (VectorPad clamps 20..280)
  const [scale, setScale] = useState<number>(40);

  const [gridStep, setGridStep] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  const [showGrid, setShowGrid] = useState(true);
  const [showComponents, setShowComponents] = useState(true);
  const [showAngle, setShowAngle] = useState(true);
  const [showProjection, setShowProjection] = useState(true);
  const [showUnitB, setShowUnitB] = useState(false);
  const [showPerp, setShowPerp] = useState(false);

  const [depthMode, setDepthMode] = useState(false);

  // UI-only mirrors (VectorPad truth is stateRef.current.a/b)
  const [a, setA] = useState<Vec3>({ x: 3, y: 2, z: 0 });
  const [b, setB] = useState<Vec3>({ x: 2, y: 4, z: 0 });

  const [qType, setQType] = useState<QuestionType>("dot");
  const [answerText, setAnswerText] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);

  const [status, setStatus] = useState<{ kind: StatusKind; msg: string }>({
    kind: "idle",
    msg: t("status.idle"),
  });

  // ✅ Single source of truth for VectorPad (DO NOT overwrite object during drag)
  const stateRef = useRef<VectorPadState>({
    mode,
    scale,
    gridStep,
    autoGridStep: false,
    snapToGrid,
    showGrid,
    showComponents,
    showAngle,
    showProjection,
    showUnitB,
    showPerp,
    depthMode,
    a,
    b,
  });

  // Keep ref’s mode + enforce z=0 in 2D ONLY when mode changes (not during drag)
  useEffect(() => {
    stateRef.current.mode = mode;

    if (mode === "2d") {
      const A = { ...stateRef.current.a, z: 0 };
      const B = { ...stateRef.current.b, z: 0 };
      stateRef.current.a = A;
      stateRef.current.b = B;
      setA(A);
      setB(B);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ✅ Stable callback (VectorPad re-inits p5 if onScaleChange identity changes)
  const onScaleChange = useCallback((nextScale: number) => {
    const clamped = clamp(nextScale, 20, 280);
    setScale(clamped);
    stateRef.current.scale = clamped;
  }, []);

  // ---- UI controls patch BOTH React state + stateRef (no sync effect) ----
  const setSnapToGridBoth = (v: boolean) => {
    setSnapToGrid(v);
    stateRef.current.snapToGrid = v;
  };
  const setGridStepBoth = (v: number) => {
    setGridStep(v);
    stateRef.current.gridStep = v;
  };
  const setShowGridBoth = (v: boolean) => {
    setShowGrid(v);
    stateRef.current.showGrid = v;
  };
  const setShowComponentsBoth = (v: boolean) => {
    setShowComponents(v);
    stateRef.current.showComponents = v;
  };
  const setShowAngleBoth = (v: boolean) => {
    setShowAngle(v);
    stateRef.current.showAngle = v;
  };
  const setShowProjectionBoth = (v: boolean) => {
    setShowProjection(v);
    stateRef.current.showProjection = v;
  };
  const setShowUnitBBoth = (v: boolean) => {
    setShowUnitB(v);
    stateRef.current.showUnitB = v;
  };
  const setShowPerpBoth = (v: boolean) => {
    setShowPerp(v);
    stateRef.current.showPerp = v;
  };
  const setDepthModeBoth = (v: boolean) => {
    setDepthMode(v);
    stateRef.current.depthMode = v;
  };

  // ✅ Smooth drag UI updates (RAF) without writing back into stateRef
  const latestPreview = useRef<{ a: Vec3; b: Vec3 } | null>(null);
  const previewRaf = useRef<number | null>(null);

  const onPreviewUI = useCallback((na: Vec3, nb: Vec3) => {
    latestPreview.current = { a: na, b: nb };
    if (previewRaf.current != null) return;

    previewRaf.current = requestAnimationFrame(() => {
      previewRaf.current = null;
      const p = latestPreview.current;
      if (!p) return;
      setA(p.a);
      setB(p.b);
    });
  }, []);

  const onCommitUI = useCallback((na: Vec3, nb: Vec3) => {
    setA(na);
    setB(nb);
  }, []);

  useEffect(() => {
    return () => {
      if (previewRaf.current != null) cancelAnimationFrame(previewRaf.current);
    };
  }, []);

  const derived = useMemo(() => {
    const A = a;
    const B = b;
    const aMag = mag(A);
    const bMag = mag(B);
    const d = dot(A, B);
    const ang = angleBetween(A, B);
    const cosv = aMag > 1e-9 && bMag > 1e-9 ? clamp(d / (aMag * bMag), -1, 1) : NaN;

    const proj = projOfAonB(A, B);
    const perp = sub(A, proj);
    const sp = scalarProjOfAonB(A, B);

    return {
      aMag,
      bMag,
      dot: d,
      angleDeg: radToDeg(ang),
      cos: cosv,
      proj,
      perp,
      scalarProj: sp,
    };
  }, [a, b]);

  function buildQuestion(type: QuestionType): Question {
    const A = stateRef.current.a;
    const B = stateRef.current.b;

    const angDeg = radToDeg(angleBetween(A, B));
    const pr = projOfAonB(A, B);
    const sp = scalarProjOfAonB(A, B);

    let prompt = "";
    let correct = NaN;
    let unit = "";
    let tol = 0.25;

    switch (type) {
      case "dot":
        prompt = t("questions.dot");
        correct = dot(A, B);
        tol = 0.25;
        break;
      case "angle":
        prompt = t("questions.angle");
        correct = angDeg;
        unit = "°";
        tol = 1.0;
        break;
      case "scalarProj":
        prompt = t("questions.scalarProj");
        correct = sp;
        tol = 0.25;
        break;
      case "projX":
        prompt = t("questions.projX");
        correct = pr.x;
        tol = 0.25;
        break;
      case "projY":
        prompt = t("questions.projY");
        correct = pr.y;
        tol = 0.25;
        break;
      case "projZ":
        prompt = t("questions.projZ");
        correct = pr.z;
        tol = 0.25;
        break;
    }

    return {
      id: `${type}-${Date.now()}`,
      type,
      prompt,
      correct,
      unit,
      tolerance: tol,
      createdAt: Date.now(),
    };
  }

  function onNewQuestion() {
    const safeType = mode === "2d" && qType === "projZ" ? "projX" : qType;
    const q = buildQuestion(safeType);
    setQuestion(q);
    setAnswerText("");
    setStatus({
      kind: "idle",
      msg: t("status.question", {
        prompt: q.prompt,
        tolerance: String(q.tolerance),
        unit: q.unit ?? "",
      }),
    });
  }

  function parseAnswer(s: string) {
    const cleaned = s.replace(/[^\d\-+.eE]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  function onCheck() {
    if (!question) {
      setStatus({ kind: "bad", msg: t("status.noQuestion") });
      return;
    }
    const userVal = parseAnswer(answerText);
    if (!Number.isFinite(userVal)) {
      setStatus({ kind: "bad", msg: t("status.invalidNumber") });
      return;
    }
    const ok = Math.abs(userVal - question.correct) <= question.tolerance;
    setStatus(
      ok
        ? { kind: "good", msg: t("status.correct", { value: String(userVal) }) }
        : { kind: "bad", msg: t("status.incorrect", { value: String(userVal) }) }
    );
  }

  function onReveal() {
    if (!question) {
      setStatus({ kind: "bad", msg: t("status.noReveal") });
      return;
    }
    setStatus({
      kind: "good",
      msg: t("status.answer", {
        value: question.correct.toFixed(3),
        unit: question.unit ?? "",
      }),
    });
  }

  function randomizeVectors() {
    const r = () => Math.round((Math.random() * 10 - 5) * 2) / 2;

    let A: Vec3 = { x: r(), y: r(), z: mode === "3d" ? r() : 0 };
    let B: Vec3 = { x: r(), y: r(), z: mode === "3d" ? r() : 0 };

    if (mag(B) < 1) B = { x: 3, y: 2, z: mode === "3d" ? 1.5 : 0 };
    if (mag(A) < 1) A = { x: 4, y: -1.5, z: mode === "3d" ? -1 : 0 };

    stateRef.current.a = A;
    stateRef.current.b = B;
    setA(A);
    setB(B);
    setStatus({ kind: "idle", msg: t("status.randomized") });
  }

  function resetVectors() {
    const A: Vec3 = { x: 3, y: 2, z: mode === "3d" ? 1 : 0 };
    const B: Vec3 = { x: 2, y: 4, z: mode === "3d" ? -1 : 0 };
    stateRef.current.a = A;
    stateRef.current.b = B;
    setA(A);
    setB(B);
    setStatus({ kind: "idle", msg: t("status.reset") });
  }

  function zeroA() {
    const A: Vec3 = { x: 0, y: 0, z: 0 };
    stateRef.current.a = A;
    setA(A);
    setStatus({ kind: "idle", msg: t("status.zeroA") });
  }

  function zeroB() {
    const B: Vec3 = { x: 0, y: 0, z: 0 };
    stateRef.current.b = B;
    setB(B);
    setStatus({ kind: "idle", msg: t("status.zeroB") });
  }

  const Toggle = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <label
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 cursor-pointer touch-manipulation"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-extrabold text-white/70 pointer-events-none">{label}</span>
      <input
        type="checkbox"
        className="scale-110 cursor-pointer accent-blue-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
      />
    </label>
  );

  const KV = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div className="text-xs font-extrabold text-white/70">{label}</div>
      <div className="font-extrabold tabular-nums text-white/90">{value}</div>
    </div>
  );

  const statusClass =
    status.kind === "good"
      ? "border-emerald-300/30 bg-emerald-300/10 text-white/90"
      : status.kind === "bad"
      ? "border-rose-300/30 bg-rose-300/10 text-white/90"
      : "border-white/10 bg-black/20 text-white/70";

  const aLabel =
    mode === "2d"
      ? `(${fmt2(a.x)}, ${fmt2(a.y)})`
      : `(${fmt2(a.x)}, ${fmt2(a.y)}, ${fmt2(a.z)})`;
  const bLabel =
    mode === "2d"
      ? `(${fmt2(b.x)}, ${fmt2(b.y)})`
      : `(${fmt2(b.x)}, ${fmt2(b.y)}, ${fmt2(b.z)})`;

  const killEvent = (e: any) => {
    e.stopPropagation?.();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  return (
    <div className="min-h-screen p-3 md:p-4 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT PANEL */}
        <div
          className="relative z-20 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_rgba(0,0,0,0.35)] overflow-hidden"
          onPointerDownCapture={killEvent}
          onPointerMoveCapture={killEvent}
          onPointerUpCapture={killEvent}
          onMouseDownCapture={killEvent}
          onTouchStartCapture={killEvent}
          onWheelCapture={killEvent}
        >
          <div className="border-b border-white/10 bg-black/20 px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-black tracking-tight">{t("title")}</div>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-extrabold text-white/70">
                {t("badges.meta", { mode: mode.toUpperCase() })}
              </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-white/70">
              {mode === "2d" ? (
                <>{t("desc.2d")}</>
              ) : (
                <>
                  {t("desc.3d.beforeZ")}{" "}
                  <span className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">
                    Z
                  </span>{" "}
                  {t("desc.3d.afterZ")}
                </>
              )}
            </p>
          </div>

          <div className="border-b border-white/10 p-3">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">
                {mode === "2d" ? t("labels.scale2d") : t("labels.scale3d")}
              </div>
              <div className="font-extrabold tabular-nums">{scale}</div>
            </div>

            <input
              className="mt-2 w-full"
              type="range"
              min={20}
              max={280}
              value={scale}
              onChange={(e) => {
                const v = clamp(Number(e.target.value), 20, 280);
                setScale(v);
                stateRef.current.scale = v;
              }}
            />

            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">{t("labels.snapToGrid")}</div>
              <input
                type="checkbox"
                className="scale-110 accent-blue-500"
                checked={snapToGrid}
                onChange={(e) => setSnapToGridBoth(e.target.checked)}
              />
            </div>

            {mode === "3d" ? (
              <>
                <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
                  <div className="text-xs font-extrabold text-white/70">{t("labels.depthMode")}</div>
                  <input
                    type="checkbox"
                    className="scale-110 accent-blue-500"
                    checked={depthMode}
                    onChange={(e) => setDepthModeBoth(e.target.checked)}
                  />
                </div>
                <div className="mt-2 text-xs text-white/60">
                  {t("labels.zKeyDetected")}{" "}
                  <span className={zKeyUI ? "text-emerald-300 font-extrabold" : "text-white/70 font-extrabold"}>
                    {zKeyUI ? t("labels.on") : t("labels.off")}
                  </span>
                </div>
              </>
            ) : null}

            <div className="mt-2 grid grid-cols-[1fr_120px] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">{t("labels.gridStep")}</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold tabular-nums text-white/90 outline-none"
                type="number"
                min={0.5}
                step={0.5}
                value={gridStep}
                onChange={(e) => setGridStepBoth(Number(e.target.value))}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold hover:bg-emerald-300/15 active:translate-y-[1px]"
                onClick={randomizeVectors}
              >
                {t("buttons.randomize")}
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 active:translate-y-[1px]"
                onClick={resetVectors}
              >
                {t("buttons.reset")}
              </button>
              <button
                className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-extrabold hover:bg-rose-300/15 active:translate-y-[1px]"
                onClick={zeroA}
              >
                {t("buttons.zeroA")}
              </button>
              <button
                className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-extrabold hover:bg-rose-300/15 active:translate-y-[1px]"
                onClick={zeroB}
              >
                {t("buttons.zeroB")}
              </button>
            </div>
          </div>

          {/* overlays */}
          <div className="border-b border-white/10 p-3">
            <div className="mb-2 text-sm font-black">{t("sections.overlays")}</div>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label={t("toggles.gridAxes")} checked={showGrid} onChange={setShowGridBoth} />
              <Toggle label={t("toggles.components")} checked={showComponents} onChange={setShowComponentsBoth} />
              <Toggle label={t("toggles.angle")} checked={showAngle} onChange={setShowAngleBoth} />
              <Toggle label={t("toggles.projection")} checked={showProjection} onChange={setShowProjectionBoth} />
              <Toggle label={t("toggles.unitB")} checked={showUnitB} onChange={setShowUnitBBoth} />
              <Toggle label={t("toggles.perp")} checked={showPerp} onChange={setShowPerpBoth} />
            </div>
          </div>

          {/* live math */}
          <div className="border-b border-white/10 p-3">
            <div className="mb-2 text-sm font-black">{t("sections.liveMath")}</div>

            <div className="grid grid-cols-3 gap-2">
              <KV
                label={t("live.aLabel", { dims: mode === "2d" ? "(ax, ay)" : "(ax, ay, az)" })}
                value={aLabel}
              />
              <KV label={t("live.magA")} value={fmt(derived.aMag)} />
              <KV label={t("live.dot")} value={fmt(derived.dot)} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <KV
                label={t("live.bLabel", { dims: mode === "2d" ? "(bx, by)" : "(bx, by, bz)" })}
                value={bLabel}
              />
              <KV label={t("live.magB")} value={fmt(derived.bMag)} />
              <KV label={t("live.cos")} value={fmt(derived.cos)} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <KV label={t("live.thetaDeg")} value={fmt2(derived.angleDeg)} />
              <KV label={t("live.scalarProj")} value={fmt(derived.scalarProj)} />
              <KV label={t("live.projLen")} value={fmt(mag(derived.proj))} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <KV
                label={t("live.projVec")}
                value={
                  mode === "2d"
                    ? `(${fmt(derived.proj.x)}, ${fmt(derived.proj.y)})`
                    : `(${fmt(derived.proj.x)}, ${fmt(derived.proj.y)}, ${fmt(derived.proj.z)})`
                }
              />
              <KV
                label={t("live.perpVec")}
                value={
                  mode === "2d"
                    ? `(${fmt(derived.perp.x)}, ${fmt(derived.perp.y)})`
                    : `(${fmt(derived.perp.x)}, ${fmt(derived.perp.y)}, ${fmt(derived.perp.z)})`
                }
              />
              <KV label={t("live.perpLen")} value={fmt(mag(derived.perp))} />
            </div>
          </div>

          {/* practice mode */}
          <div className="p-3">
            <div className="mb-2 text-sm font-black">{t("sections.practice")}</div>

            <div className="grid grid-cols-[1fr_170px] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">{t("practice.questionType")}</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold text-white/90 outline-none"
                value={qType}
                onChange={(e) => setQType(e.target.value as QuestionType)}
              >
                <option value="dot">{t("practice.options.dot")}</option>
                <option value="angle">{t("practice.options.angle")}</option>
                <option value="scalarProj">{t("practice.options.scalarProj")}</option>
                <option value="projX">{t("practice.options.projX")}</option>
                <option value="projY">{t("practice.options.projY")}</option>
                <option value="projZ" disabled={mode === "2d"}>
                  {t("practice.options.projZ")}
                </option>
              </select>
            </div>

            <div className="mt-2 grid grid-cols-[1fr_170px] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">{t("practice.yourAnswer")}</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold tabular-nums text-white/90 outline-none"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={t("practice.placeholder")}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold hover:bg-emerald-300/15 active:translate-y-[1px]"
                onClick={onNewQuestion}
              >
                {t("buttons.newQuestion")}
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 active:translate-y-[1px]"
                onClick={onCheck}
              >
                {t("buttons.check")}
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 active:translate-y-[1px]"
                onClick={onReveal}
              >
                {t("buttons.reveal")}
              </button>
            </div>

            <div className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed ${statusClass}`}>
              {question ? (
                <div className="mb-1">
                  <span className="font-extrabold text-white/90">{t("practice.active")}</span>{" "}
                  <span className="text-white/80">{question.prompt}</span>
                </div>
              ) : null}
              {status.msg}
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div className="relative z-0 min-h-[520px] lg:min-h-[calc(100vh-28px)]">
          {/* HUD */}
          <div className="pointer-events-none inset-3 flex items-start justify-between gap-3">
            <div className="max-w-[560px] rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
              <div className="text-sm font-black">{t("hud.controlsTitle")}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {mode === "2d" ? (
                  <>{t("hud.controls2d")}</>
                ) : (
                  <>
                    {t("hud.controls3d.beforeZ")}{" "}
                    <span className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">
                      Z
                    </span>{" "}
                    {t("hud.controls3d.afterZ")}
                  </>
                )}
              </p>
            </div>

            <div className="max-w-[420px] text-right rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
              <div className="text-sm font-black">{t("hud.legendTitle")}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                <span className="font-extrabold" style={{ color: COLORS.a }}>
                  a
                </span>
                ,{" "}
                <span className="font-extrabold" style={{ color: COLORS.b }}>
                  b
                </span>
                ,{" "}
                <span className="font-extrabold" style={{ color: COLORS.proj }}>
                  proj₍b₎(a)
                </span>
                ,{" "}
                <span className="font-extrabold" style={{ color: COLORS.perp }}>
                  a⊥
                </span>
                , <span className="font-extrabold text-white/80">{t("hud.shadow")}</span>
              </p>
            </div>
          </div>

          <div className="h-full w-full rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_18px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <VectorPad
              mode={mode}
              stateRef={stateRef}
              zHeldRef={zHeldRef}
              onScaleChange={onScaleChange} // ✅ stable, no remounts
              onPreview={onPreviewUI}
              onCommit={onCommitUI}
              previewThrottleMs={16} // ✅ near-60fps UI mirror
              className="relative h-full w-full min-h-[520px]"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-white/50">{t("footerTip")}</div>
    </div>
  );
}
