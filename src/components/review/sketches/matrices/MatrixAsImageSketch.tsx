"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { diag, eye, randnInt, tril, triu, zeros, type Mat } from "./matrix";

type Mode = "random" | "zeros" | "identity" | "diagonal" | "upper" | "lower";

export default function MatrixAsImageSketch() {
  const [mode, setMode] = useState<Mode>("random");
  const [m, setM] = useState(6);
  const [n, setN] = useState(9);

  const A: Mat = useMemo(() => {
    if (mode === "zeros") return zeros(m, n);
    if (mode === "random") return randnInt(m, n, -6, 6);

    const s = Math.min(m, n);
    if (mode === "identity") {
      const out = zeros(m, n);
      for (let i = 0; i < s; i++) out[i][i] = 1;
      return out;
    }
    if (mode === "diagonal") {
      const v = Array.from({ length: s }, (_, i) => (i % 2 ? -2 : 3));
      const D = diag(v);
      const out = zeros(m, n);
      for (let i = 0; i < s; i++) out[i][i] = D[i][i];
      return out;
    }
    if (mode === "upper") return triu(randnInt(m, n, -6, 6));
    if (mode === "lower") return tril(randnInt(m, n, -6, 6));
    return randnInt(m, n, -6, 6);
  }, [mode, m, n]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs font-extrabold text-white/70">view</div>
        {(["random", "zeros", "identity", "diagonal", "upper", "lower"] as Mode[]).map((k) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            className={[
              "rounded-xl border px-3 py-1 text-xs font-extrabold transition",
              mode === k
                ? "border-white/20 bg-white/10 text-white/90"
                : "border-white/10 bg-white/[0.05] text-white/75 hover:bg-white/[0.09]",
            ].join(" ")}
          >
            {k}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-xs text-white/70">
          <span>rows</span>
          <input type="range" min={2} max={12} value={m} onChange={(e) => setM(+e.target.value)} />
          <span className="w-6 text-right font-mono">{m}</span>

          <span className="ml-3">cols</span>
          <input type="range" min={2} max={12} value={n} onChange={(e) => setN(+e.target.value)} />
          <span className="w-6 text-right font-mono">{n}</span>
        </div>
      </div>

      <MatrixHeatmap A={A} cell={26} showNumbers />
      <div className="mt-3 text-xs text-white/60">
        Matrices become “images” when each entry is mapped to a color.
      </div>
    </div>
  );
}
