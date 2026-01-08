// src/components/review/sketches/DotProductSketch.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";

type Vec2 = { x: number; y: number };

// ---------- math helpers ----------
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function dot(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}
function mag(a: Vec2) {
  return Math.hypot(a.x, a.y);
}
function mul(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

// ---------- RAF drag ----------
function usePointerDragRAF(opts?: { deadzonePx?: number }) {
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef<number | null>(null);
  const deadzone = opts?.deadzonePx ?? 0;

  const onMoveRef = useRef<((clientX: number, clientY: number) => void) | null>(
    null
  );

  useEffect(() => {
    const flush = () => {
      raf.current = null;
      if (!dragging.current || !last.current) return;
      onMoveRef.current?.(last.current.x, last.current.y);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;

      if (last.current && deadzone > 0) {
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        if (dx * dx + dy * dy < deadzone * deadzone) return;
      }

      last.current = { x: e.clientX, y: e.clientY };
      if (raf.current == null) raf.current = requestAnimationFrame(flush);
    };

    const stopAll = () => {
      dragging.current = false;
      last.current = null;
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", stopAll);
    window.addEventListener("pointercancel", stopAll);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopAll);
      window.removeEventListener("pointercancel", stopAll);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [deadzone]);

  return {
    setOnMove(fn: (clientX: number, clientY: number) => void) {
      onMoveRef.current = fn;
    },
    start(seedX?: number, seedY?: number) {
      dragging.current = true;
      if (typeof seedX === "number" && typeof seedY === "number") {
        last.current = { x: seedX, y: seedY };
      }
    },
    stop() {
      dragging.current = false;
      last.current = null;
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
    },
    get isDragging() {
      return dragging.current;
    },
  };
}

export default function DotProductSketch({
  initialA = { x: 4, y: 1.5 },
  initialB = { x: 2, y: 3.5 },
  grid = 1,
  worldExtent = 6,
}: {
  initialA?: Vec2;
  initialB?: Vec2;
  grid?: number;
  worldExtent?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [a, setA] = useState<Vec2>(initialA);
  const [b, setB] = useState<Vec2>(initialB);

  const W = 720;
  const H = 420;
  const pad = 18;
  const ext = worldExtent;

  const scale = useMemo(
    () => (Math.min(W, H) - pad * 2) / (2 * ext),
    [W, H, pad, ext]
  );
  const origin = useMemo(() => ({ x: W / 2, y: H / 2 }), [W, H]);

  // world -> svg(viewBox)
  const worldToScreen = (p: Vec2) => ({
    x: origin.x + p.x * scale,
    y: origin.y - p.y * scale,
  });

  // svg(viewBox) -> world (unclamped!)
  const screenToWorldUnclamped = (sx: number, sy: number) => ({
    x: (sx - origin.x) / scale,
    y: -(sy - origin.y) / scale,
  });

  // final clamp at end
  const clampWorld = (p: Vec2) => ({
    x: clamp(p.x, -ext, ext),
    y: clamp(p.y, -ext, ext),
  });

  // client -> svg(viewBox)
  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const aTip = worldToScreen(a);
  const bTip = worldToScreen(b);

  const aMag = mag(a);
  const bMag = mag(b);
  const aDotb = dot(a, b);

  const cosTheta = useMemo(() => {
    const denom = aMag * bMag;
    return denom === 0 ? 0 : clamp(aDotb / denom, -1, 1);
  }, [aDotb, aMag, bMag]);

  const thetaDeg = useMemo(
    () => (Math.acos(cosTheta) * 180) / Math.PI,
    [cosTheta]
  );

  // projection
  const bDotb = dot(b, b);
  const alpha = bDotb === 0 ? 0 : aDotb / bDotb;
  const proj = bDotb === 0 ? { x: 0, y: 0 } : mul(b, alpha);
  const projTip = worldToScreen(proj);

  const signLabel =
    Math.abs(aDotb) < 1e-6 ? "≈ 0 (orthogonal)" : aDotb > 0 ? "> 0" : "< 0";

  // ---- drag setup (world offset, unclamped) ----
  const aWorldOffset = useRef<Vec2>({ x: 0, y: 0 });
  const bWorldOffset = useRef<Vec2>({ x: 0, y: 0 });

  const dragA = usePointerDragRAF({ deadzonePx: 0 });
  const dragB = usePointerDragRAF({ deadzonePx: 0 });

  useEffect(() => {
    dragA.setOnMove((cx, cy) => {
      const s = clientToSvg(cx, cy);
      const pWorld = screenToWorldUnclamped(s.x, s.y);
      const next = { x: pWorld.x + aWorldOffset.current.x, y: pWorld.y + aWorldOffset.current.y };
      setA(clampWorld(next));
    });

    dragB.setOnMove((cx, cy) => {
      const s = clientToSvg(cx, cy);
      const pWorld = screenToWorldUnclamped(s.x, s.y);
      const next = { x: pWorld.x + bWorldOffset.current.x, y: pWorld.y + bWorldOffset.current.y };
      setB(clampWorld(next));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; thick?: boolean }[] = [];
    for (let i = -ext; i <= ext; i += grid) {
      const thick = i === 0;
      const v1 = worldToScreen({ x: i, y: -ext });
      const v2 = worldToScreen({ x: i, y: ext });
      lines.push({ x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y, thick });

      const h1 = worldToScreen({ x: -ext, y: i });
      const h2 = worldToScreen({ x: ext, y: i });
      lines.push({ x1: h1.x, y1: h1.y, x2: h2.x, y2: h2.y, thick });
    }
    return lines;
  }, [ext, grid, scale]);

  const hud = useMemo(() => {
    const aLatex = fmtVec2Latex(Number(fmtNum(a.x, 2)), Number(fmtNum(a.y, 2)));
    const bLatex = fmtVec2Latex(Number(fmtNum(b.x, 2)), Number(fmtNum(b.y, 2)));
    const projLatex = fmtVec2Latex(Number(fmtNum(proj.x, 2)), Number(fmtNum(proj.y, 2)));

    return String.raw`
**Dot product**

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

- Projection of \(\vec a\) onto \(\vec b\):
  $$
  \operatorname{proj}_{\vec b}(\vec a)
  =
  \frac{\vec a\cdot \vec b}{\vec b\cdot \vec b}\,\vec b
  =
  ${projLatex}
  $$

> Yellow dashed vector is \(\operatorname{proj}_{\vec b}(\vec a)\).
`.trim();
  }, [a, b, aDotb, cosTheta, thetaDeg, proj, signLabel]);

  return (
    <div className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <div className="grid gap-3 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
            <rect x="0" y="0" width={W} height={H} fill="rgba(255,255,255,0.02)" />

            {/* grid */}
            <g>
              {gridLines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={l.thick ? 1.6 : 1}
                />
              ))}
            </g>

            {/* b vector */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={bTip.x}
              y2={bTip.y}
              stroke="rgba(52,211,153,0.95)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <ArrowHead from={origin} to={bTip} size={10} color="rgba(52,211,153,0.95)" />
            <Handle
              tip={bTip}
              fill="rgba(52,211,153,0.22)"
              stroke="rgba(52,211,153,0.95)"
              onStart={(e) => {
                const s = clientToSvg(e.clientX, e.clientY);
                const pWorld = screenToWorldUnclamped(s.x, s.y);
                // ✅ world offset computed from unclamped world pointer => no jump
                bWorldOffset.current = { x: b.x - pWorld.x, y: b.y - pWorld.y };
                dragB.start(e.clientX, e.clientY);
              }}
              onStop={dragB.stop}
            />

            {/* a vector */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={aTip.x}
              y2={aTip.y}
              stroke="rgba(56,189,248,0.95)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <ArrowHead from={origin} to={aTip} size={10} color="rgba(56,189,248,0.95)" />
            <Handle
              tip={aTip}
              fill="rgba(56,189,248,0.22)"
              stroke="rgba(56,189,248,0.95)"
              onStart={(e) => {
                const s = clientToSvg(e.clientX, e.clientY);
                const pWorld = screenToWorldUnclamped(s.x, s.y);
                aWorldOffset.current = { x: a.x - pWorld.x, y: a.y - pWorld.y };
                dragA.start(e.clientX, e.clientY);
              }}
              onStop={dragA.stop}
            />

            {/* projection */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={projTip.x}
              y2={projTip.y}
              stroke="rgba(250,204,21,0.92)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="6 5"
              opacity={0.95}
            />
            <ArrowHead from={origin} to={projTip} size={10} color="rgba(250,204,21,0.92)" />
          </svg>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
        </div>
      </div>
    </div>
  );
}

function Handle({
  tip,
  fill,
  stroke,
  onStart,
  onStop,
}: {
  tip: { x: number; y: number };
  fill: string;
  stroke: string;
  onStart: (e: React.PointerEvent<SVGGElement>) => void;
  onStop: () => void;
}) {
  return (
    <g
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        onStart(e);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStop();
      }}
      onPointerCancel={onStop}
      style={{ cursor: "grab" }}
    >
      {/* visible handle */}
      <circle cx={tip.x} cy={tip.y} r={10} fill={fill} stroke={stroke} strokeWidth={2} />
      <circle cx={tip.x} cy={tip.y} r={3} fill="rgba(255,255,255,0.8)" />
      {/* bigger invisible hit target to avoid “miss + snap” feeling */}
      <circle cx={tip.x} cy={tip.y} r={18} fill="transparent" />
    </g>
  );
}

function ArrowHead({
  from,
  to,
  size,
  color,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  size: number;
  color: string;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const px = -uy;
  const py = ux;

  const p1 = { x: to.x - ux * size - px * (size * 0.55), y: to.y - uy * size - py * (size * 0.55) };
  const p2 = { x: to.x - ux * size + px * (size * 0.55), y: to.y - uy * size + py * (size * 0.55) };

  return <polygon points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={color} opacity={0.95} />;
}
