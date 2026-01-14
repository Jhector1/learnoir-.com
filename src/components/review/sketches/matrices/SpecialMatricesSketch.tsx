"use client";

import React, { useMemo, useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { diag, eye, randnInt, tril, triu, zeros, type Mat } from "./matrix";

type Kind = "identity" | "zeros" | "diagonal" | "upper" | "lower" | "random";

export default function SpecialMatricesSketch() {
  const [kind, setKind] = useState<Kind>("identity");
  const [n, setN] = useState(6);
  const [m, setM] = useState(5);

  const A: Mat = useMemo(() => {
    if (kind === "identity") return eye(n);
    if (kind === "diagonal") return diag(Array.from({ length: n }, (_, i) => (i % 2 ? -2 : 3)));
    if (kind === "upper") return triu(randnInt(n, n, -6, 6));
    if (kind === "lower") return tril(randnInt(n, n, -6, 6));
    if (kind === "zeros") return zeros(m, n);
    return randnInt(m, n, -6, 6);
  }, [kind, n, m]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs font-extrabold text-white/70">type</div>
        {(["identity", "zeros", "diagonal", "upper", "lower", "random"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={[
              "rounded-xl border px-3 py-1 text-xs font-extrabold transition",
              kind === k
                ? "border-white/20 bg-white/10 text-white/90"
                : "border-white/10 bg-white/[0.05] text-white/75 hover:bg-white/[0.09]",
            ].join(" ")}
          >
            {k}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-xs text-white/70">
          <span>{kind === "zeros" || kind === "random" ? "rows" : "n"}</span>
          <input
            type="range"
            min={2}
            max={10}
            value={kind === "zeros" || kind === "random" ? m : n}
            onChange={(e) =>
              kind === "zeros" || kind === "random" ? setM(+e.target.value) : setN(+e.target.value)
            }
          />
          <span className="w-6 text-right font-mono">
            {kind === "zeros" || kind === "random" ? m : n}
          </span>

          {(kind === "zeros" || kind === "random") && (
            <>
              <span className="ml-3">cols</span>
              <input type="range" min={2} max={10} value={n} onChange={(e) => setN(+e.target.value)} />
              <span className="w-6 text-right font-mono">{n}</span>
            </>
          )}
        </div>
      </div>

      <MatrixHeatmap A={A} cell={26} showNumbers />
      <div className="mt-3 text-xs text-white/60">
        Watch how diagonal/triangular structure becomes obvious in the picture.
      </div>
    </div>
  );
}
