// src/components/review/sketches/VectorBasicsSketch.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";
import MathMarkdown from "@/components/math/MathMarkdown";

type Vec2 = { x: number; y: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function mag(v: Vec2) {
  return Math.hypot(v.x, v.y);
}
function unit(v: Vec2): Vec2 {
  const m = mag(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

// RAF drag engine (no re-subscribe, smooth)
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

export default function VectorBasicsSketch({
  initial = { x: 3, y: 2 },
  grid = 1,
  worldExtent = 6,
}: {
  initial?: Vec2;
  grid?: number;
  worldExtent?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [v, setV] = useState<Vec2>(initial);

  const W = 720;
  const H = 420;
  const pad = 18;
  const ext = worldExtent;

  const scale = useMemo(() => (Math.min(W, H) - pad * 2) / (2 * ext), [W, H, pad, ext]);
  const origin = useMemo(() => ({ x: W / 2, y: H / 2 }), [W, H]);

  // world -> viewBox space
  const worldToScreen = (p: Vec2) => ({ x: origin.x + p.x * scale, y: origin.y - p.y * scale });

  // viewBox space -> world (unclamped)
  const screenToWorldUnclamped = (sx: number, sy: number) => ({
    x: (sx - origin.x) / scale,
    y: -(sy - origin.y) / scale,
  });

  const clampWorld = (p: Vec2) => ({ x: clamp(p.x, -ext, ext), y: clamp(p.y, -ext, ext) });

  // client -> viewBox space (CRITICAL fix)
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

  const u = useMemo(() => unit(v), [v]);
  const vMag = useMemo(() => mag(v), [v]);
  const angleDeg = useMemo(() => (Math.atan2(v.y, v.x) * 180) / Math.PI, [v]);

  const tip = worldToScreen(v);
  const uTip = worldToScreen(u);

  // offset (world-space) so first click never teleports
  const vWorldOffset = useRef<Vec2>({ x: 0, y: 0 });

  const drag = usePointerDragRAF({ deadzonePx: 0 }); // set 0.2 if you want micro-smoothing

  useEffect(() => {
    drag.setOnMove((cx, cy) => {
      const s = clientToSvg(cx, cy);
      const pWorld = screenToWorldUnclamped(s.x, s.y);
      const next = {
        x: pWorld.x + vWorldOffset.current.x,
        y: pWorld.y + vWorldOffset.current.y,
      };
      setV(clampWorld(next));
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
    const vLatex = fmtVec2Latex(Number(fmtNum(v.x, 2)), Number(fmtNum(v.y, 2)));
    const uLatex = fmtVec2Latex(Number(fmtNum(u.x, 2)), Number(fmtNum(u.y, 2)));
    const note = vMag < 1e-9 ? "Zero vector: unit vector is undefined." : "Unit vector points same direction.";

    return String.raw`
**Vector basics**

Drag the handle to change \(\vec v\).

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

  return (
    <div className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <div className="grid gap-3 md:grid-cols-[1fr_320px]">
        {/* Sketch */}
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

            {/* v */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={tip.x}
              y2={tip.y}
              stroke="rgba(56,189,248,0.95)"
              strokeWidth={3}
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
            <ArrowHead from={origin} to={tip} size={10} color="rgba(56,189,248,0.95)" />

            {/* unit v */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={uTip.x}
              y2={uTip.y}
              stroke="rgba(52,211,153,0.9)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="5 5"
              opacity={0.9}
              style={{ pointerEvents: "none" }}
            />
            <ArrowHead from={origin} to={uTip} size={9} color="rgba(52,211,153,0.9)" />

            {/* handle */}
            <g
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);

                // compute world offset at the exact click position (no teleport)
                const s = clientToSvg(e.clientX, e.clientY);
                const pWorld = screenToWorldUnclamped(s.x, s.y);
                vWorldOffset.current = { x: v.x - pWorld.x, y: v.y - pWorld.y };

                drag.start(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                drag.stop();
              }}
              onPointerCancel={drag.stop}
              style={{ cursor: "grab" }}
            >
              <circle
                cx={tip.x}
                cy={tip.y}
                r={10}
                fill="rgba(56,189,248,0.25)"
                stroke="rgba(56,189,248,0.9)"
                strokeWidth={2}
              />
              <circle cx={tip.x} cy={tip.y} r={3} fill="rgba(255,255,255,0.8)" />
              {/* bigger invisible hit target */}
              <circle cx={tip.x} cy={tip.y} r={18} fill="transparent" />
            </g>
          </svg>
        </div>

        {/* Math panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
        </div>
      </div>
    </div>
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

  return (
    <polygon
      points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
      fill={color}
      opacity={0.95}
      style={{ pointerEvents: "none" }} // ✅ never steal touch
    />
  );
}
