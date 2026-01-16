"use client";

import React, { useMemo } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";

type Props = {
  labelLatex?: string; // e.g. \mathbf{A}=
  rows: number;
  cols: number;
  value: string[][];
  onChange: (next: string[][]) => void;
  cellWidthClass?: string; // optional: "w-14" | "w-16" etc
};

function normalizeGrid(value: string[][], rows: number, cols: number) {
  const out: string[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => String(value?.[r]?.[c] ?? ""))
  );
  return out;
}

function phantomForRows(rows: number) {
  // bracket height matches number of rows
  return String.raw`\vphantom{\begin{matrix}${Array.from({ length: rows })
    .map(() => "0")
    .join("\\\\")}\end{matrix}}`;
}

export default function MatrixEntryInput({
  labelLatex = String.raw`\mathbf{A}=`,
  rows,
  cols,
  value,
  onChange,
  cellWidthClass = "w-16",
}: Props) {
  const grid = useMemo(() => normalizeGrid(value, rows, cols), [value, rows, cols]);

  return (
    <div className="flex items-start gap-3">
      <MathMarkdown inline className="text-white/90" content={`$${labelLatex}$`} />

      <div className="max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center">
          {/* Left bracket */}
          <MathMarkdown
            inline
            className="text-white/90"
            content={String.raw`$\left[${phantomForRows(rows)}\right.$`}
          />

          {/* Cells */}
          <div
            className="mx-2 grid gap-x-3 gap-y-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((__, c) => (
                <input
                  key={`${r}-${c}`}
                  type="text"
                  inputMode="decimal"
                  value={grid[r][c]}
                  onChange={(e) => {
                    const next = grid.map((row) => row.slice());
                    next[r][c] = e.target.value;
                    onChange(next);
                  }}
                  className={`
                    ${cellWidthClass}
                    rounded-md border border-white/10 bg-black/30
                    px-2 py-1 text-center text-xs font-mono font-extrabold text-white/90
                    outline-none focus:border-emerald-400/60
                  `}
                  placeholder="0"
                />
              ))
            )}
          </div>

          {/* Right bracket */}
          <MathMarkdown
            inline
            className="text-white/90"
            content={String.raw`$\left.${phantomForRows(rows)}\right]$`}
          />
        </div>
      </div>
    </div>
  );
}
