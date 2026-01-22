



// src/components/review/sketches/matricespart2/DeterminantSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "0.4"],
    ["0.2", "1"],
  ];
}

export default function DeterminantSketch({ heightClass = "h-[520px]" }: { heightClass?: string }) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;
  const det = useMemo(() => det2(A), [A]);

  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 0, y: 0, z: 0 },
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

      const e1: Vec3 = { x: A[0][0], y: A[1][0], z: 0 };
      const e2: Vec3 = { x: A[0][1], y: A[1][1], z: 0 };

      const p1 = worldToScreen2(e1);
      const p3 = worldToScreen2(e2);
      const p2 = { x: p1.x + (p3.x - o.x), y: p1.y + (p3.y - o.y) };

      const fill =
        Math.abs(det) < 1e-6
          ? "rgba(148,163,184,0.10)"
          : det > 0
          ? "rgba(52,211,153,0.10)"
          : "rgba(248,113,113,0.10)";

      s.push();
      s.noStroke();
      s.fill(fill);
      s.beginShape();
      s.vertex(o.x, o.y);
      s.vertex(p1.x, p1.y);
      s.vertex(p2.x, p2.y);
      s.vertex(p3.x, p3.y);
      s.endShape(s.CLOSE);
      s.pop();

      // edges
      s.push();
      s.stroke("rgba(255,255,255,0.30)");
      s.strokeWeight(3);
      s.line(o.x, o.y, p1.x, p1.y);
      s.line(o.x, o.y, p3.x, p3.y);
      s.line(p1.x, p1.y, p2.x, p2.y);
      s.line(p3.x, p3.y, p2.x, p2.y);
      s.pop();

      // labels
      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("A e₁", p1.x + 10, p1.y);
      s.text("A e₂", p3.x + 10, p3.y);
      s.pop();
    },
    [A, det]
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
          <MathMarkdown content={String.raw`$\text{Area scale}=|\det(\mathbf{A})|=${Math.abs(det).toFixed(4)}$`} />
        </div>
      </div>

      <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}>
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: false, b: false }}
          visible={{ a: false, b: false }}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
