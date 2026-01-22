// src/components/review/sketches/matricespart2/Mat2LeftNullspaceSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { gridToMat, mat2MulVec2, nullDir2, rank, transpose, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "2"],
    ["2", "4"], // rank 1 -> nontrivial left null space
  ];
}

export default function Mat2LeftNullspaceSketch({
  heightClass = "h-[520px]",
}: {
  heightClass?: string;
}) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;
  const AT = useMemo(() => transpose(A), [A]);

  // z is draggable; we test A^T z = 0 (equivalently z^T A = 0)
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 1.2, y: -0.8, z: 0 }, // z
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

  const [zUI, setZUI] = useState<{ x: number; y: number }>({ x: 1.2, y: -0.8 });

  const ATz = useMemo(() => mat2MulVec2(AT, zUI), [AT, zUI]);
  const err = useMemo(() => Math.hypot(ATz.x, ATz.y), [ATz]);

  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const lnd = useMemo(() => nullDir2(AT, 1e-8), [AT]); // left-null direction

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

      // draw columns (for intuition: left-null is orthogonal to column space)
      const c1: Vec3 = { x: A[0][0], y: A[1][0], z: 0 };
      const c2: Vec3 = { x: A[0][1], y: A[1][1], z: 0 };
      const pC1 = worldToScreen2(c1);
      const pC2 = worldToScreen2(c2);

      s.push();
      s.stroke("rgba(255,255,255,0.25)");
      s.strokeWeight(3);
      s.line(o.x, o.y, pC1.x, pC1.y);
      s.line(o.x, o.y, pC2.x, pC2.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.7)");
      s.textSize(12);
      s.text("a₁", pC1.x + 10, pC1.y);
      s.text("a₂", pC2.x + 10, pC2.y);
      s.pop();

      // draw A^T z arrow (want it to be ~0)
      const tip = worldToScreen2({ x: ATz.x, y: ATz.y, z: 0 });
      s.push();
      s.stroke("rgba(248,113,113,0.95)");
      s.strokeWeight(4);
      s.line(o.x, o.y, tip.x, tip.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(248,113,113,0.95)");
      s.textSize(12);
      s.text("Aᵀz", tip.x + 10, tip.y);
      s.pop();

      // draw left-null direction line if exists
      if (lnd) {
        const L = 1000;
        const a = worldToScreen2({ x: -lnd.x * L, y: -lnd.y * L, z: 0 });
        const b = worldToScreen2({ x: lnd.x * L, y: lnd.y * L, z: 0 });

        s.push();
        s.stroke("rgba(52,211,153,0.35)");
        s.strokeWeight(3);
        s.line(a.x, a.y, b.x, b.y);
        s.pop();

        s.push();
        s.noStroke();
        s.fill("rgba(52,211,153,0.85)");
        s.textSize(12);
        s.text("left-null direction", o.x + 10, o.y + 14);
        s.pop();
      }
    },
    [A, ATz, lnd]
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
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
          <MathMarkdown content={String.raw`$\|\mathbf{A}^T\mathbf{z}\|=${err.toFixed(4)}$`} />
          <span className="text-xs text-white/60">
            Drag <span className="font-mono text-white/85">z</span> so{" "}
            <span className="font-mono text-white/85">Aᵀz</span> becomes the zero vector.
          </span>
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
          onPreview={(a) => setZUI({ x: a.x, y: a.y })}
          onCommit={(a) => setZUI({ x: a.x, y: a.y })}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
