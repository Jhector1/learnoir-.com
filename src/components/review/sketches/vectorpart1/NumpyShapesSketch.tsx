"use client";

import React, { useMemo, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";

type Rep = "1d" | "row" | "col";

function shape(rep: Rep, n: number) {
  if (rep === "1d") return `(${n},)`;
  if (rep === "row") return `(1, ${n})`;
  return `(${n}, 1)`;
}

// limited “numpy-like” broadcasting demo for 1d/row/col
function addBroadcast(a: number[], aRep: Rep, b: number[], bRep: Rep) {
  const n = a.length;

  // normalize to 2D arrays for display
  const A =
    aRep === "col"
      ? a.map((x) => [x])
      : aRep === "row"
      ? [a]
      : [a]; // treat 1D as row for display; still track rep

  const B =
    bRep === "col"
      ? b.map((x) => [x])
      : bRep === "row"
      ? [b]
      : [b];

  // output rules:
  // - row + row => (1,n)
  // - col + col => (n,1)
  // - 1d + 1d => (n,) but show (1,n)
  // - row + col => (n,n)
  // - col + row => (n,n)
  // - 1d + col => (n,n)
  // - col + 1d => (n,n)
  // - 1d + row => (1,n)
  // - row + 1d => (1,n)

  const isRow = (r: Rep) => r === "row";
  const isCol = (r: Rep) => r === "col";
  const is1d = (r: Rep) => r === "1d";

  let out: number[][] = [];

  const makeNN = () => {
    out = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => a[i] + b[j])
    );
  };

  if ((isRow(aRep) || is1d(aRep)) && (isRow(bRep) || is1d(bRep))) {
    out = [a.map((x, i) => x + b[i])];
  } else if (isCol(aRep) && isCol(bRep)) {
    out = a.map((x, i) => [x + b[i]]);
  } else {
    // any mix involving a column with a row/1d becomes NxN for this demo
    makeNN();
  }

  return { A, B, out };
}

function Table({ M }: { M: number[][] }) {
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

export default function NumpyShapesSketch() {
  const n = 3;
  const a = [1, 2, 3];
  const b = [10, 20, 30];

  const [aRep, setARep] = useState<Rep>("row");
  const [bRep, setBRep] = useState<Rep>("col");

  const demo = useMemo(() => addBroadcast(a, aRep, b, bRep), [aRep, bRep]);

  const hud = useMemo(() => {
    const sA = shape(aRep, n);
    const sB = shape(bRep, n);

    // dot/outer “shape intuition” text
    const dotLine =
      aRep === "row" && bRep === "col"
        ? "row · col → scalar (1×1)"
        : aRep === "col" && bRep === "row"
        ? "col · row → matrix (outer product)"
        : "1D/1D often behaves like a dot (scalar), but shape details depend on how you store arrays.";

    return String.raw`
**NumPy shapes + orientation**

Choose how each vector is stored. Watch how the *shape* changes what the operation means.

- \(a\) representation: **${aRep}** → shape **${sA}**
- \(b\) representation: **${bRep}** → shape **${sB}**

**Broadcasting demo (addition)**  
When shapes differ, NumPy may “stretch” one side and produce a **matrix**.

**Dot/outer intuition**
- ${dotLine}

> This is why orientation can cause “weird” results: the code is doing valid array math, but not always the *vector* operation you intended.
`.trim();
  }, [aRep, bRep]);

  return (
    <div className="w-full">
      <div className="grid gap-3 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-extrabold text-white/70">a storage</div>
            {(["1d", "row", "col"] as Rep[]).map((r) => (
              <button
                key={r}
                onClick={() => setARep(r)}
                className={[
                  "rounded-xl border px-3 py-1 text-xs font-extrabold transition",
                  aRep === r
                    ? "border-sky-300/30 bg-sky-300/10 text-white/90"
                    : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10",
                ].join(" ")}
              >
                {r}
              </button>
            ))}

            <div className="ml-4 text-xs font-extrabold text-white/70">b storage</div>
            {(["1d", "row", "col"] as Rep[]).map((r) => (
              <button
                key={r}
                onClick={() => setBRep(r)}
                className={[
                  "rounded-xl border px-3 py-1 text-xs font-extrabold transition",
                  bRep === r
                    ? "border-rose-300/30 bg-rose-300/10 text-white/90"
                    : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10",
                ].join(" ")}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            <div className="text-xs font-extrabold text-white/70">a (shown as 2D)</div>
            <Table M={demo.A} />

            <div className="text-xs font-extrabold text-white/70">b (shown as 2D)</div>
            <Table M={demo.B} />

            <div className="text-xs font-extrabold text-white/70">a + b (broadcasted result)</div>
            <Table M={demo.out} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
        </div>
      </div>
    </div>
  );
}
