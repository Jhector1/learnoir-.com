"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3, Mode } from "@/lib/math/vec3";
import MathMarkdown from "@/components/math/MathMarkdown";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";

type Overlay2DArgs = {
  s: any;
  W: number;
  H: number;
  origin: () => { x: number; y: number };
  worldToScreen2: (v: Vec3) => { x: number; y: number };
};

function det2(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x;
}
function mag2(v: { x: number; y: number }) {
  return Math.hypot(v.x, v.y);
}
function safeDir(v: { x: number; y: number }) {
  const m = mag2(v);
  if (m < 1e-9) return { x: 1, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

export default function SpanSketch({
  initialA = { x: 4, y: 1.5, z: 0 },
  initialB = { x: 2, y: 3.5, z: 0 },
}: {
  initialA?: Vec3;
  initialB?: Vec3;
}) {
  const mode: Mode = "2d";
  const zHeldRef = useRef(false);

  const stateRef = useRef<VectorPadState>({
    a: initialA,
    b: initialB,
    scale: 26,

    showGrid: true,
    snapToGrid: true,
    autoGridStep: false,
    gridStep: 1,

    showComponents: false,
    showAngle: false,
    showProjection: false,
    showPerp: false,
    showUnitB: false,

    depthMode: false,
  });

  const [a, setA] = useState<Vec3>(stateRef.current.a);
  const [b, setB] = useState<Vec3>(stateRef.current.b);

  const handles = useMemo(() => ({ a: true, b: true }), []);

  const onPreview = useCallback((na: Vec3, nb: Vec3) => {
    stateRef.current.a = na;
    stateRef.current.b = nb;
    setA(na);
    setB(nb);
  }, []);

  const onCommit = useCallback((na: Vec3, nb: Vec3) => {
    stateRef.current.a = na;
    stateRef.current.b = nb;
    setA(na);
    setB(nb);
  }, []);

  const a2 = { x: a.x, y: a.y };
  const b2 = { x: b.x, y: b.y };
  const area = Math.abs(det2(a2, b2));
  const aMag = mag2(a2);
  const bMag = mag2(b2);

  const independent = aMag > 1e-6 && bMag > 1e-6 && area > 1e-4;
 const spanLabel = independent
  ? String.raw`\operatorname{span}\{\vec a,\vec b\}=\mathbb{R}^2`
  : String.raw`\operatorname{span}\{\vec a,\vec b\}\text{ is a line}`;


  const hud = useMemo(() => {
    const aLatex = fmtVec2Latex(Number(fmtNum(a.x, 2)), Number(fmtNum(a.y, 2)));
    const bLatex = fmtVec2Latex(Number(fmtNum(b.x, 2)), Number(fmtNum(b.y, 2)));

    const msg = independent
      ? "Because the vectors are not collinear, combinations can reach any direction in the plane."
      : "Because the vectors are collinear (or one is zero), all combinations stay on one line through the origin.";

    return String.raw`
**Span / subspace (2D intuition)**

Drag $\vec a$ and $\vec b$.

$$
\vec a=${aLatex},
\qquad
\vec b=${bLatex}
$$

Span definition:

$$
\operatorname{span}\{\vec a,\vec b\}
=
\{\lambda\vec a+\mu\vec b\;|\;\lambda,\mu\in\mathbb{R}\}
$$

- $|\det(\vec a,\vec b)| = ${fmtNum(area, 4)}$
**Conclusion:**
$$
${spanLabel}
$$

**Why:** ${msg}

> If the set is dependent, one vector is redundant, so the span collapses to a 1D line.
`.trim();
  }, [a.x, a.y, b.x, b.y, area, independent, spanLabel]);

  // ✅ stable overlay (compute from stateRef inside)
  const overlay2D = useCallback(({ s, W, H, origin, worldToScreen2 }: Overlay2DArgs) => {
    const st = stateRef.current;
    const A = st.a;
    const B = st.b;

    const areaNow = Math.abs(det2({ x: A.x, y: A.y }, { x: B.x, y: B.y }));
    const aMagNow = Math.hypot(A.x, A.y);
    const bMagNow = Math.hypot(B.x, B.y);

    const independentNow = aMagNow > 1e-6 && bMagNow > 1e-6 && areaNow > 1e-4;
    const spanLabelNow = independentNow ? "span{a,b} = R^2" : "span{a,b} is a line";

    // pick a direction for span line
    const dir = safeDir(
      Math.hypot(B.x, B.y) > 1e-6 ? { x: B.x, y: B.y } : { x: A.x, y: A.y }
    );

    if (independentNow) {
      s.push();
      s.noStroke();
      s.fill("rgba(52,211,153,0.06)");
      s.rect(0, 0, W, H);
      s.pop();
    } else {
      const o = origin();
      const L = 9999;
      const p1 = worldToScreen2({ x: -dir.x * L, y: -dir.y * L, z: 0 });
      const p2 = worldToScreen2({ x: dir.x * L, y: dir.y * L, z: 0 });

      s.push();
      s.stroke("rgba(250,204,21,0.55)");
      s.strokeWeight(6);
      s.line(p1.x, p1.y, p2.x, p2.y);
      s.pop();

      // subtle wash too
      s.push();
      s.noStroke();
      s.fill("rgba(250,204,21,0.03)");
      s.rect(0, 0, W, H);
      s.pop();
    }

    s.push();
    s.noStroke();
    s.fill("rgba(255,255,255,0.85)");
    s.textSize(12);
    s.textAlign(s.LEFT, s.TOP);
    s.text(spanLabelNow, 12, 48);
    s.pop();
  }, []);

  return (
    <div className="w-full h-full" style={{ touchAction: "none" }}>
      <div className="grid gap-3 md:grid-cols-[1fr_320px] h-full">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <VectorPad
            mode={mode}
            stateRef={stateRef}
            zHeldRef={zHeldRef}
            handles={handles}
            previewThrottleMs={50}
            onPreview={onPreview}
            onCommit={onCommit}
            overlay2D={overlay2D}
            className="h-[420px] w-full"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
        </div>
      </div>
    </div>
  );
}
