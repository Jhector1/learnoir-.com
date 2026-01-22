// src/components/review/sketches/matricespart2/Mat2AugmentedRankSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, mat2MulVec2, rank, transpose, matmul, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "2"],
    ["2", "4"], // rank 1 by default; great for showing residual
  ];
}

function inv2(M: number[][]) {
  const a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return null;
  const s = 1 / det;
  return [
    [ d * s, -b * s],
    [-c * s,  a * s],
  ];
}

function vec2Dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

export default function Mat2AugmentedRankSketch({ heightClass = "h-[560px]" }: { heightClass?: string }) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;

  const [bUI, setBUI] = useState<{ x: number; y: number }>({ x: 2.0, y: 1.0 });

  // ranks
  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const Aug = useMemo(() => {
    return [
      [A[0][0], A[0][1], bUI.x],
      [A[1][0], A[1][1], bUI.y],
    ];
  }, [A, bUI]);
  const rAug = useMemo(() => rank(Aug, 1e-10), [Aug]);
  const inCol = rA === rAug;

  // best-fit x via normal equations if possible: x = (AᵀA)^{-1} Aᵀ b
  const { xHat, bHat, residual } = useMemo(() => {
    const b = { x: bUI.x, y: bUI.y };

    const At = transpose(A) as Mat;
    const AtA = matmul(At, A); // 2x2
    const inv = inv2(AtA);

    // Aᵀ b
    const Atb = {
      x: At[0][0] * b.x + At[0][1] * b.y,
      y: At[1][0] * b.x + At[1][1] * b.y,
    };

    let x = { x: 0, y: 0 };

    if (inv) {
      x = {
        x: inv[0][0] * Atb.x + inv[0][1] * Atb.y,
        y: inv[1][0] * Atb.x + inv[1][1] * Atb.y,
      };
    } else {
      // rank-deficient fallback: project onto span of first column
      const a1 = { x: A[0][0], y: A[1][0] };
      const denom = vec2Dot(a1, a1) || 1;
      const alpha = vec2Dot(a1, b) / denom;
      // choose x = [alpha, 0]
      x = { x: alpha, y: 0 };
    }

    const bh = mat2MulVec2(A, x);
    const r = { x: b.x - bh.x, y: b.y - bh.y };
    return { xHat: x, bHat: bh, residual: r };
  }, [A, bUI]);

  const resNorm = useMemo(() => Math.hypot(residual.x, residual.y), [residual]);

  const stateRef = useRef<VectorPadState>(
    {
      a: { x: bUI.x, y: bUI.y, z: 0 }, // b
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
      const o = origin();

      const drawArrow = (to: { x: number; y: number }, stroke: string, label: string) => {
        const p = worldToScreen2({ x: to.x, y: to.y, z: 0 });
        s.push();
        s.stroke(stroke);
        s.strokeWeight(4);
        s.line(o.x, o.y, p.x, p.y);
        s.noStroke();
        s.fill(stroke);
        s.textSize(12);
        s.text(label, p.x + 10, p.y);
        s.pop();
      };

      // show columns
      const col1: Vec3 = { x: A[0][0], y: A[1][0], z: 0 };
      const col2: Vec3 = { x: A[0][1], y: A[1][1], z: 0 };
      const c1 = worldToScreen2(col1);
      const c2 = worldToScreen2(col2);
      s.push();
      s.stroke("rgba(255,255,255,0.25)");
      s.strokeWeight(3);
      s.line(o.x, o.y, c1.x, c1.y);
      s.line(o.x, o.y, c2.x, c2.y);
      s.pop();

      // vectors: b, bHat, residual
      drawArrow(bUI, "rgba(255,255,255,0.80)", "b");
      drawArrow(bHat, "rgba(52,211,153,0.95)", "b̂=Ax̂");
      drawArrow(residual, "rgba(248,113,113,0.95)", "r=b-b̂");
    },
    [A, bUI, bHat, residual]
  );

  const det = useMemo(() => det2(A), [A]);

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
            <div className="text-xs font-extrabold text-white/70">Rank test</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
              <MathMarkdown content={String.raw`$\mathrm{rank}([\mathbf{A}\mid \mathbf{b}])=${rAug}$`} />
              <span
                className={[
                  "rounded-full px-2 py-1 text-xs font-extrabold",
                  inCol ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200",
                ].join(" ")}
              >
                {inCol ? "b in Col(A)" : "b not in Col(A)"}
              </span>
            </div>
            <div className="mt-2 text-xs text-white/60">
              If b adds a new direction, rank increases.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">Best-fit view</div>
            <div className="mt-2 text-sm text-white/80">
              <MathMarkdown content={String.raw`$\det(\mathbf{A})\approx ${det.toFixed(4)}$`} />
              <MathMarkdown content={String.raw`$\|\mathbf{r}\|=\|\mathbf{b}-\hat{\mathbf{b}}\|\approx ${resNorm.toFixed(4)}$`} />
              <MathMarkdown content={String.raw`$\hat{\mathbf{x}}\approx \begin{bmatrix}${xHat.x.toFixed(3)}\\ ${xHat.y.toFixed(3)}\end{bmatrix}$`} />
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-white/60">
          Drag <span className="font-mono text-white/85">b</span>. If{" "}
          <span className="font-mono text-white/85">‖r‖</span> goes to ~0, then{" "}
          <span className="font-mono text-white/85">b ∈ Col(A)</span>.
        </div>
      </div>

      <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}>
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: false }}
          visible={{ a: true, b: false }}
          onPreview={(a) => setBUI({ x: a.x, y: a.y })}
          onCommit={(a) => setBUI({ x: a.x, y: a.y })}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
