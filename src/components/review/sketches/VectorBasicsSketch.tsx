"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Mode, Vec3 } from "@/lib/math/vec3";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";
import MathMarkdown from "@/components/math/MathMarkdown";
import { type Overlay2DArgs, unit2 } from "./_vec2";

export default function VectorBasicsSketch({
  initial = { x: 3, y: 2 },
}: {
  initial?: { x: number; y: number };
}) {
  const mode: Mode = "2d";
  const zHeldRef = useRef(false);

  const stateRef = useRef<VectorPadState>({
    a: { x: initial.x, y: initial.y, z: 0 }, // draggable vector v
    b: { x: 0, y: 0, z: 0 }, // unused
    scale: 26,

    showGrid: true,
    snapToGrid: true,
    autoGridStep: true,
    gridStep: 1,

    showComponents: false,
    showAngle: false,
    showProjection: false,
    showPerp: false,
    showUnitB: false,

    depthMode: false,
  });

  const [v, setV] = useState<Vec3>(stateRef.current.a);

  const handles = useMemo(() => ({ a: true, b: false }), []);

  const onPreview = useCallback((na: Vec3) => {
    stateRef.current.a = na;
    setV(na);
  }, []);

  const onCommit = useCallback((na: Vec3) => {
    stateRef.current.a = na;
    setV(na);
  }, []);

  const vMag = useMemo(() => Math.hypot(v.x, v.y), [v.x, v.y]);
  const u = useMemo(() => unit2({ x: v.x, y: v.y }), [v.x, v.y]);
  const angleDeg = useMemo(
    () => (Math.atan2(v.y, v.x) * 180) / Math.PI,
    [v.x, v.y]
  );

  const hud = useMemo(() => {
    const vLatex = fmtVec2Latex(
      Number(fmtNum(v.x, 2)),
      Number(fmtNum(v.y, 2))
    );
    const uLatex = fmtVec2Latex(
      Number(fmtNum(u.x, 2)),
      Number(fmtNum(u.y, 2))
    );
    const note =
      vMag < 1e-9
        ? "Zero vector: unit vector is undefined."
        : "Unit vector keeps the same direction.";

    return String.raw`
**Vector basics**

Drag the tip of $\vec v$ (blue).

$$
\vec v = ${vLatex}
\qquad
\|\vec v\| = ${fmtNum(vMag, 3)}
\qquad
\theta = ${fmtNum(angleDeg, 1)}^\circ
$$

- Unit vector:
  $$
  \hat v = \frac{\vec v}{\|\vec v\|} = ${uLatex}
  $$

**Note:** ${note}
`.trim();
  }, [v.x, v.y, u.x, u.y, vMag, angleDeg]);

  // ✅ stable overlay: dashed unit vector
  const overlay2D = useCallback(
    ({ s, origin, worldToScreen2 }: Overlay2DArgs) => {
      const A = stateRef.current.a;
      const o = origin();

      const m = Math.hypot(A.x, A.y);
      const ux = m < 1e-12 ? 0 : A.x / m;
      const uy = m < 1e-12 ? 0 : A.y / m;

      const uTip = worldToScreen2({ x: ux, y: uy, z: 0 });

      s.push();
      s.stroke("rgba(52,211,153,0.9)");
      s.strokeWeight(3);
      s.drawingContext.setLineDash([6, 6]);
      s.line(o.x, o.y, uTip.x, uTip.y);
      s.drawingContext.setLineDash([]);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.textAlign(s.LEFT, s.TOP);
      s.text("green dashed = unit vector", 12, 48);
      s.pop();
    },
    []
  );

  return (
    <div className="w-full h-full" style={{ touchAction: "none" }}>
      <div className="grid gap-3 md:grid-cols-[1fr_320px] h-full">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <VectorPad
            mode={mode}
            stateRef={stateRef}
            zHeldRef={zHeldRef}
            handles={handles}
            previewThrottleMs={33} // smoother HUD
            onPreview={(na) => onPreview(na)}
            onCommit={(na) => onCommit(na)}
            overlay2D={overlay2D}
            className="h-[420px] w-full"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown
            className="text-sm text-white/80 [&_.katex]:text-white/90"
            content={hud}
          />
        </div>
      </div>
    </div>
  );
}
