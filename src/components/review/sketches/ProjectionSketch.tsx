// src/components/review/sketches/ProjectionSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Mode, Vec3 } from "@/lib/math/vec3";
import { projOfAonB } from "@/lib/math/vec3";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";

type Vec2 = { x: number; y: number };

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function dot2(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + (a.z ?? 0) * (b.z ?? 0);
}

function mul(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: (v.z ?? 0) * s };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
}

function len2(v: Vec3) {
  return dot2(v, v);
}

function arrowHead2D(
  s: any,
  from: { x: number; y: number },
  to: { x: number; y: number },
  col: string,
  size = 12
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const px = -uy;
  const py = ux;

  const p1 = {
    x: to.x - ux * size - px * (size * 0.55),
    y: to.y - uy * size - py * (size * 0.55),
  };
  const p2 = {
    x: to.x - ux * size + px * (size * 0.55),
    y: to.y - uy * size + py * (size * 0.55),
  };

  s.push();
  s.noStroke();
  s.fill(col);
  s.triangle(to.x, to.y, p1.x, p1.y, p2.x, p2.y);
  s.pop();
}

export default function ProjectionSketch({
  initialT = { x: 4, y: 2 },
  initialR = { x: 3, y: 1 },
  grid = 1,
  worldExtent = 6,
}: {
  initialT?: Vec2; // target vector (t)
  initialR?: Vec2; // reference vector (r)
  grid?: number; // world grid step when autoGridStep=false
  worldExtent?: number; // clamp vectors to [-extent, extent]
}) {
  const mode: Mode = "2d";
  const zHeldRef = useRef(false);

  // ---- VectorPad state (source of truth for p5) ----
  const stateRef = useRef<VectorPadState>({
    a: { x: initialT.x, y: initialT.y, z: 0 }, // a = t
    b: { x: initialR.x, y: initialR.y, z: 0 }, // b = r

    // visuals/interaction
    scale: 26,
    showGrid: true,
    snapToGrid: true,
    autoGridStep: false,
    gridStep: grid,

    showComponents: false,
    showAngle: false,

    showProjection: true,
    showPerp: true,
    showUnitB: false,

    depthMode: false,
  } as VectorPadState);

  // ---- UI mirror (so MathMarkdown updates while dragging) ----
  const [t, setT] = useState<Vec3>({ ...stateRef.current.a });
  const [r, setR] = useState<Vec3>({ ...stateRef.current.b });
  const [scale, setScale] = useState<number>(stateRef.current.scale);
  const [, bump] = useState(0); // re-render for toggles (since toggles live in a ref)
  const handles = useMemo(() => ({ a: true, b: true }), []);
  const handleScaleChange = useCallback((next: number) => {
    setScale(next);
  }, []);

  const clampWorld = useCallback(
    (v: Vec3): Vec3 => ({
      x: clamp(v.x, -worldExtent, worldExtent),
      y: clamp(v.y, -worldExtent, worldExtent),
      z: 0,
    }),
    [worldExtent]
  );

  const onPreview = useCallback(
    (nextA: Vec3, nextB: Vec3) => {
      const A = clampWorld(nextA);
      const B = clampWorld(nextB);

      // keep VectorPad drawing clamped values
      stateRef.current.a = A;
      stateRef.current.b = B;

      setT(A);
      setR(B);
    },
    [clampWorld]
  );

  const onCommit = useCallback(
    (nextA: Vec3, nextB: Vec3) => {
      const A = clampWorld(nextA);
      const B = clampWorld(nextB);

      stateRef.current.a = A;
      stateRef.current.b = B;

      setT(A);
      setR(B);
    },
    [clampWorld]
  );

  // ---- math ----
  const tDotr = useMemo(() => dot2(t, r), [t, r]);
  const rDotr = useMemo(() => len2(r), [r]);
  const alpha = useMemo(
    () => (rDotr === 0 ? 0 : tDotr / rDotr),
    [tDotr, rDotr]
  );

  const tPar = useMemo(
    () => (rDotr === 0 ? { x: 0, y: 0, z: 0 } : mul(r, alpha)),
    [r, rDotr, alpha]
  );
  const tPerp = useMemo(() => sub(t, tPar), [t, tPar]);

  const checkVal = useMemo(() => dot2(tPerp, r), [tPerp, r]);
  const overlay2D = useCallback(
    ({
      s,
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

      // A = t (target), B = r (reference)
      const A = st.a;
      const B = st.b;

      const rDotrLocal = dot2(B, B);
      const tDotrLocal = dot2(A, B);
      const alphaLocal = rDotrLocal === 0 ? 0 : tDotrLocal / rDotrLocal;

      const pr =
        rDotrLocal === 0 ? ({ x: 0, y: 0, z: 0 } as Vec3) : mul(B, alphaLocal);
      const perp = sub(A, pr);

      const o = origin();
      const prTip = worldToScreen2(pr);
      const perpTip = worldToScreen2(perp);

      // ---- draw t_perp from origin (purple dashed) ----
      s.push();

      const ctx = s.drawingContext as CanvasRenderingContext2D;

      s.stroke("rgba(167,139,250,0.92)");
      s.strokeWeight(4);

      ctx.save();
      ctx.setLineDash([6, 5]);
      s.line(o.x, o.y, perpTip.x, perpTip.y);
      ctx.restore();

      arrowHead2D(s, o, perpTip, "rgba(167,139,250,0.92)", 12);

      // ---- labels ----
      s.noStroke();
      s.textSize(12);
      s.textAlign(s.LEFT, s.CENTER);

      // t_perp label
      s.fill("rgba(255,255,255,0.85)");
      s.text("t⊥r", perpTip.x + 10, perpTip.y);

      // alpha label near projection tip
      s.fill("rgba(250,204,21,0.95)");
      const aLabel =
        rDotrLocal === 0 ? "α=undef" : `α=${fmtNum(alphaLocal, 3)}`;
      s.text(aLabel, prTip.x + 10, prTip.y + 14);

      s.pop();
    },
    [] // ✅ stable (reads live values from stateRef.current)
  );

  const hud = useMemo(() => {
    const tLatex = fmtVec2Latex(Number(fmtNum(t.x, 2)), Number(fmtNum(t.y, 2)));
    const rLatex = fmtVec2Latex(Number(fmtNum(r.x, 2)), Number(fmtNum(r.y, 2)));
    const parLatex = fmtVec2Latex(
      Number(fmtNum(tPar.x, 2)),
      Number(fmtNum(tPar.y, 2))
    );
    const perpLatex = fmtVec2Latex(
      Number(fmtNum(tPerp.x, 2)),
      Number(fmtNum(tPerp.y, 2))
    );

    const alphaLabel =
      rDotr === 0
        ? String.raw`\text{undefined (}\vec r=\vec 0\text{)}`
        : fmtNum(alpha, 3);

    const checkLabel =
      Math.abs(checkVal) < 1e-6
        ? String.raw`\approx 0\ \text{(perpendicular ✅)}`
        : String.raw`= ${fmtNum(checkVal, 3)}\ \text{(not } \perp\text{)}`;

return String.raw`
**Projection + decomposition (VectorPad)**

Drag **blue** ($\vec t$) and **pink** ($\vec r$).

$$
\vec t = ${tLatex}
\qquad
\vec r = ${rLatex}
$$

**Dot + norm**

$$
\vec t\cdot \vec r = ${fmtNum(tDotr, 3)}
\qquad
\vec r\cdot \vec r = ${fmtNum(rDotr, 3)}
$$

**Scalar (projection coefficient)**

$$
\alpha=\frac{\vec t\cdot \vec r}{\vec r\cdot \vec r} = ${alphaLabel}
$$

**Parallel component**

$$
\vec t_{\parallel \vec r}=\alpha\,\vec r = ${parLatex}
$$

**Perpendicular component**

$$
\vec t_{\perp \vec r}=\vec t-\vec t_{\parallel \vec r} = ${perpLatex}
$$

**Check**

$$
\vec t_{\perp \vec r}\cdot \vec r\; ${checkLabel}
$$

> Yellow is $\vec t_{\parallel \vec r}$. Purple is $\vec t_{\perp \vec r}$.
`.trim();

  }, [t, r, tPar, tPerp, alpha, rDotr, tDotr, checkVal]);

  // ---- compact controls (mutate ref + bump) ----
  const toggle = (key: keyof VectorPadState) => {
    (stateRef.current as any)[key] = !(stateRef.current as any)[key];
    bump((x) => x + 1);
  };

  const setGridStep = (next: number) => {
    stateRef.current.gridStep = next;
    bump((x) => x + 1);
  };

  const reset = () => {
    const A = clampWorld({ x: initialT.x, y: initialT.y, z: 0 });
    const B = clampWorld({ x: initialR.x, y: initialR.y, z: 0 });

    stateRef.current.a = A;
    stateRef.current.b = B;

    stateRef.current.scale = 52;
    setScale(52);

    setT(A);
    setR(B);
    bump((x) => x + 1);
  };

  return (
    <div className="w-full select-none">
      <div className="grid gap-3 md:grid-cols-[1fr_300px]">
        {/* LEFT: smaller pad + compact controls */}
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
              onClick={() => toggle("showComponents")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Components: {stateRef.current.showComponents ? "ON" : "off"}
            </button>

            <button
              onClick={() => toggle("showUnitB")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              ûᵣ: {stateRef.current.showUnitB ? "ON" : "off"}
            </button>

            <button
              onClick={reset}
              className="ml-auto rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              Reset
            </button>
          </div>

          {/* only relevant when autoGridStep is off */}
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
              <div className="text-xs text-white/70 w-12">
                {fmtNum(stateRef.current.gridStep, 2)}
              </div>
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

          {/* Smaller pad */}
          <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <VectorPad
              mode={mode}
              stateRef={stateRef}
              zHeldRef={zHeldRef}
              handles={handles}
              previewThrottleMs={60}
              onPreview={onPreview}
              onCommit={onCommit}
              onScaleChange={handleScaleChange}
              className="absolute inset-0"
              overlay2D={overlay2D}
            />
          </div>
        </div>

        {/* RIGHT: math panel */}
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
