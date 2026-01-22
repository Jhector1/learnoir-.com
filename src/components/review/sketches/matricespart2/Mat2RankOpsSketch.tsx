// src/components/review/sketches/matricespart2/Mat2RankOpsSketch.tsx
"use client";

import React, { useMemo, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import { det2, gridToMat, matmul, rank, type Mat } from "@/lib/math/matrixLite";
import { seededGrid } from "@/lib/math/seededRng";

function randGridClient(r: number, c: number) {
  return Array.from({ length: r }, () =>
    Array.from({ length: c }, () => (Math.random() * 4 - 2).toFixed(2))
  );
}

// Construct a rank-1 matrix by outer product u v^T
function rank1Grid(): string[][] {
  const u = [Math.random() * 3 - 1.5, Math.random() * 3 - 1.5];
  const v = [Math.random() * 3 - 1.5, Math.random() * 3 - 1.5];
  const A = [
    [u[0] * v[0], u[0] * v[1]],
    [u[1] * v[0], u[1] * v[1]],
  ];
  return A.map((row) => row.map((x) => x.toFixed(2)));
}

export default function Mat2RankOpsSketch({ height = 520 }: { height?: number }) {
  const rows = 2, cols = 2;

  const [Agrid, setAgrid] = useState<string[][]>(() => seededGrid(rows, cols, "mat2.rankops.A"));
  const [Bgrid, setBgrid] = useState<string[][]>(() => seededGrid(rows, cols, "mat2.rankops.B"));

  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;
  const B = useMemo(() => gridToMat(Bgrid), [Bgrid]) as Mat;

  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const rB = useMemo(() => rank(B, 1e-10), [B]);

  const AplusB = useMemo(() => {
    return [
      [A[0][0] + B[0][0], A[0][1] + B[0][1]],
      [A[1][0] + B[1][0], A[1][1] + B[1][1]],
    ];
  }, [A, B]);

  const AB = useMemo(() => matmul(A, B) as Mat, [A, B]);

  const rSum = useMemo(() => rank(AplusB, 1e-10), [AplusB]);
  const rProd = useMemo(() => rank(AB, 1e-10), [AB]);

  const boundSum = rA + rB;
  const boundProd = Math.min(rA, rB);

  const detA = useMemo(() => det2(A), [A]);
  const detB = useMemo(() => det2(B), [B]);

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
            cellWidthClass="w-20"
          />
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
            <MathMarkdown content={String.raw`$\det(\mathbf{A})=${detA.toFixed(4)}$`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setAgrid(randGridClient(rows, cols))}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Random A
            </button>
            <button
              onClick={() => setAgrid(rank1Grid())}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Make A rank-1
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <MatrixEntryInput
            labelLatex={String.raw`\mathbf{B}=`}
            rows={rows}
            cols={cols}
            value={Bgrid}
            onChange={setBgrid}
            cellWidthClass="w-20"
          />
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{B})=${rB}$`} />
            <MathMarkdown content={String.raw`$\det(\mathbf{B})=${detB.toFixed(4)}$`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setBgrid(randGridClient(rows, cols))}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Random B
            </button>
            <button
              onClick={() => setBgrid(rank1Grid())}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Make B rank-1
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-extrabold text-white/70">Sum</div>
          <div className="mt-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A}+\mathbf{B})=${rSum}$`} />
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A}+\mathbf{B})\le \mathrm{rank}(\mathbf{A})+\mathrm{rank}(\mathbf{B})=${boundSum}$`} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-extrabold text-white/70">Product</div>
          <div className="mt-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A}\mathbf{B})=${rProd}$`} />
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A}\mathbf{B})\le \min(\mathrm{rank}(\mathbf{A}),\mathrm{rank}(\mathbf{B}))=${boundProd}$`} />
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-white/60">
        Key idea: bounds help, but they don’t uniquely determine the rank. Try making both A and B rank-1, then tweak entries and watch how rank(A+B) changes.
      </div>
    </div>
  );
}
