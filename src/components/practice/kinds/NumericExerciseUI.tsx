"use client";

import React from "react";
import type { Exercise } from "@/lib/practice/types";

export default function NumericExerciseUI({
  exercise,
  value,
  onChange,
  disabled,
}: {
  exercise: Exercise;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const placeholder = (exercise as any).placeholder ?? "Enter a number…";

  return (
    <div className="grid gap-2">
      <div className="text-xs font-extrabold text-white/70">Your answer</div>
      <input
        className={[
          "h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3",
          "text-sm font-extrabold text-white/90 outline-none",
          "focus:border-emerald-400/60 disabled:opacity-60",
        ].join(" ")}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="text-[11px] text-white/45">
        Tip: decimals are allowed unless the prompt says “integer”.
      </div>
    </div>
  );
}
