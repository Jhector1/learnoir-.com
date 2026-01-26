"use client";

import React from "react";
import type { Exercise, Vec3 } from "@/lib/practice/types";
import type { VectorPadState } from "@/components/vectorpad/types";

function fmt(v: Vec3) {
  return `(${v.x}, ${v.y}${v.z ? `, ${v.z}` : ""})`;
}

export default function VectorDragTargetExerciseUI({
  exercise,
  a,
  b,
  onChange,
  padRef,
  disabled,
}: {
  exercise: Exercise;
  a: Vec3;
  b: Vec3;
  onChange: (a: Vec3, b: Vec3) => void;
  padRef: React.MutableRefObject<VectorPadState | null>;
  disabled: boolean;
}) {
  const initA = (exercise as any).initialA as Vec3 | undefined;
  const initB = (exercise as any).initialB as Vec3 | undefined;

  function syncFromPad() {
    const s: any = padRef.current;
    if (!s) return;
    const nextA: Vec3 = { x: Number(s?.a?.x ?? a.x), y: Number(s?.a?.y ?? a.y), z: Number(s?.a?.z ?? a.z) };
    const nextB: Vec3 = { x: Number(s?.b?.x ?? b.x), y: Number(s?.b?.y ?? b.y), z: Number(s?.b?.z ?? b.z) };
    onChange(nextA, nextB);
  }

  function reset() {
    if (initA && initB) onChange(initA, initB);
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
        Drag vectors on the pad. Submitting uses the live vectors from the pad.
        If you want the displayed coordinates updated, click <span className="font-extrabold">Sync</span>.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={syncFromPad}
          className="h-9 rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-extrabold hover:bg-white/15 disabled:opacity-60"
        >
          Sync
        </button>

        <button
          type="button"
          disabled={disabled || !initA || !initB}
          onClick={reset}
          className="h-9 rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-extrabold hover:bg-white/15 disabled:opacity-60"
        >
          Reset
        </button>

        <div className="ml-auto flex gap-2 text-[11px] text-white/60">
          <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono">A={fmt(a)}</span>
          <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono">B={fmt(b)}</span>
        </div>
      </div>
    </div>
  );
}
