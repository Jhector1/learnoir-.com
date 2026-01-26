"use client";

import React from "react";
import type { Exercise, Vec3 } from "@/lib/practice/types";
import type { VectorPadState } from "@/components/vectorpad/types";

function fmt(v: Vec3) {
  return `(${v.x}, ${v.y}${v.z ? `, ${v.z}` : ""})`;
}

export default function VectorDragDotExerciseUI({
  exercise,
  a,
  onChange,
  padRef,
  disabled,
}: {
  exercise: Exercise;
  a: Vec3;
  onChange: (a: Vec3) => void;
  padRef: React.MutableRefObject<VectorPadState | null>;
  disabled: boolean;
}) {
  const initA = (exercise as any).initialA as Vec3 | undefined;

  function syncFromPad() {
    const s: any = padRef.current;
    if (!s) return;
    const nextA: Vec3 = { x: Number(s?.a?.x ?? a.x), y: Number(s?.a?.y ?? a.y), z: Number(s?.a?.z ?? a.z) };
    onChange(nextA);
  }

  function reset() {
    if (initA) onChange(initA);
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
        Drag vector <span className="font-extrabold">A</span> on the pad. Submitting uses the live vector from the pad.
        Click <span className="font-extrabold">Sync</span> if you want coordinates updated.
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
          disabled={disabled || !initA}
          onClick={reset}
          className="h-9 rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-extrabold hover:bg-white/15 disabled:opacity-60"
        >
          Reset
        </button>

        <div className="ml-auto text-[11px] text-white/60">
          <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono">A={fmt(a)}</span>
        </div>
      </div>
    </div>
  );
}
