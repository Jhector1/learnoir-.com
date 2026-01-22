// src/components/review/sketches/matricespart2/MatrixNormsSketch.tsx
"use client";

import React, { useMemo, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import { frob, gridToMat, matmul, sub, trace, transpose } from "@/lib/math/matrixLite";
import { seededGrid } from "@/lib/math/seededRng";

function randGridClient(r: number, c: number) {
  // safe because only called in click handlers (client)
  return Array.from({ length: r }, () =>
    Array.from({ length: c }, () => (Math.random() * 4 - 2).toFixed(2))
  );
}

export default function MatrixNormsSketch({ height = 420 }: { height?: number }) {
  const rows = 3;
  const cols = 3;

  // ✅ deterministic on server AND client hydration
  const [Agrid, setAgrid] = useState<string[][]>(() => seededGrid(rows, cols, "mat2.norms.A"));
  const [Bgrid, setBgrid] = useState<string[][]>(() => seededGrid(rows, cols, "mat2.norms.B"));

  const A = useMemo(() => gridToMat(Agrid), [Agrid]);
  const B = useMemo(() => gridToMat(Bgrid), [Bgrid]);

  const nA = useMemo(() => frob(A), [A]);
  const nB = useMemo(() => frob(B), [B]);
  const dAB = useMemo(() => frob(sub(A, B)), [A, B]);

  const nA_trace = useMemo(() => {
    const AtA = matmul(transpose(A), A);
    return Math.sqrt(Math.max(0, trace(AtA)));
  }, [A]);

  return (
    <div className="w-full p-4" style={{ height }}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <MatrixEntryInput
            labelLatex={String.raw`\mathbf{A}=`}
            rows={rows}
            cols={cols}
            value={Agrid}
            onChange={setAgrid}
          />
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\|\mathbf{A}\|_F \approx ${nA.toFixed(4)}$`} />
            <MathMarkdown
              content={String.raw`$\sqrt{\mathrm{tr}(\mathbf{A}^T\mathbf{A})} \approx ${nA_trace.toFixed(
                4
              )}$`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <MatrixEntryInput
            labelLatex={String.raw`\mathbf{B}=`}
            rows={rows}
            cols={cols}
            value={Bgrid}
            onChange={setBgrid}
          />
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\|\mathbf{B}\|_F \approx ${nB.toFixed(4)}$`} />
            <MathMarkdown content={String.raw`$\|\mathbf{A}-\mathbf{B}\|_F \approx ${dAB.toFixed(4)}$`} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setAgrid(randGridClient(rows, cols))}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          Random A
        </button>
        <button
          onClick={() => setBgrid(randGridClient(rows, cols))}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          Random B
        </button>
        <button
          onClick={() => setBgrid(Agrid.map((r) => r.slice()))}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          Set B = A
        </button>
      </div>
    </div>
  );
}
