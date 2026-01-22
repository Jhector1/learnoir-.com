// src/components/review/sketches/matricespart2/Mat2OuterProductSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import { rank, det2 } from "@/lib/math/matrixLite";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(3) : "NaN";
}

export default function Mat2OuterProductSketch({ heightClass = "h-[560px]" }: { heightClass?: string }) {
  const [u, setU] = useState<{ x: number; y: number }>({ x: 2.0, y: 1.0 });
  const [v, setV] = useState<{ x: number; y: number }>({ x: 1.2, y: -0.4 });

  // A = u v^T
  const A = useMemo(() => {
    return [
      [u.x * v.x, u.x * v.y],
      [u.y * v.x, u.y * v.y],
    ];
  }, [u, v]);

  const Agrid = useMemo(() => A.map((r) => r.map((x) => fmt(x))), [A]);

  const rA = useMemo(() => rank(A, 1e-10), [A]);
  const det = useMemo(() => det2(A), [A]);

  const stateRef = useRef<VectorPadState>(
    {
      a: { x: u.x, y: u.y, z: 0 },
      b: { x: v.x, y: v.y, z: 0 },
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

      // columns of A
      const c1: Vec3 = { x: A[0][0], y: A[1][0], z: 0 };
      const c2: Vec3 = { x: A[0][1], y: A[1][1], z: 0 };
      const p1 = worldToScreen2(c1);
      const p2 = worldToScreen2(c2);

      // span line in direction of u (if u != 0)
      const m = Math.hypot(u.x, u.y);
      if (m > 1e-9) {
        const uu = { x: u.x / m, y: u.y / m };
        const L = 1000;
        const a = worldToScreen2({ x: -uu.x * L, y: -uu.y * L, z: 0 });
        const b = worldToScreen2({ x: uu.x * L, y: uu.y * L, z: 0 });
        s.push();
        s.stroke("rgba(255,255,255,0.15)");
        s.strokeWeight(3);
        s.line(a.x, a.y, b.x, b.y);
        s.pop();
      }

      s.push();
      s.stroke("rgba(255,255,255,0.28)");
      s.strokeWeight(3);
      s.line(o.x, o.y, p1.x, p1.y);
      s.line(o.x, o.y, p2.x, p2.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("col₁", p1.x + 10, p1.y);
      s.text("col₂", p2.x + 10, p2.y);
      s.pop();
    },
    [A, u]
  );

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs font-extrabold text-white/70">Matrix built from outer product</div>
          <div className="mt-2 text-sm text-white/80">
            <MathMarkdown content={String.raw`$\mathbf{A}=\mathbf{u}\mathbf{v}^T$`} />
            <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA},\quad \det(\mathbf{A})=${det.toFixed(4)}$`} />
          </div>
          <div className="mt-3">
            <MatrixEntryInput
              labelLatex={String.raw`\mathbf{A}=`}
              rows={2}
              cols={2}
              value={Agrid}
              onChange={() => {}}
              cellWidthClass="w-20"
              readOnly
            />
          </div>
          <div className="mt-2 text-xs text-white/60">
            If <span className="font-mono text-white/85">u≠0</span> and <span className="font-mono text-white/85">v≠0</span>, columns are multiples of u → rank 1.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs font-extrabold text-white/70">Drag u and v</div>
          <div className="mt-2 text-xs text-white/60">
            Handle <span className="font-mono text-white/85">u</span> controls the **direction** of columns.
            Handle <span className="font-mono text-white/85">v</span> controls the **scales** of each column.
          </div>
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
            setU({ x: a.x, y: a.y });
            setV({ x: b.x, y: b.y });
          }}
          onCommit={(a, b) => {
            setU({ x: a.x, y: a.y });
            setV({ x: b.x, y: b.y });
          }}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
