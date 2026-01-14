"use client";

import React, { useMemo, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";

function hadamard(a: number[], b: number[]) {
  if (a.length !== b.length) return null;
  return a.map((x, i) => x * b[i]);
}

function outer(a: number[], b: number[]) {
  return a.map((ai) => b.map((bj) => ai * bj));
}

function Table1D({ v }: { v: number[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/30">
      <div className="flex">
        {v.map((x, i) => (
          <div
            key={i}
            className="border-r border-white/5 px-3 py-2 text-xs text-white/80 tabular-nums last:border-r-0"
          >
            {x}
          </div>
        ))}
      </div>
    </div>
  );
}

function Table2D({ M }: { M: number[][] }) {
  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/30">
      <table className="w-full text-xs">
        <tbody>
          {M.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-b-0">
              {row.map((v, j) => (
                <td key={j} className="px-3 py-2 text-white/80 tabular-nums">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HadamardOuterSketch() {
  const [a, setA] = useState([5, 4, 8, 2]);
  const [b, setB] = useState([1, 0, 2, -1]);

  const h = useMemo(() => hadamard(a, b), [a, b]);
  const o = useMemo(() => outer(a, b), [a, b]);

  const hud = useMemo(() => {
    const ok = a.length === b.length;

    return String.raw`
**Other vector multiplications**

### Hadamard (element-wise)
$$
\mathbf{a}\odot\mathbf{b}=(a_1b_1,\ a_2b_2,\ \dots)
$$

- Only valid when lengths match.  
- Here: **${ok ? "defined ✅" : "undefined ❌ (length mismatch)"}**

### Outer product
$$
\mathbf{a}\mathbf{b}^T
$$

- Always produces a **matrix** of size $\text{len}(a)\times\text{len}(b)$.  
- Useful for building rank-1 matrices and for understanding $\text{col}\cdot\text{row}$.

Try editing values below and watch how outputs change.
`.trim();
  }, [a.length, b.length]);

  const setAi = (i: number, val: number) =>
    setA((prev) => prev.map((x, k) => (k === i ? val : x)));
  const setBi = (i: number, val: number) =>
    setB((prev) => prev.map((x, k) => (k === i ? val : x)));

  return (
    <div className="w-full">
      <div className="grid gap-3 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-4">
            <div>
              <div className="mb-2 text-xs font-extrabold text-white/70">a</div>
              <div className="flex flex-wrap gap-2">
                {a.map((x, i) => (
                  <input
                    key={i}
                    type="number"
                    value={x}
                    onChange={(e) => setAi(i, Number(e.target.value))}
                    className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-extrabold text-white/90 outline-none"
                  />
                ))}
              </div>
              <div className="mt-2">
                <Table1D v={a} />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-extrabold text-white/70">b</div>
              <div className="flex flex-wrap gap-2">
                {b.map((x, i) => (
                  <input
                    key={i}
                    type="number"
                    value={x}
                    onChange={(e) => setBi(i, Number(e.target.value))}
                    className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-extrabold text-white/90 outline-none"
                  />
                ))}
              </div>
              <div className="mt-2">
                <Table1D v={b} />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-extrabold text-white/70">
                Hadamard a ⊙ b
              </div>
              {h ? (
                <Table1D v={h} />
              ) : (
                <div className="text-xs text-rose-200/80">
                  Lengths must match.
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-extrabold text-white/70">
                Outer a bᵀ
              </div>
              <Table2D M={o} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown
            className="text-sm text-white/80 [&_.katex]:text-white/90"
            content={hud}
          />
        </div>
      </div>
    </div>
  );
}
