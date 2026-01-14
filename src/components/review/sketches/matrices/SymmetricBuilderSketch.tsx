"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { isSymmetric, matmul, randnInt, transpose } from "./matrix";

export default function SymmetricBuilderSketch() {
  const [m, setM] = useState(5);
  const [n, setN] = useState(3);
  const [seed, setSeed] = useState(0);

  const A = useMemo(() => {
    void seed;
    return randnInt(m, n, -3, 3);
  }, [m, n, seed]);

  const At = useMemo(() => transpose(A), [A]);
  const AtA = useMemo(() => matmul(At, A), [At, A]); // n×n
  const AAt = useMemo(() => matmul(A, At), [A, At]); // m×m

  const ok1 = useMemo(() => isSymmetric(AtA), [AtA]);
  const ok2 = useMemo(() => isSymmetric(AAt), [AAt]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSeed((x) => x + 1)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          Regenerate A
        </button>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>m</span>
          <input type="range" min={2} max={7} value={m} onChange={(e) => setM(+e.target.value)} />
          <span className="w-6 text-right font-mono">{m}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>n</span>
          <input type="range" min={2} max={7} value={n} onChange={(e) => setN(+e.target.value)} />
          <span className="w-6 text-right font-mono">{n}</span>
        </div>

        <div className="ml-auto text-xs text-white/70">
          A is <span className="font-mono text-white/85">({m}×{n})</span>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <MatrixHeatmap A={A} cell={26} showNumbers caption="A" />
        <MatrixHeatmap A={AtA} cell={26} showNumbers caption={`AᵀA (${n}×${n}) ${ok1 ? "✅ symmetric" : ""}`} />
        <MatrixHeatmap A={AAt} cell={26} showNumbers caption={`AAᵀ (${m}×${m}) ${ok2 ? "✅ symmetric" : ""}`} />
      </div>

      <div className="mt-3 text-xs text-white/65">
        Multiplying by the transpose makes a square symmetric matrix (even if A is rectangular).
      </div>
    </div>
  );
}
