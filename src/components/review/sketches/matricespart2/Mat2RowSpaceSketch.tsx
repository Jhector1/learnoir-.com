// src/components/review/sketches/matricespart2/Mat2RowSpaceSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, rank, transpose, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "2"],
    ["2", "4"], // dependent rows -> row space is a line
  ];
}

export default function Mat2RowSpaceSketch({
  heightClass = "h-[520px]",
}: {
  heightClass?: string;
}) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;
  const AT = useMemo(() => transpose(A), [A]);

  const tol = 1e-10;

  // w is a test vector in R^2. w ∈ Row(A)  iff  w ∈ Col(A^T)
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 2, y: 1, z: 0 }, // w
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
  const [wUI, setWUI] = useState<{ x: number; y: number }>({ x: 2, y: 1 });
  const w = useMemo(() => ({ x: wUI.x, y: wUI.y }), [wUI]);

  // Augment A^T with w (as extra column) to do rank test for column space of A^T.
  const ATaug = useMemo(() => {
    return [
      [AT[0][0], AT[0][1], w.x],
      [AT[1][0], AT[1][1], w.y],
    ];
  }, [AT, w]);

  const rAT = useMemo(() => rank(AT, tol), [AT]);
  const rAug = useMemo(() => rank(ATaug, tol), [ATaug]);
  const inRow = rAT === rAug;

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

      // Row vectors live in R^2
      const r1: Vec3 = { x: A[0][0], y: A[0][1], z: 0 };
      const r2: Vec3 = { x: A[1][0], y: A[1][1], z: 0 };

      const p1 = worldToScreen2(r1);
      const p2 = worldToScreen2(r2);

      // span shading (rank 2 => whole plane; rank 1 => line)
      const full = Math.abs(det2(A)) > 1e-8;

      if (full) {
        // show a faint "basis parallelogram" for row span
        const q0 = o;
        const q1 = p1;
        const q3 = p2;
        const q2 = { x: p1.x + (p2.x - o.x), y: p1.y + (p2.y - o.y) };
        s.push();
        s.noStroke();
        s.fill("rgba(255,255,255,0.05)");
        s.beginShape();
        s.vertex(q0.x, q0.y);
        s.vertex(q1.x, q1.y);
        s.vertex(q2.x, q2.y);
        s.vertex(q3.x, q3.y);
        s.endShape(s.CLOSE);
        s.pop();
      } else {
        // line in direction of the dominant row
        const v =
          Math.hypot(r1.x, r1.y) >= Math.hypot(r2.x, r2.y) ? r1 : r2;
        const m = Math.hypot(v.x, v.y) || 1;
        const u = { x: v.x / m, y: v.y / m };

        const L = 1000;
        const a = worldToScreen2({ x: -u.x * L, y: -u.y * L, z: 0 });
        const b = worldToScreen2({ x: u.x * L, y: u.y * L, z: 0 });

        s.push();
        s.stroke("rgba(255,255,255,0.15)");
        s.strokeWeight(3);
        s.line(a.x, a.y, b.x, b.y);
        s.pop();
      }

      // draw row arrows
      s.push();
      s.stroke("rgba(255,255,255,0.30)");
      s.strokeWeight(3);
      s.line(o.x, o.y, p1.x, p1.y);
      s.line(o.x, o.y, p2.x, p2.y);
      s.pop();

      // labels
      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("r₁", p1.x + 10, p1.y);
      s.text("r₂", p2.x + 10, p2.y);
      s.pop();

      // membership badge
      s.push();
      s.noStroke();
      s.textSize(12);
      s.fill(inRow ? "rgba(52,211,153,0.95)" : "rgba(248,113,113,0.95)");
      s.text(inRow ? "w ∈ Row(A)" : "w ∉ Row(A)", o.x + 10, o.y - 12);
      s.pop();
    },
    [A, inRow]
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
          <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A}^T)=${rAT}$`} />
          <MathMarkdown content={String.raw`$\mathrm{rank}([\mathbf{A}^T\mid \mathbf{w}])=${rAug}$`} />
          <span
            className={[
              "rounded-full px-2 py-1 text-xs font-extrabold",
              inRow ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200",
            ].join(" ")}
          >
            {inRow ? "reachable by row combos" : "adds a new direction"}
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
          onPreview={(a) => setWUI({ x: a.x, y: a.y })}
          onCommit={(a) => setWUI({ x: a.x, y: a.y })}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 text-xs text-white/70">
        Drag <span className="font-mono text-white/85">w</span>. Row space is the span of the row vectors in{" "}
        <span className="font-mono text-white/85">R^2</span>. Membership is tested via{" "}
        <span className="font-mono text-white/85">w ∈ Col(A^T)</span>.
      </div>
    </div>
  );
}
