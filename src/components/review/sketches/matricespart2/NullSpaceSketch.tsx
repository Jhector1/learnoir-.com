
// src/components/review/sketches/matricespart2/Mat2NullspaceSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, mat2MulVec2, nullDir2, rank, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "-1"],
    ["-2", "2"], // has nullspace
  ];
}

export default function NullSpaceSketch({ heightClass = "h-[520px]" }: { heightClass?: string }) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);

  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;
  const tol = 1e-10;

  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 1.5, y: 1.0, z: 0 }, // y
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

  const [yUI, setYUI] = useState<{ x: number; y: number }>({ x: 1.5, y: 1.0 });
  const Ay = useMemo(() => mat2MulVec2(A, yUI), [A, yUI]);
  const err = useMemo(() => Math.hypot(Ay.x, Ay.y), [Ay]);

  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const det = useMemo(() => det2(A), [A]);
  const nd = useMemo(() => nullDir2(A, 1e-8), [A]);

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

      // Ay arrow
      const tip = worldToScreen2({ x: Ay.x, y: Ay.y, z: 0 });
      s.push();
      s.stroke("rgba(248,113,113,0.95)");
      s.strokeWeight(4);
      s.line(o.x, o.y, tip.x, tip.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(248,113,113,0.95)");
      s.textSize(12);
      s.text("Ay", tip.x + 10, tip.y);
      s.pop();

      // draw null direction line if exists
      if (nd) {
        const L = 1000;
        const pA = worldToScreen2({ x: -nd.x * L, y: -nd.y * L, z: 0 });
        const pB = worldToScreen2({ x: nd.x * L, y: nd.y * L, z: 0 });
        s.push();
        s.stroke("rgba(52,211,153,0.35)");
        s.strokeWeight(3);
        s.line(pA.x, pA.y, pB.x, pB.y);
        s.pop();

        s.push();
        s.noStroke();
        s.fill("rgba(52,211,153,0.85)");
        s.textSize(12);
        s.text("null direction", o.x + 10, o.y + 14);
        s.pop();
      }
    },
    [Ay, nd]
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
          <MathMarkdown content={String.raw`$\det(\mathbf{A})=${det.toFixed(4)}$`} />
          <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
          <MathMarkdown content={String.raw`$\|\mathbf{A}\mathbf{y}\|=${err.toFixed(4)}$`} />
          <span className="text-xs text-white/60">
            Try to drag <span className="font-mono text-white/85">y</span> so that{" "}
            <span className="font-mono text-white/85">Ay</span> becomes the zero vector.
          </span>
        </div>
      </div>

      <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}>
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: false }}
          visible={{ a: true, b: false }}
          onPreview={(a) => setYUI({ x: a.x, y: a.y })}
          onCommit={(a) => setYUI({ x: a.x, y: a.y })}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
