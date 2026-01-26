"use client";

import React, { useMemo, useState } from "react";
import type { Exercise } from "@/lib/practice/types";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";

function resizeGrid(prev: string[][], rows: number, cols: number) {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  return Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => String(prev?.[i]?.[j] ?? ""))
  );
}

export default function MatrixInputExerciseUI({
  exercise,
  rows,
  cols,
  grid,
  onChangeGrid,
  onChangeDims,
  disabled,
}: {
  exercise: Exercise;
  rows: number;
  cols: number;
  grid: string[][];
  onChangeGrid: (g: string[][]) => void;
  onChangeDims: (rows: number, cols: number, g: string[][]) => void;
  disabled: boolean;
}) {
  const diff = String((exercise as any).difficulty ?? "");
  const allowDimEdit = diff === "medium" || diff === "hard";

  const fixedRows = Number((exercise as any).rows ?? rows ?? 2);
  const fixedCols = Number((exercise as any).cols ?? cols ?? 2);

  const effectiveRows = allowDimEdit ? rows : fixedRows;
  const effectiveCols = allowDimEdit ? cols : fixedCols;

  const normalized = useMemo(
    () => resizeGrid(grid ?? [], effectiveRows, effectiveCols),
    [grid, effectiveRows, effectiveCols]
  );

  // local dims controls (only for medium/hard)
  const [rText, setRText] = useState(String(effectiveRows));
  const [cText, setCText] = useState(String(effectiveCols));

  function applyDims() {
    const r = Math.max(1, Math.min(8, parseInt(rText, 10) || 2));
    const c = Math.max(1, Math.min(8, parseInt(cText, 10) || 2));
    const next = resizeGrid(normalized, r, c);
    onChangeDims(r, c, next);
  }

  return (
    <div className="grid gap-3">
      {allowDimEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <div className="text-[11px] font-extrabold text-white/60">Rows</div>
            <input
              value={rText}
              disabled={disabled}
              onChange={(e) => setRText(e.target.value)}
              className="h-9 w-20 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-extrabold text-white/90 outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-white/60">Cols</div>
            <input
              value={cText}
              disabled={disabled}
              onChange={(e) => setCText(e.target.value)}
              className="h-9 w-20 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-extrabold text-white/90 outline-none disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={applyDims}
            className="h-9 rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-extrabold hover:bg-white/15 disabled:opacity-60"
          >
            Apply size
          </button>

          <div className="text-[11px] text-white/45">
            (Medium/Hard allows resizing; easy is fixed by the prompt.)
          </div>
        </div>
      ) : null}

      <MatrixEntryInput
        labelLatex={(exercise as any).labelLatex ?? String.raw`\mathbf{A}=`}
        rows={effectiveRows}
        cols={effectiveCols}
        value={normalized}
        onChange={(next) => onChangeGrid(next)}
        readOnly={disabled}
      />

      <div className="text-[11px] text-white/45">
        Submit will parse into <span className="font-mono">values: number[][]</span>.
      </div>
    </div>
  );
}
