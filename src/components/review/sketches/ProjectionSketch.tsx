// src/components/review/sketches/ProjectionSketch.tsx
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
function mag(v: Vec2) {
  return Math.hypot(v.x, v.y);
}
function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
function mul(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

// ---------- RAF drag (no snap) ----------
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
  };
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

  const p1 = {
    x: to.x - ux * size - px * (size * 0.55),
    y: to.y - uy * size - py * (size * 0.55),
  };
  const p2 = {
    x: to.x - ux * size + px * (size * 0.55),
    y: to.y - uy * size + py * (size * 0.55),
  };

  return (
    <polygon
      points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
      fill={color}
      opacity={0.95}
      style={{ pointerEvents: "none" }} // ✅ never steal touch
    />
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
      <circle cx={tip.x} cy={tip.y} r={10} fill={fill} stroke={stroke} strokeWidth={2} />
      <circle cx={tip.x} cy={tip.y} r={3} fill="rgba(255,255,255,0.8)" />
      {/* bigger invisible hit target */}
      <circle cx={tip.x} cy={tip.y} r={18} fill="transparent" />
    </g>
  );
}

export default function ProjectionSketch({
  initialT = { x: 4, y: 2 },
  initialR = { x: 3, y: 1 },
  grid = 1,
  worldExtent = 6,
}: {
  initialT?: Vec2; // target vector
  initialR?: Vec2; // reference vector
  grid?: number;
  worldExtent?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [t, setT] = useState<Vec2>(initialT);
  const [r, setR] = useState<Vec2>(initialR);

  const W = 720;
  const H = 420;
  const pad = 18;
  const ext = worldExtent;

  const scale = useMemo(() => (Math.min(W, H) - pad * 2) / (2 * ext), [W, H, pad, ext]);
  const origin = useMemo(() => ({ x: W / 2, y: H / 2 }), [W, H]);

  // world -> svg(viewBox)
  const worldToScreen = (p: Vec2) => ({ x: origin.x + p.x * scale, y: origin.y - p.y * scale });

  // svg(viewBox) -> world (unclamped)
  const screenToWorldUnclamped = (sx: number, sy: number) => ({
    x: (sx - origin.x) / scale,
    y: -(sy - origin.y) / scale,
  });

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

  const tTip = worldToScreen(t);
  const rTip = worldToScreen(r);

  // --- Projection and decomposition ---
  const tDotr = dot(t, r);
  const rDotr = dot(r, r);
  const alpha = rDotr === 0 ? 0 : tDotr / rDotr;

  const tPar = rDotr === 0 ? { x: 0, y: 0 } : mul(r, alpha);
  const tPerp = sub(t, tPar);

  const tParTip = worldToScreen(tPar);
  const tPerpTip = worldToScreen(tPerp);

  const checkVal = dot(tPerp, r);
  const checkLabel =
    Math.abs(checkVal) < 1e-6 ? String.raw`\approx 0\ \text{(perpendicular ✅)}` : String.raw`= ${fmtNum(checkVal, 3)}\ \text{(not } \perp\text{)}`;

  // --- drag: offset in WORLD coords (unclamped pointer world) ---
  const tWorldOffset = useRef<Vec2>({ x: 0, y: 0 });
  const rWorldOffset = useRef<Vec2>({ x: 0, y: 0 });

  const dragT = usePointerDragRAF();
  const dragR = usePointerDragRAF();

  useEffect(() => {
    dragT.setOnMove((cx, cy) => {
      const s = clientToSvg(cx, cy);
      const pWorld = screenToWorldUnclamped(s.x, s.y);
      const next = { x: pWorld.x + tWorldOffset.current.x, y: pWorld.y + tWorldOffset.current.y };
      setT(clampWorld(next));
    });

    dragR.setOnMove((cx, cy) => {
      const s = clientToSvg(cx, cy);
      const pWorld = screenToWorldUnclamped(s.x, s.y);
      const next = { x: pWorld.x + rWorldOffset.current.x, y: pWorld.y + rWorldOffset.current.y };
      setR(clampWorld(next));
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
    const tLatex = fmtVec2Latex(Number(fmtNum(t.x, 2)), Number(fmtNum(t.y, 2)));
    const rLatex = fmtVec2Latex(Number(fmtNum(r.x, 2)), Number(fmtNum(r.y, 2)));
    const parLatex = fmtVec2Latex(Number(fmtNum(tPar.x, 2)), Number(fmtNum(tPar.y, 2)));
    const perpLatex = fmtVec2Latex(Number(fmtNum(tPerp.x, 2)), Number(fmtNum(tPerp.y, 2)));
    const alphaLabel = rDotr === 0 ? String.raw`\text{undefined (}\vec r=\vec 0\text{)}` : fmtNum(alpha, 3);

    return String.raw`
**Projection + decomposition**

Drag the blue handle for \(\vec t\) and green handle for \(\vec r\).

$$
\vec t = ${tLatex},
\qquad
\vec r = ${rLatex}
$$

- Scalar:
  $$
  \alpha = \frac{\vec t\cdot \vec r}{\vec r\cdot \vec r} = ${alphaLabel}
  $$

- Parallel component:
  $$
  \vec t_{\parallel \vec r} = \alpha\,\vec r = ${parLatex}
  $$

- Perpendicular component:
  $$
  \vec t_{\perp \vec r} = \vec t - \vec t_{\parallel \vec r} = ${perpLatex}
  $$

- Check:
  $$
  \vec t_{\perp \vec r}\cdot \vec r\; ${checkLabel}
  $$

> Dashed yellow is \(\vec t_{\parallel \vec r}\). Dashed purple is \(\vec t_{\perp \vec r}\).
`.trim();
  }, [t, r, tPar, tPerp, alpha, rDotr, checkLabel]);

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

            {/* r (reference) */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={rTip.x}
              y2={rTip.y}
              stroke="rgba(52,211,153,0.95)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <ArrowHead from={origin} to={rTip} size={10} color="rgba(52,211,153,0.95)" />
            <Handle
              tip={rTip}
              fill="rgba(52,211,153,0.22)"
              stroke="rgba(52,211,153,0.95)"
              onStart={(e) => {
                const s = clientToSvg(e.clientX, e.clientY);
                const pWorld = screenToWorldUnclamped(s.x, s.y);
                rWorldOffset.current = { x: r.x - pWorld.x, y: r.y - pWorld.y };
                dragR.start(e.clientX, e.clientY);
              }}
              onStop={dragR.stop}
            />

            {/* t (target) */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={tTip.x}
              y2={tTip.y}
              stroke="rgba(56,189,248,0.95)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <ArrowHead from={origin} to={tTip} size={10} color="rgba(56,189,248,0.95)" />
            <Handle
              tip={tTip}
              fill="rgba(56,189,248,0.22)"
              stroke="rgba(56,189,248,0.95)"
              onStart={(e) => {
                const s = clientToSvg(e.clientX, e.clientY);
                const pWorld = screenToWorldUnclamped(s.x, s.y);
                tWorldOffset.current = { x: t.x - pWorld.x, y: t.y - pWorld.y };
                dragT.start(e.clientX, e.clientY);
              }}
              onStop={dragT.stop}
            />

            {/* t_parallel_r (projection onto r) */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={tParTip.x}
              y2={tParTip.y}
              stroke="rgba(250,204,21,0.92)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="6 5"
              opacity={0.95}
            />
            <ArrowHead from={origin} to={tParTip} size={10} color="rgba(250,204,21,0.92)" />

            {/* t_perp_r */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={tPerpTip.x}
              y2={tPerpTip.y}
              stroke="rgba(167,139,250,0.92)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="6 5"
              opacity={0.9}
            />
            <ArrowHead from={origin} to={tPerpTip} size={10} color="rgba(167,139,250,0.92)" />

            {/* connector: from tPar to t */}
            <line
              x1={tParTip.x}
              y1={tParTip.y}
              x2={tTip.x}
              y2={tTip.y}
              stroke="rgba(167,139,250,0.55)"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.9}
              style={{ pointerEvents: "none" }}
            />
          </svg>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
        </div>
      </div>
    </div>
  );
}
