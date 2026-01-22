// src/components/review/sketches/matricespart2/LinearIndependenceRankSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, rank, type Mat } from "@/lib/math/matrixLite";

export default function LinearIndependenceRankSketch({
  heightClass = "h-[520px]",
}: {
  heightClass?: string;
}) {
  // a and b are draggable column vectors in R^2
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 1.2, y: 0.4, z: 0 }, // v1
      b: { x: 0.6, y: 1.1, z: 0 }, // v2
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

  const [v1, setV1] = useState<{ x: number; y: number }>({ x: 1.2, y: 0.4 });
  const [v2, setV2] = useState<{ x: number; y: number }>({ x: 0.6, y: 1.1 });

  const A = useMemo<Mat>(
    () => [
      [v1.x, v2.x],
      [v1.y, v2.y],
    ],
    [v1, v2]
  );

  const det = useMemo(() => det2(A), [A]);
  const r = useMemo(() => rank(A, 1e-10), [A]);
  const independent = r === 2;

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
      const c1 = worldToScreen2({ x: v1.x, y: v1.y, z: 0 });
      const c2 = worldToScreen2({ x: v2.x, y: v2.y, z: 0 });

      // parallelogram area indicator
      const p2 = { x: c1.x + (c2.x - o.x), y: c1.y + (c2.y - o.y) };

      s.push();
      s.noStroke();
      s.fill(independent ? "rgba(52,211,153,0.10)" : "rgba(148,163,184,0.08)");
      s.beginShape();
      s.vertex(o.x, o.y);
      s.vertex(c1.x, c1.y);
      s.vertex(p2.x, p2.y);
      s.vertex(c2.x, c2.y);
      s.endShape(s.CLOSE);
      s.pop();

      // arrows
      s.push();
      s.stroke("rgba(255,255,255,0.35)");
      s.strokeWeight(4);
      s.line(o.x, o.y, c1.x, c1.y);
      s.line(o.x, o.y, c2.x, c2.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("v₁", c1.x + 10, c1.y);
      s.text("v₂", c2.x + 10, c2.y);
      s.pop();

      // status
      s.push();
      s.noStroke();
      s.textSize(12);
      s.fill(independent ? "rgba(52,211,153,0.95)" : "rgba(248,113,113,0.95)");
      s.text(
        independent ? "independent (rank=2)" : "dependent (rank<2)",
        o.x + 10,
        o.y - 12
      );
      s.pop();
    },
    [v1, v2, independent]
  );

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-xs font-extrabold text-white/70">
          Build A = [v₁ v₂] and test linear independence using rank
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <MathMarkdown content={String.raw`$\mathbf{A}=\begin{bmatrix}${v1.x.toFixed(2)} & ${v2.x.toFixed(2)}\\ ${v1.y.toFixed(2)} & ${v2.y.toFixed(2)}\end{bmatrix}$`} />
          <MathMarkdown content={String.raw`$\det(\mathbf{A})=${det.toFixed(4)}$`} />
          <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${r}$`} />
          <span
            className={[
              "rounded-full px-2 py-1 text-xs font-extrabold",
              independent ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200",
            ].join(" ")}
          >
            {independent ? "span is 2D" : "span collapses to a line"}
          </span>
        </div>
        <div className="mt-2 text-xs text-white/60">
          Drag <span className="font-mono text-white/85">v₁</span> and{" "}
          <span className="font-mono text-white/85">v₂</span>. If they become collinear, rank drops.
        </div>
      </div>

      <div
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}
      >
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: true }}
          visible={{ a: true, b: true }}
          onPreview={(a, b) => {
            setV1({ x: a.x, y: a.y });
            setV2({ x: b.x, y: b.y });
          }}
          onCommit={(a, b) => {
            setV1({ x: a.x, y: a.y });
            setV2({ x: b.x, y: b.y });
          }}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
