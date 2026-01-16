// src/components/review/sketches/matrixpart1/Transform2DSketch.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import MathMarkdown from "@/components/math/MathMarkdown";

type Vec2 = { x: number; y: number };
type Mat2 = [[number, number], [number, number]];

function mul2x2(M: Mat2, v: Vec2): Vec2 {
  return {
    x: M[0][0] * v.x + M[0][1] * v.y,
    y: M[1][0] * v.x + M[1][1] * v.y,
  };
}

function mag2(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

export default function Transform2DSketch({
  heightClass = "h-[420px]",
}: {
  heightClass?: string;
}) {
  // Matrix
  const [M, setM] = useState<Mat2>([
    [2, 1],
    [0, 1],
  ]);

  // VectorPad state (VectorPad is the source of truth for v = stateRef.current.a)
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 2.2, y: 1.4, z: 0 },
      b: { x: 0, y: 0, z: 0 }, // hidden
      scale: 44,

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

  // UI mirror for labels (decoupled from drag events -> keeps overlay super smooth)
  const [vUI, setVUI] = useState<Vec2>(() => {
    const a = stateRef.current.a;
    return { x: a.x, y: a.y };
  });

  // Update UI ~12fps by sampling stateRef (overlay updates every frame regardless)
  useEffect(() => {
    let raf = 0;
    let last = 0;

    const tick = (t: number) => {
      if (t - last > 80) {
        last = t;
        const a = stateRef.current.a;
        setVUI((prev) => {
          // tiny guard to avoid pointless renders
          if (Math.abs(prev.x - a.x) < 1e-6 && Math.abs(prev.y - a.y) < 1e-6) return prev;
          return { x: a.x, y: a.y };
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const mvUI = useMemo(() => mul2x2(M, vUI), [M, vUI]);

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

      // v comes from VectorPad continuously (so overlay moves while dragging)
      const v = stateRef.current.a;
      const mv2 = mul2x2(M, { x: v.x, y: v.y });
      const mv: Vec3 = { x: mv2.x, y: mv2.y, z: 0 };

      const tip = worldToScreen2(mv);

      const drawArrow = (
        from: { x: number; y: number },
        to: { x: number; y: number },
        stroke: string
      ) => {
        s.push();
        s.stroke(stroke);
        s.strokeWeight(4);
        s.noFill();
        s.line(from.x, from.y, to.x, to.y);

        const ang = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = 12;
        s.push();
        s.translate(to.x, to.y);
        s.rotate(ang);
        s.line(0, 0, -headLen, -headLen * 0.55);
        s.line(0, 0, -headLen, headLen * 0.55);
        s.pop();

        s.pop();
      };

      // transformed basis vectors: M e1 and M e2 (these stay fixed for a fixed M)
      const e1: Vec3 = { x: M[0][0], y: M[1][0], z: 0 };
      const e2: Vec3 = { x: M[0][1], y: M[1][1], z: 0 };

      const e1Tip = worldToScreen2(e1);
      const e2Tip = worldToScreen2(e2);

      // image of unit square under M (parallelogram at origin)
      const p0 = o;
      const p1 = e1Tip;
      const p3 = e2Tip;
      const p2 = {
        x: e1Tip.x + (e2Tip.x - o.x),
        y: e1Tip.y + (e2Tip.y - o.y),
      };

      // light parallelogram fill
      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.05)");
      s.beginShape();
      s.vertex(p0.x, p0.y);
      s.vertex(p1.x, p1.y);
      s.vertex(p2.x, p2.y);
      s.vertex(p3.x, p3.y);
      s.endShape(s.CLOSE);
      s.pop();

      // basis arrows
      s.push();
      s.stroke("rgba(255,255,255,0.25)");
      s.strokeWeight(3);
      s.line(o.x, o.y, e1Tip.x, e1Tip.y);
      s.line(o.x, o.y, e2Tip.x, e2Tip.y);
      s.pop();

      // basis labels
      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.textAlign(s.LEFT, s.CENTER);
      s.text("M e₁", e1Tip.x + 10, e1Tip.y);
      s.text("M e₂", e2Tip.x + 10, e2Tip.y);
      s.pop();

      // Mv arrow + label (this moves while dragging v)
      drawArrow(o, tip, "rgba(52,211,153,0.95)");
      s.push();
      s.noStroke();
      s.fill("rgba(52,211,153,0.95)");
      s.textSize(12);
      s.textAlign(s.LEFT, s.CENTER);
      s.text("Mv", tip.x + 10, tip.y);
      s.pop();
    },
    [M]
  );

  return (
    <div className="h-full w-full p-4">
     <div className="mb-3 flex flex-wrap items-center gap-3">
  {/* M = in the same KaTeX style as your modules */}
  <MathMarkdown
    inline
    className="text-white/80 text-xs font-extrabold"
    content={String.raw`$\mathbf{M}=$`}
  />

  <div className="flex items-center">
    {/* Left bracket only (real KaTeX bracket, sized to 2 rows) */}
    <MathMarkdown
      inline
      className="text-white/90"
      content={String.raw`$\left[\vphantom{\begin{matrix}0\\0\end{matrix}}\right.$`}
    />

    {/* Editable 2x2 entries */}
    <div className="mx-2 grid grid-cols-2 gap-x-3 gap-y-2">
      {([0, 1] as const).map((r) =>
        ([0, 1] as const).map((c) => (
          <input
            key={`${r}-${c}`}
            type="number"
            step={0.5}
            value={M[r][c]}
            onChange={(e) => {
              const val = Number(e.target.value);
              const next: Mat2 = [[...M[0]], [...M[1]]];
              next[r][c] = val;
              setM(next);
            }}
            className="
              w-16 rounded-md border border-white/10 bg-white/5
              px-2 py-1 text-center text-xs font-mono font-extrabold text-white/90
              outline-none focus:border-emerald-400/60
            "
          />
        ))
      )}
    </div>

    {/* Right bracket only */}
    <MathMarkdown
      inline
      className="text-white/90"
      content={String.raw`$\left.\vphantom{\begin{matrix}0\\0\end{matrix}}\right]$`}
    />
  </div>

  {/* Presets */}
  <button
    onClick={() => setM([[1, 0], [0, 1]])}
    className="ml-auto rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
  >
    Identity
  </button>

  <button
    onClick={() => setM([[0, -1], [1, 0]])}
    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
  >
    Rotate 90°
  </button>

  <button
    onClick={() => setM([[1, 1], [0, 1]])}
    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
  >
    Shear
  </button>
</div>


      <div
        className={`w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 ${heightClass}`}
      >
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: false }}
          visible={{ a: true, b: false }}
          // IMPORTANT: don't set React state on every drag -> overlay stays buttery smooth
          onCommit={(a) => setVUI({ x: a.x, y: a.y })}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 grid gap-1 text-xs text-white/70">
        <div>
          Drag <span className="font-mono text-white/85">v</span> (blue). The green arrow is{" "}
          <span className="font-mono text-white/85">Mv</span>.
        </div>
        <div className="font-mono text-white/70">
          v = ({vUI.x.toFixed(2)}, {vUI.y.toFixed(2)}) &nbsp;&nbsp;|v| ={" "}
          {mag2(vUI).toFixed(2)}
        </div>
        <div className="font-mono text-white/70">
          Mv = ({mvUI.x.toFixed(2)}, {mvUI.y.toFixed(2)})
        </div>
      </div>
    </div>
  );
}
