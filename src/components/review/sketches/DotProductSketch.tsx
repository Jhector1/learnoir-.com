// src/components/review/sketches/DotProductSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Mode, Vec3 } from "@/lib/math/vec3";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";

// ---- tiny math helpers (2D) ----
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function dot2(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + (a.z ?? 0) * (b.z ?? 0);
}
function len(v: Vec3) {
  return Math.hypot(v.x, v.y, v.z ?? 0);
}
function mul(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: (v.z ?? 0) * s };
}

export default function DotProductSketch({
  initialA = { x: 4, y: 1.5 },
  initialB = { x: 2, y: 3.5 },
  grid = 1,
  worldExtent = 6,
}: {
  initialA?: { x: number; y: number };
  initialB?: { x: number; y: number };
  grid?: number;
  worldExtent?: number;
}) {
  const mode: Mode = "2d";
  const zHeldRef = useRef(false);

  // ---- VectorPad is the renderer + drag system ----
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: initialA.x, y: initialA.y, z: 0 }, // blue = a
      b: { x: initialB.x, y: initialB.y, z: 0 }, // pink = b

      scale: 26,

      showGrid: true,
      snapToGrid: true, // ✅ smoother by default (user can toggle on)
      autoGridStep: false,
      gridStep: grid,

      showComponents: false,
      showAngle: true, // dot product lesson → show angle by default
      showProjection: true,
      showPerp: false, // dotted connector style in your VectorPad
      showUnitB: true,

      depthMode: false,
    } as VectorPadState
  );

  // ---- UI mirror for HUD (VectorPad draws from stateRef) ----
  const [a, setA] = useState<Vec3>({ ...stateRef.current.a });
  const [b, setB] = useState<Vec3>({ ...stateRef.current.b });
  const [scale, setScale] = useState<number>(stateRef.current.scale);
  const [, bump] = useState(0);

  const clampWorld = useCallback(
    (v: Vec3): Vec3 => ({
      x: clamp(v.x, -worldExtent, worldExtent),
      y: clamp(v.y, -worldExtent, worldExtent),
      z: 0,
    }),
    [worldExtent]
  );

  // ✅ stable callbacks => no p5 remount/blink
  const onPreview = useCallback(
    (nextA: Vec3, nextB: Vec3) => {
      const A = clampWorld(nextA);
      const B = clampWorld(nextB);
      stateRef.current.a = A;
      stateRef.current.b = B;
      setA(A);
      setB(B);
    },
    [clampWorld]
  );

  const onCommit = useCallback(
    (nextA: Vec3, nextB: Vec3) => {
      const A = clampWorld(nextA);
      const B = clampWorld(nextB);
      stateRef.current.a = A;
      stateRef.current.b = B;
      setA(A);
      setB(B);
    },
    [clampWorld]
  );

  const handles = useMemo(() => ({ a: true, b: true }), []);
  const handleScaleChange = useCallback((next: number) => setScale(next), []);

  // ---- dot product math ----
  const aMag = useMemo(() => len(a), [a]);
  const bMag = useMemo(() => len(b), [b]);
  const aDotb = useMemo(() => dot2(a, b), [a, b]);

  const cosTheta = useMemo(() => {
    const denom = aMag * bMag;
    if (denom <= 1e-12) return 0;
    return clamp(aDotb / denom, -1, 1);
  }, [aDotb, aMag, bMag]);

  const thetaDeg = useMemo(() => (Math.acos(cosTheta) * 180) / Math.PI, [cosTheta]);

  const bDotb = useMemo(() => dot2(b, b), [b]);
  const alpha = useMemo(() => (bDotb === 0 ? 0 : aDotb / bDotb), [aDotb, bDotb]);
  const proj = useMemo(() => (bDotb === 0 ? ({ x: 0, y: 0, z: 0 } as Vec3) : mul(b, alpha)), [b, bDotb, alpha]);

  const scalarProj = useMemo(() => (bMag <= 1e-12 ? 0 : aDotb / bMag), [aDotb, bMag]);

  const signLabel =
    Math.abs(aDotb) < 1e-6 ? "≈ 0 (orthogonal)" : aDotb > 0 ? "> 0" : "< 0";

  // ---- stable overlay (reads live values from stateRef.current) ----
  const overlay2D = useCallback(
    ({
      s,
      W,
      H,
      origin,
      worldToScreen2,
    }: {
      s: any; // p5
      W: number;
      H: number;
      origin: () => { x: number; y: number };
      worldToScreen2: (v: Vec3) => { x: number; y: number };
    }) => {
      const st = stateRef.current;
      const A = st.a;
      const B = st.b;

      // label tips
      const aTip = worldToScreen2(A);
      const bTip = worldToScreen2(B);

      s.push();
      s.noStroke();
      s.textSize(12);

      // labels near tips
      s.fill("rgba(255,255,255,0.85)");
      s.textAlign(s.LEFT, s.CENTER);
      s.text("a", aTip.x + 10, aTip.y);
      s.text("b", bTip.x + 10, bTip.y);

      // HUD overlay (top-left)
      const aDotbLocal = dot2(A, B);
      const aMagLocal = Math.hypot(A.x, A.y);
      const bMagLocal = Math.hypot(B.x, B.y);
      const denom = aMagLocal * bMagLocal;
      const cosLocal = denom <= 1e-12 ? 0 : clamp(aDotbLocal / denom, -1, 1);
      const thetaLocal = (Math.acos(cosLocal) * 180) / Math.PI;

      s.fill("rgba(255,255,255,0.75)");
      s.textAlign(s.LEFT, s.TOP);
      s.text(`a·b = ${fmtNum(aDotbLocal, 3)}   |   θ = ${fmtNum(thetaLocal, 1)}°`, 12, 32);
    //   s.text("drag tips • wheel = zoom • Shift = no-snap (when Snap ON)", 12, 28);

      s.pop();
    },
    []
  );

  const hud = useMemo(() => {
    const aLatex = fmtVec2Latex(Number(fmtNum(a.x, 2)), Number(fmtNum(a.y, 2)));
    const bLatex = fmtVec2Latex(Number(fmtNum(b.x, 2)), Number(fmtNum(b.y, 2)));
    const projLatex = fmtVec2Latex(Number(fmtNum(proj.x, 2)), Number(fmtNum(proj.y, 2)));

    return String.raw`
**Dot product (VectorPad)**

$$
\vec a = ${aLatex},
\qquad
\vec b = ${bLatex}
$$

- Dot product:
  $$
  \vec a \cdot \vec b = ${fmtNum(aDotb, 3)}
  $$
  **Sign:** ${signLabel}

- Angle:
  $$
  \cos\theta = \frac{\vec a\cdot \vec b}{\|\vec a\|\;\|\vec b\|} = ${fmtNum(cosTheta, 3)}
  \qquad
  \theta = ${fmtNum(thetaDeg, 1)}^\circ
  $$

- Scalar projection (“shadow length” on $\vec b$)):
  $$
  \operatorname{comp}_{\vec b}(\vec a)=\frac{\vec a\cdot \vec b}{\|\vec b\|} = ${fmtNum(scalarProj, 3)}
  $$

- Projection of $\vec a$ onto $\vec b$:
  $$
  \operatorname{proj}_{\vec b}(\vec a)
  =
  \frac{\vec a\cdot \vec b}{\vec b\cdot \vec b}\,\vec b
  =
  ${projLatex}
  $$

> Toggle **Snap** if you want grid snapping (Shift disables snap).
`.trim();
  }, [a, b, aDotb, cosTheta, thetaDeg, proj, signLabel, scalarProj]);

  // ---- small controls ----
  const toggle = (key: keyof VectorPadState) => {
    (stateRef.current as any)[key] = !(stateRef.current as any)[key];
    bump((x) => x + 1);
  };

  const setGridStep = (next: number) => {
    stateRef.current.gridStep = next;
    bump((x) => x + 1);
  };

  const reset = () => {
    const A = clampWorld({ x: initialA.x, y: initialA.y, z: 0 });
    const B = clampWorld({ x: initialB.x, y: initialB.y, z: 0 });

    stateRef.current.a = A;
    stateRef.current.b = B;

    stateRef.current.scale = 52;
    setScale(52);

    setA(A);
    setB(B);
    bump((x) => x + 1);
  };

  return (
    <div className="w-full select-none">
      <div className="grid gap-3 md:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => toggle("showGrid")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Grid: {stateRef.current.showGrid ? "ON" : "off"}
            </button>

            <button
              onClick={() => toggle("snapToGrid")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Snap: {stateRef.current.snapToGrid ? "ON" : "off"}
            </button>

            <button
              onClick={() => toggle("autoGridStep")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Auto step: {stateRef.current.autoGridStep ? "ON" : "off"}
            </button>

            <button
              onClick={() => toggle("showAngle")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Angle: {stateRef.current.showAngle ? "ON" : "off"}
            </button>

            <button
              onClick={() => toggle("showProjection")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Projection: {stateRef.current.showProjection ? "ON" : "off"}
            </button>

            <button
              onClick={reset}
              className="ml-auto rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Reset
            </button>
          </div>

          {!stateRef.current.autoGridStep && (
            <div className="mb-3 flex items-center gap-3">
              <div className="text-xs text-white/70">Grid step</div>
              <input
                type="range"
                min={0.25}
                max={2}
                step={0.25}
                value={stateRef.current.gridStep}
                onChange={(e) => setGridStep(Number(e.target.value))}
                className="w-48"
              />
              <div className="text-xs text-white/70 w-12">{fmtNum(stateRef.current.gridStep, 2)}</div>
            </div>
          )}

          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs text-white/70">Zoom</div>
            <input
              type="range"
              min={20}
              max={140}
              step={2}
              value={scale}
              onChange={(e) => {
                const next = Number(e.target.value);
                stateRef.current.scale = next;
                setScale(next);
              }}
              className="w-64"
            />
            <div className="text-xs text-white/70 w-12">{fmtNum(scale, 2)}</div>
          </div>

          <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <VectorPad
              mode={mode}
              stateRef={stateRef}
              zHeldRef={zHeldRef}
              handles={handles}
              previewThrottleMs={60}
              onPreview={onPreview}
              onCommit={onCommit}
              onScaleChange={handleScaleChange} // ✅ stable => no blink
              overlay2D={overlay2D} // ✅ stable => no remount
              className="absolute inset-0"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
        </div>
      </div>
    </div>
  );
}
