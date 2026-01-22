


// src/components/review/sketches/matricespart2/CharacteristicPolynomialSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, mat2MulVec2, subLambdaI2, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "3"],
    ["3", "1"],
  ];
}

export default function CharacteristicPolynomialSketch({ heightClass = "h-[560px]" }: { heightClass?: string }) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;

  const [lam, setLam] = useState(0);

  // v is draggable
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 1.4, y: 0.6, z: 0 }, // v
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

  const [vUI, setVUI] = useState<{ x: number; y: number }>({ x: 1.4, y: 0.6 });
  const Av = useMemo(() => mat2MulVec2(A, vUI), [A, vUI]);
  const lv = useMemo(() => ({ x: lam * vUI.x, y: lam * vUI.y }), [lam, vUI]);
  const diff = useMemo(() => ({ x: Av.x - lv.x, y: Av.y - lv.y }), [Av, lv]);
  const diffNorm = useMemo(() => Math.hypot(diff.x, diff.y), [diff]);

  const detShift = useMemo(() => det2(subLambdaI2(A, lam)), [A, lam]);

  // eigenvalues for 2x2: λ^2 - tr(A)λ + det(A)=0
  const eig = useMemo(() => {
    const tr = A[0][0] + A[1][1];
    const det = det2(A);
    const disc = tr * tr - 4 * det;
    if (disc < 0) return { tr, det, disc, real: false as const, l1: NaN, l2: NaN };
    const s = Math.sqrt(disc);
    return { tr, det, disc, real: true as const, l1: (tr + s) / 2, l2: (tr - s) / 2 };
  }, [A]);

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

      drawArrow(Av, "rgba(255,255,255,0.75)", "Av");
      drawArrow(lv, "rgba(52,211,153,0.95)", "λv");
      drawArrow(diff, "rgba(248,113,113,0.95)", "Av-λv");
    },
    [Av, lv, diff]
  );

  const nearEigen =
    eig.real && (Math.abs(lam - eig.l1) < 0.15 || Math.abs(lam - eig.l2) < 0.15);

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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">λ</div>
            <input
              className="mt-2 w-full"
              type="range"
              min={-6}
              max={6}
              step={0.05}
              value={lam}
              onChange={(e) => setLam(Number(e.target.value))}
            />
            <div className="mt-2 text-xs text-white/70">λ = {lam.toFixed(2)}</div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <MathMarkdown content={String.raw`$\det(\mathbf{A}-\lambda\mathbf{I})=${detShift.toFixed(4)}$`} />
              <span
                className={[
                  "rounded-full px-2 py-1 text-xs font-extrabold",
                  nearEigen ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/70",
                ].join(" ")}
              >
                {nearEigen ? "near eigenvalue" : "scan λ"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold text-white/70">Eigenvalue preview (2×2)</div>
            <div className="mt-2 text-xs text-white/70">
              Drag <span className="font-mono text-white/85">v</span>. If{" "}
              <span className="font-mono text-white/85">Av ≈ λv</span>, then{" "}
              <span className="font-mono text-white/85">‖Av−λv‖</span> is small.
            </div>
            <div className="mt-2 text-sm text-white/80">
              <MathMarkdown content={String.raw`$\|\mathbf{A}\mathbf{v}-\lambda\mathbf{v}\| \approx ${diffNorm.toFixed(4)}$`} />
              {eig.real ? (
                <MathMarkdown
                  content={String.raw`$\lambda_1\approx ${eig.l1.toFixed(3)},\quad \lambda_2\approx ${eig.l2.toFixed(3)}$`}
                />
              ) : (
                <MathMarkdown content={String.raw`$\text{Discriminant}<0 \Rightarrow \text{complex eigenvalues}$`} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}>
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: false }}
          visible={{ a: true, b: false }}
          onPreview={(a) => setVUI({ x: a.x, y: a.y })}
          onCommit={(a) => setVUI({ x: a.x, y: a.y })}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
