"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { matmul, randnInt, transpose, type Mat } from "./matrix";

function maxDiff(A: Mat, B: Mat) {
  let mx = 0;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      mx = Math.max(mx, Math.abs(A[i][j] - B[i][j]));
    }
  }
  return mx;
}

export default function LiveEvilSketch() {
  const [n, setN] = useState(3);
  const [seed, setSeed] = useState(0);

  const { A, B, C } = useMemo(() => {
    void seed;
    return {
      A: randnInt(n, n, -3, 3),
      B: randnInt(n, n, -3, 3),
      C: randnInt(n, n, -3, 3),
    };
  }, [n, seed]);

  const left = useMemo(() => transpose(matmul(matmul(A, B), C)), [A, B, C]); // (ABC)^T
  const right = useMemo(() => matmul(matmul(transpose(C), transpose(B)), transpose(A)), [A, B, C]); // C^T B^T A^T
  const diff = useMemo(() => maxDiff(left, right), [left, right]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => setSeed((x) => x + 1)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          Regenerate
        </button>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>n</span>
          <input type="range" min={2} max={5} value={n} onChange={(e) => setN(+e.target.value)} />
          <span className="w-6 text-right font-mono">{n}</span>
        </div>

        <div className="ml-auto rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
          max |Δ| = <span className="font-mono">{diff.toFixed(0)}</span> {diff < 1e-9 ? "✅" : ""}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <MatrixHeatmap A={A} cell={26} showNumbers caption="A" />
        <MatrixHeatmap A={B} cell={26} showNumbers caption="B" />
        <MatrixHeatmap A={C} cell={26} showNumbers caption="C" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <MatrixHeatmap A={left} cell={26} showNumbers caption="(ABC)ᵀ" />
        <MatrixHeatmap A={right} cell={26} showNumbers caption="CᵀBᵀAᵀ (LIVE EVIL)" />
      </div>

      <div className="mt-3 text-xs text-white/65">
        Rule: <span className="font-mono text-white/85">(ABC)ᵀ = CᵀBᵀAᵀ</span>
      </div>
    </div>
  );
}
