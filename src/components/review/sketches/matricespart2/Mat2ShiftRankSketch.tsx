// src/components/review/sketches/matricespart2/Mat2ShiftRankSketch.tsx
"use client";

import React, { useMemo, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import { det2, gridToMat, rank, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  // singular: col2 = 2*col1
  return [
    ["1", "2"],
    ["2", "4"],
  ];
}

// --- LaTeX matrix formatter ---
function fmtMat2(M: Mat, digits = 2) {
  const f = (x: number) =>
    Number.isFinite(x) ? x.toFixed(digits).replace(/\.00$/, "") : "0";
  return String.raw`\begin{bmatrix}${f(M[0][0])} & ${f(M[0][1])}\\ ${f(M[1][0])} & ${f(
    M[1][1]
  )}\end{bmatrix}`;
}

export default function Mat2ShiftRankSketch({
  heightClass = "h-[420px]",
}: {
  heightClass?: string;
}) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;

  const [alpha, setAlpha] = useState(0.0);

  const Ashift = useMemo(() => {
    return [
      [A[0][0] + alpha, A[0][1]],
      [A[1][0], A[1][1] + alpha],
    ] as Mat;
  }, [A, alpha]);

  const detA = useMemo(() => det2(A), [A]);
  const detS = useMemo(() => det2(Ashift), [Ashift]);

  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const rS = useMemo(() => rank(Ashift, 1e-10), [Ashift]);

  return (
    <div className={`w-full ${heightClass} overflow-auto p-4`}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <MatrixEntryInput
          labelLatex={String.raw`\mathbf{A}=`}
          rows={2}
          cols={2}
          value={Agrid}
          onChange={setAgrid}
          cellWidthClass="w-20"
        />

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-extrabold text-white/70">Shift α</div>
          <input
            className="mt-2 w-full"
            type="range"
            min={-5}
            max={5}
            step={0.05}
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
          />
          <div className="mt-2 text-xs text-white/70">α = {alpha.toFixed(2)}</div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
            <div className="text-xs font-extrabold text-white/70">Original</div>

            {/* ✅ show matrix entries */}
            <MathMarkdown
              content={String.raw`$\mathbf{A}=${fmtMat2(A)}$`}
            />

            <MathMarkdown content={String.raw`$\det(\mathbf{A})=${detA.toFixed(4)}$`} />
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
            <div className="text-xs font-extrabold text-white/70">Shifted</div>

            {/* ✅ show matrix entries */}
            <MathMarkdown
              content={String.raw`$\mathbf{A}+\alpha\mathbf{I}=${fmtMat2(Ashift)}$`}
            />

            <MathMarkdown content={String.raw`$\det(\mathbf{A}+\alpha\mathbf{I})=${detS.toFixed(4)}$`} />
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A}+\alpha\mathbf{I})=${rS}$`} />
          </div>
        </div>

        <div className="mt-3 text-xs text-white/60">
          Shifting often turns singular matrices into full-rank matrices (det moves away from 0).
        </div>
      </div>
    </div>
  );
}
