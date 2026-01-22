


// src/components/review/sketches/matricespart2/RankToleranceSketch.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import { gridToMat, rank, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "2", "3"],
    ["2", "4", "6"],
    ["-1", "-2", "-3"], // rank 1-ish
  ];
}

function randNoise(r: number, c: number) {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => Math.random() * 2 - 1));
}

export default function RankToleranceSketch({ heightClass = "h-[420px]" }: { heightClass?: string }) {
  const rows = 3, cols = 3;

  const [A0grid, setA0grid] = useState<string[][]>(defaultA);
  const A0 = useMemo(() => gridToMat(A0grid), [A0grid]) as Mat;

  const noiseRef = useRef<number[][]>(randNoise(rows, cols));
  const [noise, setNoise] = useState(0.00);
  const [tol, setTol] = useState(1e-6);

  const A = useMemo(() => {
    const out: Mat = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        out[i][j] = A0[i][j] + noise * noiseRef.current[i][j];
      }
    }
    return out;
  }, [A0, noise]);

  const rEff = useMemo(() => rank(A, tol), [A, tol]);

  return (
    <div className={`w-full ${heightClass} overflow-auto p-4`}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <MatrixEntryInput
          labelLatex={String.raw`\mathbf{A}_0=`}
          rows={rows}
          cols={cols}
          value={A0grid}
          onChange={setA0grid}
          cellWidthClass="w-20"
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">Noise</div>
            <input
              className="mt-2 w-full"
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={noise}
              onChange={(e) => setNoise(Number(e.target.value))}
            />
            <div className="mt-2 text-xs text-white/70">noise = {noise.toFixed(2)}</div>
            <button
              onClick={() => (noiseRef.current = randNoise(rows, cols))}
              className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Regenerate noise
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">Tolerance</div>
            <input
              className="mt-2 w-full"
              type="range"
              min={-12}
              max={-1}
              step={0.5}
              value={Math.log10(tol)}
              onChange={(e) => setTol(Math.pow(10, Number(e.target.value)))}
            />
            <div className="mt-2 text-xs text-white/70">tol = {tol.toExponential(2)}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <MathMarkdown content={String.raw`$\mathrm{rank}_{\varepsilon}(\mathbf{A})=${rEff}$`} />
        <MathMarkdown
  className="text-xs text-white/60"
  content={String.raw`
Here $ \mathbf{A}=\mathbf{A}_0+\text{noise}\cdot\mathbf{N} $. Small noise can flip rank unless you use a tolerance.
`.trim()}
/>

        </div>
      </div>
    </div>
  );
}
