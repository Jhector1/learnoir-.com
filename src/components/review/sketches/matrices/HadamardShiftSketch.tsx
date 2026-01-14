"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { add, eye, hadamard, randnInt, scale } from "./matrix";

type Tab = "hadamard" | "shift";

export default function HadamardShiftSketch() {
  const [tab, setTab] = useState<Tab>("hadamard");
  const [n, setN] = useState(5);
  const [lam, setLam] = useState(2);

  const A = useMemo(() => randnInt(n, n, -4, 4), [n]);
  const B = useMemo(() => randnInt(n, n, -4, 4), [n]);
  const H = useMemo(() => hadamard(A, B), [A, B]);
  const shifted = useMemo(() => add(A, scale(eye(n), lam)), [A, n, lam]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["hadamard", "shift"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "rounded-xl border px-3 py-1 text-xs font-extrabold transition",
              tab === t
                ? "border-white/20 bg-white/10 text-white/90"
                : "border-white/10 bg-white/[0.05] text-white/75 hover:bg-white/[0.09]",
            ].join(" ")}
          >
            {t}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-xs text-white/70">
          <span>n</span>
          <input type="range" min={2} max={8} value={n} onChange={(e) => setN(+e.target.value)} />
          <span className="w-6 text-right font-mono">{n}</span>
        </div>
      </div>

      {tab === "hadamard" ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <MatrixHeatmap A={A} cell={24} showNumbers caption="A" />
          <MatrixHeatmap A={B} cell={24} showNumbers caption="B" />
          <MatrixHeatmap A={H} cell={24} showNumbers caption="A ⊙ B (element-wise)" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <MatrixHeatmap A={A} cell={24} showNumbers caption="A" />
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-xs font-extrabold text-white/70">A + λI (shift)</div>
            <div className="mb-3 flex items-center gap-2 text-xs text-white/70">
              <span>λ</span>
              <input type="range" min={-6} max={6} step={1} value={lam} onChange={(e) => setLam(+e.target.value)} />
              <span className="w-8 text-right font-mono">{lam}</span>
              <span className="ml-auto text-white/60">only diagonal changes</span>
            </div>
            <MatrixHeatmap A={shifted} cell={24} showNumbers caption="shifted matrix" />
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-white/60">
        In NumPy: <span className="font-mono">A*B</span> is Hadamard; <span className="font-mono">A@B</span> is matrix multiplication.
      </div>
    </div>
  );
}
