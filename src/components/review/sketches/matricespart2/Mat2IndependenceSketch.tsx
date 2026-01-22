// src/components/review/sketches/matricespart2/Mat2IndependenceSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, rank } from "@/lib/math/matrixLite";

export default function Mat2IndependenceSketch({ heightClass = "h-[560px]" }: { heightClass?: string }) {
  const [v1, setV1] = useState<{ x: number; y: number }>({ x: 2.0, y: 0.8 });
  const [v2, setV2] = useState<{ x: number; y: number }>({ x: 0.6, y: 1.6 });

  const A = useMemo(() => {
    // columns are v1, v2
    return [
      [v1.x, v2.x],
      [v1.y, v2.y],
    ];
  }, [v1, v2]);

  const det = useMemo(() => det2(A), [A]);
  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const independent = rA === 2;

  const stateRef = useRef<VectorPadState>(
    {
      a: { x: v1.x, y: v1.y, z: 0 },
      b: { x: v2.x, y: v2.y, z: 0 },
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
      const p1 = worldToScreen2({ x: v1.x, y: v1.y, z: 0 });
      const p3 = worldToScreen2({ x: v2.x, y: v2.y, z: 0 });
      const p2 = { x: p1.x + (p3.x - o.x), y: p1.y + (p3.y - o.y) };

      // parallelogram area visualization
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

      s.push();
      s.stroke("rgba(255,255,255,0.35)");
      s.strokeWeight(3);
      s.line(o.x, o.y, p1.x, p1.y);
      s.line(o.x, o.y, p3.x, p3.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("v₁", p1.x + 10, p1.y);
      s.text("v₂", p3.x + 10, p3.y);
      s.pop();
    },
    [v1, v2, det]
  );

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
          <MathMarkdown content={String.raw`$\mathbf{A}=[\mathbf{v}_1\ \mathbf{v}_2]$`} />
          <MathMarkdown content={String.raw`$\det(\mathbf{A})=${det.toFixed(4)}$`} />
          <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
          <span
            className={[
              "rounded-full px-2 py-1 text-xs font-extrabold",
              independent ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/70",
            ].join(" ")}
          >
            {independent ? "independent" : "dependent (collinear)"}
          </span>
        </div>
        <div className="mt-2 text-xs text-white/60">
          Drag <span className="font-mono text-white/85">v₁</span> and{" "}
          <span className="font-mono text-white/85">v₂</span>. If they become collinear, rank drops to 1.
        </div>
      </div>

      <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}>
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
