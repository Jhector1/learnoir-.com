"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { clamp, dot, matmul, randnInt, type Mat } from "./matrix";

function row(A: Mat, i: number) {
  return A[i];
}
function col(A: Mat, j: number) {
  return A.map((r) => r[j]);
}

export default function MatMulExplorerSketch() {
  const [m, setM] = useState(3);
  const [n, setN] = useState(4);
  const [k, setK] = useState(3);

  const A = useMemo(() => randnInt(m, n, -3, 3), [m, n]);
  const B = useMemo(() => randnInt(n, k, -3, 3), [n, k]);
  const C = useMemo(() => matmul(A, B), [A, B]);

  const [ri, setRi] = useState(0);
  const [cj, setCj] = useState(0);

  const i = clamp(ri, 0, m - 1);
  const j = clamp(cj, 0, k - 1);

  const r = useMemo(() => row(A, i), [A, i]);
  const c = useMemo(() => col(B, j), [B, j]);
  const cell = useMemo(() => dot(r, c), [r, c]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
          <span className="font-mono">
            ({m}×{n})({n}×{k}) → ({m}×{k})
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span>A rows</span>
            <input type="range" min={2} max={6} value={m} onChange={(e) => setM(+e.target.value)} />
            <span className="w-6 text-right font-mono">{m}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>inner n</span>
            <input type="range" min={2} max={6} value={n} onChange={(e) => setN(+e.target.value)} />
            <span className="w-6 text-right font-mono">{n}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>B cols</span>
            <input type="range" min={2} max={6} value={k} onChange={(e) => setK(+e.target.value)} />
            <span className="w-6 text-right font-mono">{k}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <MatrixHeatmap A={A} cell={26} showNumbers caption="A (row i highlighted)" highlight={{ r0: i, r1: i, c0: 0, c1: n - 1 }} />
        <MatrixHeatmap A={B} cell={26} showNumbers caption="B (col j highlighted)" highlight={{ r0: 0, r1: n - 1, c0: j, c1: j }} />
        <MatrixHeatmap A={C} cell={26} showNumbers caption="C = A @ B (cell i,j)" highlight={{ r0: i, r1: i, c0: j, c1: j }} />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 text-xs font-extrabold text-white/70">pick the dot product</div>

        <div className="grid gap-2 text-xs text-white/70 lg:grid-cols-2">
          <div className="flex items-center gap-2">
            <span className="w-16">row i</span>
            <input type="range" min={0} max={m - 1} value={i} onChange={(e) => setRi(+e.target.value)} />
            <span className="w-6 text-right font-mono">{i}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16">col j</span>
            <input type="range" min={0} max={k - 1} value={j} onChange={(e) => setCj(+e.target.value)} />
            <span className="w-6 text-right font-mono">{j}</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/70">
          <div className="font-mono">C[{i},{j}] = row(A,i) · col(B,j)</div>
          <div className="mt-2 font-mono text-white/80">
            = {r.map((x, t) => `${x}×${c[t]}`).join(" + ")} ={" "}
            <span className="text-white/95">{cell}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
