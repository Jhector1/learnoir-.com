"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { clamp, randnInt, type Mat } from "./matrix";

function submatrix(A: Mat, r0: number, r1: number, c0: number, c1: number) {
  const out: Mat = [];
  for (let i = r0; i <= r1; i++) out.push(A[i].slice(c0, c1 + 1));
  return out;
}

export default function MatrixSliceSketch() {
  const [m] = useState(6);
  const [n] = useState(10);
  const [seed, setSeed] = useState(0);

  const A = useMemo(() => {
    void seed;
    // nice 0..59 like the book example
    const flat = Array.from({ length: m * n }, (_, i) => i);
    const out: Mat = [];
    for (let i = 0; i < m; i++) out.push(flat.slice(i * n, (i + 1) * n));
    return out;
  }, [m, n, seed]);

  const [r0, setR0] = useState(1);
  const [r1, setR1] = useState(3);
  const [c0, setC0] = useState(0);
  const [c1, setC1] = useState(4);

  const rr0 = clamp(Math.min(r0, r1), 0, m - 1);
  const rr1 = clamp(Math.max(r0, r1), 0, m - 1);
  const cc0 = clamp(Math.min(c0, c1), 0, n - 1);
  const cc1 = clamp(Math.max(c0, c1), 0, n - 1);

  const sub = useMemo(() => submatrix(A, rr0, rr1, cc0, cc1), [A, rr0, rr1, cc0, cc1]);

  const code = `sub = A[${rr0}:${rr1 + 1}, ${cc0}:${cc1 + 1}]`;

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSeed((x) => x + 1)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          Reset example
        </button>

        <div className="ml-auto grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span className="w-10">r0</span>
            <input type="range" min={0} max={m - 1} value={r0} onChange={(e) => setR0(+e.target.value)} />
            <span className="w-8 text-right font-mono">{rr0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10">r1</span>
            <input type="range" min={0} max={m - 1} value={r1} onChange={(e) => setR1(+e.target.value)} />
            <span className="w-8 text-right font-mono">{rr1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10">c0</span>
            <input type="range" min={0} max={n - 1} value={c0} onChange={(e) => setC0(+e.target.value)} />
            <span className="w-8 text-right font-mono">{cc0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10">c1</span>
            <input type="range" min={0} max={n - 1} value={c1} onChange={(e) => setC1(+e.target.value)} />
            <span className="w-8 text-right font-mono">{cc1}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <MatrixHeatmap
          A={A}
          cell={24}
          showNumbers
          caption="A (select a block)"
          highlight={{ r0: rr0, r1: rr1, c0: cc0, c1: cc1 }}
        />

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-xs font-extrabold text-white/70">slice</div>
          <div className="mb-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/85">
            <span className="font-mono">{code}</span>
          </div>

          <MatrixHeatmap A={sub} cell={26} showNumbers caption="submatrix" />
        </div>
      </div>

      <div className="mt-3 text-xs text-white/60">
        Python slices are end-exclusive: stop index is one past the last included row/col.
      </div>
    </div>
  );
}
