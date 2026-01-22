// src/components/review/sketches/matricespart2/AugmentedRankProofSketch.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, rank, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "2"],
    ["2", "4"], // rank 1 so membership varies nicely
  ];
}

function dot2(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

type SolveInfo =
  | {
      mode: "unique";
      x1: number;
      x2: number;
      Ax: { x: number; y: number };
      resNorm: number;
      a1: { x: number; y: number };
      a2: { x: number; y: number };
    }
  | {
      mode: "projection";
      alpha: number;
      proj: { x: number; y: number };
      resNorm: number;
      a1: { x: number; y: number };
      a2: { x: number; y: number };
    };

function computeRanks(A: Mat, b: { x: number; y: number }, tol: number) {
  const Aaug = [
    [A[0][0], A[0][1], b.x],
    [A[1][0], A[1][1], b.y],
  ];
  const rA = rank(A, tol);
  const rAug = rank(Aaug, tol);
  return { rA, rAug, inCol: rA === rAug };
}

function computeSolveInfo(A: Mat, b: { x: number; y: number }, det: number): SolveInfo {
  const a1 = { x: A[0][0], y: A[1][0] };
  const a2 = { x: A[0][1], y: A[1][1] };

  if (Math.abs(det) > 1e-8) {
    const inv = [
      [A[1][1] / det, -A[0][1] / det],
      [-A[1][0] / det, A[0][0] / det],
    ];
    const x1 = inv[0][0] * b.x + inv[0][1] * b.y;
    const x2 = inv[1][0] * b.x + inv[1][1] * b.y;

    const Ax = {
      x: A[0][0] * x1 + A[0][1] * x2,
      y: A[1][0] * x1 + A[1][1] * x2,
    };
    const res = { x: Ax.x - b.x, y: Ax.y - b.y };

    return {
      mode: "unique",
      x1,
      x2,
      Ax,
      resNorm: Math.hypot(res.x, res.y),
      a1,
      a2,
    };
  }

  const v = Math.hypot(a1.x, a1.y) >= Math.hypot(a2.x, a2.y) ? a1 : a2;
  const denom = dot2(v, v) || 1;
  const alpha = dot2(v, b) / denom;
  const proj = { x: alpha * v.x, y: alpha * v.y };
  const res = { x: proj.x - b.x, y: proj.y - b.y };

  return {
    mode: "projection",
    alpha,
    proj,
    resNorm: Math.hypot(res.x, res.y),
    a1,
    a2,
  };
}

export default function AugmentedRankProofSketch({
  heightClass = "h-[520px]",
}: {
  heightClass?: string;
}) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;
  const tol = 1e-10;

  // b is draggable (target vector); VectorPad handle "a" is treated as b
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 2, y: 1, z: 0 }, // b
      b: { x: 0, y: 0, z: 0 },
      scale: 46,
      showGrid: true,
      snapToGrid: true,
      gridStep: 1,
      autoGridStep: false,
      showComponents: false,
      showAngle: false,
      showProjection: false,
      showPerp: false,
      showUnitB: false,
      depthMode: false,
    } as unknown as VectorPadState
  );
  const zHeldRef = useRef(false);

  // committed b (updates text cards)
  const [bUI, setBUI] = useState<{ x: number; y: number }>({ x: 2, y: 1 });
  const b = useMemo(() => ({ x: bUI.x, y: bUI.y }), [bUI]);

  // computed for cards (committed)
  const det = useMemo(() => det2(A), [A]);

  const { rA, rAug, inCol } = useMemo(() => computeRanks(A, b, tol), [A, b, tol]);

  const solveInfo = useMemo(() => computeSolveInfo(A, b, det), [A, b, det]);

  // ---- Stable overlay + live drag math (no rerenders) ----
  const ARef = useRef<Mat>(A);
  const detRef = useRef<number>(det);
  const inColRef = useRef<boolean>(inCol);
  const solveInfoRef = useRef<SolveInfo>(solveInfo);
  const bLiveRef = useRef<{ x: number; y: number }>({ x: bUI.x, y: bUI.y });

  // keep refs synced; also recompute live derived refs when A changes
  useEffect(() => {
    ARef.current = A;
    detRef.current = det2(A);

    // recompute overlay state against current live b
    const bNow = bLiveRef.current;
    const ranks = computeRanks(ARef.current, bNow, tol);
    inColRef.current = ranks.inCol;
    solveInfoRef.current = computeSolveInfo(ARef.current, bNow, detRef.current);
  }, [A, tol]);

  // also sync live refs with committed state (initial + commits)
  useEffect(() => {
    detRef.current = det;
  }, [det]);
  useEffect(() => {
    inColRef.current = inCol;
  }, [inCol]);
  useEffect(() => {
    solveInfoRef.current = solveInfo;
  }, [solveInfo]);

  const overlay2D = useCallback(
    ({
      s,
      origin,
      worldToScreen2,
    }: {
      s: any;
      W: number;
      H: number;
      origin: () => { x: number; y: number };
      worldToScreen2: (v: Vec3) => { x: number; y: number };
    }) => {
      const A = ARef.current;
      const det = detRef.current;
      const inCol = inColRef.current;
      const solveInfo = solveInfoRef.current;

      const o = origin();

      const a1: Vec3 = { x: A[0][0], y: A[1][0], z: 0 };
      const a2: Vec3 = { x: A[0][1], y: A[1][1], z: 0 };
      const pa1 = worldToScreen2(a1);
      const pa2 = worldToScreen2(a2);

      const full = Math.abs(det) > 1e-8;

      // background span
      if (full) {
        const p0 = o;
        const p1 = pa1;
        const p3 = pa2;
        const p2 = { x: pa1.x + (pa2.x - o.x), y: pa1.y + (pa2.y - o.y) };
        s.push();
        s.noStroke();
        s.fill("rgba(255,255,255,0.05)");
        s.beginShape();
        s.vertex(p0.x, p0.y);
        s.vertex(p1.x, p1.y);
        s.vertex(p2.x, p2.y);
        s.vertex(p3.x, p3.y);
        s.endShape(s.CLOSE);
        s.pop();
      } else {
        const v =
          Math.hypot(a1.x, a1.y) >= Math.hypot(a2.x, a2.y) ? a1 : a2;
        const m = Math.hypot(v.x, v.y) || 1;
        const u = { x: v.x / m, y: v.y / m };
        const L = 1000;
        const pA = worldToScreen2({ x: -u.x * L, y: -u.y * L, z: 0 });
        const pB = worldToScreen2({ x: u.x * L, y: u.y * L, z: 0 });

        s.push();
        s.stroke("rgba(255,255,255,0.15)");
        s.strokeWeight(3);
        s.line(pA.x, pA.y, pB.x, pB.y);
        s.pop();
      }

      // columns
      s.push();
      s.stroke("rgba(255,255,255,0.30)");
      s.strokeWeight(3);
      s.line(o.x, o.y, pa1.x, pa1.y);
      s.line(o.x, o.y, pa2.x, pa2.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("a₁", pa1.x + 10, pa1.y);
      s.text("a₂", pa2.x + 10, pa2.y);
      s.pop();

      // membership text (live)
      s.push();
      s.noStroke();
      s.textSize(12);
      s.fill(inCol ? "rgba(52,211,153,0.95)" : "rgba(248,113,113,0.95)");
      s.text(
        inCol ? "rank stays same ⇒ b ∈ Col(A)" : "rank jumps ⇒ b ∉ Col(A)",
        o.x + 10,
        o.y - 12
      );
      s.pop();

      // projection arrow (live)
      if (solveInfo.mode === "projection") {
        const p = worldToScreen2({ x: solveInfo.proj.x, y: solveInfo.proj.y, z: 0 });
        s.push();
        s.stroke("rgba(52,211,153,0.85)");
        s.strokeWeight(4);
        s.line(o.x, o.y, p.x, p.y);
        s.pop();

        s.push();
        s.noStroke();
        s.fill("rgba(52,211,153,0.85)");
        s.textSize(12);
        s.text("proj(b)", p.x + 10, p.y);
        s.pop();
      }
    },
    []
  );

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <MatrixEntryInput
          labelLatex={String.raw`\mathbf{A}=`}
          rows={2}
          cols={2}
          value={Agrid}
          onChange={setAgrid}
          cellWidthClass="w-20"
        />

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">Augmented rank test</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
              <MathMarkdown content={String.raw`$\mathrm{rank}([\mathbf{A}\mid \mathbf{b}])=${rAug}$`} />
              <span
                className={[
                  "rounded-full px-2 py-1 text-xs font-extrabold",
                  inCol ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200",
                ].join(" ")}
              >
                {inCol ? "b is in the span" : "b adds new info"}
              </span>
            </div>
            <div className="mt-2 text-xs text-white/60">
              If <span className="font-mono text-white/85">b</span> is a combo of columns, it’s redundant → rank doesn’t change.
              Otherwise it forces a new independent column → rank increases.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">Residual intuition</div>
            {solveInfo.mode === "unique" ? (
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <MathMarkdown
                  content={String.raw`$\det(\mathbf{A})=${det.toFixed(4)}\neq 0\Rightarrow \text{unique solution}$`}
                />
                <MathMarkdown
                  content={String.raw`$\mathbf{x}\approx \begin{bmatrix}${solveInfo.x1.toFixed(
                    3
                  )}\\ ${solveInfo.x2.toFixed(3)}\end{bmatrix}$`}
                />
                <MathMarkdown
                  content={String.raw`$\|\mathbf{A}\mathbf{x}-\mathbf{b}\|\approx ${solveInfo.resNorm.toFixed(
                    6
                  )}$`}
                />
              </div>
            ) : (
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <MathMarkdown
                  content={String.raw`$\det(\mathbf{A})\approx 0\Rightarrow \text{no unique solution}$`}
                />
                <MathMarkdown
                  content={String.raw`$\mathrm{proj}(\mathbf{b})=\alpha \mathbf{v},\ \alpha\approx ${solveInfo.alpha.toFixed(
                    3
                  )}$`}
                />
                <MathMarkdown
                  content={String.raw`$\|\mathrm{proj}(\mathbf{b})-\mathbf{b}\|\approx ${solveInfo.resNorm.toFixed(
                    4
                  )}$`}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}
      >
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: false }}
          visible={{ a: true, b: false }}
          onPreview={(a) => {
            // ✅ live overlay updates without rerender
            const bNow = { x: a.x, y: a.y };
            bLiveRef.current = bNow;

            const ANow = ARef.current;
            const detNow = detRef.current; // already synced from A changes
            const ranks = computeRanks(ANow, bNow, tol);
            inColRef.current = ranks.inCol;

            // projection/unique arrow follows live b
            solveInfoRef.current = computeSolveInfo(ANow, bNow, detNow);
          }}
          onCommit={(a) => {
            // ✅ update cards once on release
            setBUI({ x: a.x, y: a.y });

            const bNow = { x: a.x, y: a.y };
            bLiveRef.current = bNow;

            const ANow = ARef.current;
            const detNow = detRef.current;
            const ranks = computeRanks(ANow, bNow, tol);
            inColRef.current = ranks.inCol;
            solveInfoRef.current = computeSolveInfo(ANow, bNow, detNow);
          }}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 text-xs text-white/70">
        Drag <span className="font-mono text-white/85">b</span>. Watch{" "}
        <span className="font-mono text-white/85">rank(A)</span> vs{" "}
        <span className="font-mono text-white/85">rank([A|b])</span>.
      </div>
    </div>
  );
}
