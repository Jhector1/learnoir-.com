"use client";

import React, { useMemo } from "react";
import type { Exercise } from "@/lib/practice/types";
import MathMarkdown from "@/components/math/MathMarkdown";

type Opt = { id: string; text: string };

function normalizeOptions(ex: any): Opt[] {
  const raw = ex?.options ?? ex?.choices ?? [];
  return (Array.isArray(raw) ? raw : []).map((o: any, i: number) => ({
    id: String(o?.id ?? o?.optionId ?? o?.value ?? o?.key ?? i),
    text: String(o?.text ?? o?.label ?? o?.content ?? o?.latex ?? o?.contentLatex ?? ""),
  }));
}

export default function SingleChoiceExerciseUI({
  exercise,
  value,
  onChange,
  disabled,
}: {
  exercise: Exercise;
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const options = useMemo(() => normalizeOptions(exercise as any), [exercise]);

  return (
    <div className="grid gap-2">
      <div className="text-xs font-extrabold text-white/70">Choose one</div>

      <div className="grid gap-2">
        {options.map((o) => {
          const selected = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={[
                "rounded-2xl border p-3 text-left transition",
                selected
                  ? "border-emerald-400/40 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "mt-0.5 h-4 w-4 rounded-full border",
                    selected ? "border-emerald-400/60 bg-emerald-400/40" : "border-white/20 bg-black/20",
                  ].join(" ")}
                />
                <div className="min-w-0 text-sm text-white/90">
                  <MathMarkdown inline content={o.text} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-white/45">
        Stored as <span className="font-mono">optionId</span> for submit.
      </div>
    </div>
  );
}
