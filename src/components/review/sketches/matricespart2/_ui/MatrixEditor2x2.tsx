"use client";

import React from "react";
import type { Mat2 } from "@/lib/math/matrixSmall";

export function MatrixEditor2x2({
  label = "A",
  value,
  onChange,
}: {
  label?: string;
  value: Mat2;
  onChange: (next: Mat2) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs font-extrabold text-white/70">{label}</div>

      {([0, 1] as const).map((r) =>
        ([0, 1] as const).map((c) => (
          <input
            key={`${r}-${c}`}
            type="number"
            step={0.5}
            value={value[r][c]}
            onChange={(e) => {
              const v = Number(e.target.value);
              const next: Mat2 = [
                [value[0][0], value[0][1]],
                [value[1][0], value[1][1]],
              ];
              next[r][c] = v;
              onChange(next);
            }}
            className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-extrabold text-white/90 outline-none"
          />
        ))
      )}
    </div>
  );
}

export function TinyButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
    >
      {children}
    </button>
  );
}
