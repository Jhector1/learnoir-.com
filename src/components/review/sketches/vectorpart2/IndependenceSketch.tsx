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

export default function IndependenceSketch({
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

  const area = useMemo(() => Math.abs(det2(a2, b2)), [a.x, a.y, b.x, b.y]);
  const aMag = useMemo(() => mag2(a2), [a.x, a.y]);
  const bMag = useMemo(() => mag2(b2), [b.x, b.y]);

  const isZeroA = aMag < 1e-6;
  const isZeroB = bMag < 1e-6;

  const dependent = isZeroA || isZeroB || area < 1e-4;
  const status = dependent ? "Dependent" : "Independent";

  const hud = useMemo(() => {
    const aLatex = fmtVec2Latex(Number(fmtNum(a.x, 2)), Number(fmtNum(a.y, 2)));
    const bLatex = fmtVec2Latex(Number(fmtNum(b.x, 2)), Number(fmtNum(b.y, 2)));

    const reason =
      isZeroA || isZeroB
        ? "One vector is (approximately) the zero vector, so the set is dependent."
        : area < 1e-4
        ? "The vectors are (approximately) collinear, so one is a scalar multiple of the other."
        : "The vectors are not collinear, so neither can be written as a multiple of the other.";

    return String.raw`
**Linear independence (2 vectors in $\mathbb{R}^2$)**

Drag $\vec a$ and $\vec b$.

$$
\vec a=${aLatex},
\qquad
\vec b=${bLatex}
$$

We can check independence using the 2D determinant:

$$
\det(\vec a,\vec b)=a_xb_y-a_yb_x
$$

- $|\det(\vec a,\vec b)| = ${fmtNum(area, 4)}$  
- Status: **${status}**

**Why:** ${reason}

> Geometric meaning: $|\det(\vec a,\vec b)|$ is the **area of the parallelogram** spanned by $\vec a,\vec b$. Area $\approx 0$ means they lie on the same line.
`.trim();
  }, [a.x, a.y, b.x, b.y, area, status, isZeroA, isZeroB]);

  // ✅ stable overlay (compute everything from stateRef inside)
  const overlay2D = useCallback(({ s, origin, worldToScreen2 }: Overlay2DArgs) => {
    const st = stateRef.current;
    const A = st.a;
    const B = st.b;

    const o = origin();
    const aTip = worldToScreen2(A);
    const bTip = worldToScreen2(B);
    const aPlusB = worldToScreen2({ x: A.x + B.x, y: A.y + B.y, z: 0 });

    const areaNow = Math.abs(det2({ x: A.x, y: A.y }, { x: B.x, y: B.y }));
    const aMagNow = Math.hypot(A.x, A.y);
    const bMagNow = Math.hypot(B.x, B.y);
    const depNow = aMagNow < 1e-6 || bMagNow < 1e-6 || areaNow < 1e-4;
    const statusNow = depNow ? "Dependent" : "Independent";

    // parallelogram fill
    s.push();
    s.noStroke();
    s.fill(depNow ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.10)");
    s.beginShape();
    s.vertex(o.x, o.y);
    s.vertex(aTip.x, aTip.y);
    s.vertex(aPlusB.x, aPlusB.y);
    s.vertex(bTip.x, bTip.y);
    s.endShape(s.CLOSE);
    s.pop();

    // outline
    s.push();
    s.stroke(depNow ? "rgba(248,113,113,0.55)" : "rgba(52,211,153,0.55)");
    s.strokeWeight(2);
    s.noFill();
    s.line(o.x, o.y, aTip.x, aTip.y);
    s.line(o.x, o.y, bTip.x, bTip.y);
    s.line(aTip.x, aTip.y, aPlusB.x, aPlusB.y);
    s.line(bTip.x, bTip.y, aPlusB.x, aPlusB.y);
    s.pop();

    // label
    s.push();
    s.noStroke();
    s.fill("rgba(255,255,255,0.85)");
    s.textSize(12);
    s.textAlign(s.LEFT, s.TOP);
    s.text(`|det(a,b)| = ${areaNow.toFixed(3)}  →  ${statusNow}`, 12, 48);
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
