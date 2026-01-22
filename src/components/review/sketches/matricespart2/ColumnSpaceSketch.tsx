// src/components/review/sketches/matricespart2/Mat2ColSpaceSketch.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import MathMarkdown from "@/components/math/MathMarkdown";
import MatrixEntryInput from "@/components/practice/MatrixEntryInput";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Vec3 } from "@/lib/math/vec3";
import { det2, gridToMat, rank, type Mat } from "@/lib/math/matrixLite";

function defaultA(): string[][] {
  return [
    ["1", "2"],
    ["2", "4"],
  ];
}

function snap1(v: { x: number; y: number }) {
  return { x: Math.round(v.x), y: Math.round(v.y) };
}

// fast check:
// - if det != 0 => full rank => b always in Col(A)
// - else rank-1 => b must be collinear with some nonzero column direction
function fastInCol(A: Mat, b: { x: number; y: number }) {
  const det = det2(A);
  if (Math.abs(det) > 1e-8) return true;

  const c1 = { x: A[0][0], y: A[1][0] };
  const c2 = { x: A[0][1], y: A[1][1] };
  const v =
    Math.hypot(c1.x, c1.y) >= Math.hypot(c2.x, c2.y) ? c1 : c2;

  // if both columns are ~0, only b=0 is in the span
  const vNorm = Math.hypot(v.x, v.y);
  if (vNorm < 1e-12) return Math.hypot(b.x, b.y) < 1e-12;

  // collinearity via 2D cross product magnitude: |v x b| ~ 0
  const cross = v.x * b.y - v.y * b.x;
  return Math.abs(cross) < 1e-8;
}

export default function ColumnSpaceSketch({
  heightClass = "h-[520px]",
}: {
  heightClass?: string;
}) {
  const [Agrid, setAgrid] = useState<string[][]>(defaultA);
  const A = useMemo(() => gridToMat(Agrid), [Agrid]) as Mat;

  // VectorPad: handle a is "b"
  const stateRef = useRef<VectorPadState>(
    {
      a: { x: 2, y: 1, z: 0 },
      b: { x: 0, y: 0, z: 0 },
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

  // committed b (cards)
  const [bUI, setBUI] = useState<{ x: number; y: number }>({ x: 2, y: 1 });
  const b = useMemo(() => ({ x: bUI.x, y: bUI.y }), [bUI]);

  // heavy/true rank test only for committed value
  const tol = 1e-10;
  const Aaug = useMemo(() => {
    return [
      [A[0][0], A[0][1], b.x],
      [A[1][0], A[1][1], b.y],
    ];
  }, [A, b]);

  const rA = useMemo(() => rank(A, tol), [A]);
  const rAug = useMemo(() => rank(Aaug, tol), [Aaug]);
  const inColCommitted = rA === rAug;

  // live membership for overlay (fast)
  const inColLiveRef = useRef<boolean>(inColCommitted);

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

      const col1: Vec3 = { x: A[0][0], y: A[1][0], z: 0 };
      const col2: Vec3 = { x: A[0][1], y: A[1][1], z: 0 };
      const c1 = worldToScreen2(col1);
      const c2 = worldToScreen2(col2);

      const det = det2(A);
      const full = Math.abs(det) > 1e-8;

      if (full) {
        const p0 = o;
        const p1 = c1;
        const p3 = c2;
        const p2 = { x: c1.x + (c2.x - o.x), y: c1.y + (c2.y - o.y) };
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
      } else {
        const v =
          Math.hypot(col1.x, col1.y) >= Math.hypot(col2.x, col2.y)
            ? col1
            : col2;
        const m = Math.hypot(v.x, v.y) || 1;
        const u = { x: v.x / m, y: v.y / m };

        const L = 1000;
        const pA = worldToScreen2({ x: -u.x * L, y: -u.y * L, z: 0 });
        const pB = worldToScreen2({ x: u.x * L, y: u.y * L, z: 0 });
        s.push();
        s.stroke("rgba(255,255,255,0.15)");
        s.strokeWeight(3);
        s.line(pA.x, pA.y, pB.x, pB.y);
        s.pop();
      }

      s.push();
      s.stroke("rgba(255,255,255,0.30)");
      s.strokeWeight(3);
      s.line(o.x, o.y, c1.x, c1.y);
      s.line(o.x, o.y, c2.x, c2.y);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.text("a₁", c1.x + 10, c1.y);
      s.text("a₂", c2.x + 10, c2.y);
      s.pop();

      // live badge (fast)
      const live = inColLiveRef.current;
      s.push();
      s.noStroke();
      s.textSize(12);
      s.fill(live ? "rgba(52,211,153,0.95)" : "rgba(248,113,113,0.95)");
      s.text(live ? "b ∈ Col(A)" : "b ∉ Col(A)", o.x + 10, o.y - 12);
      s.pop();
    },
    [A]
  );

  const lastCommittedRef = useRef<{ x: number; y: number }>(bUI);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <MatrixEntryInput
          labelLatex={String.raw`\mathbf{A}=`}
          rows={2}
          cols={2}
          value={Agrid}
          onChange={setAgrid}
          cellWidthClass="w-20"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <MathMarkdown content={String.raw`$\mathrm{rank}(\mathbf{A})=${rA}$`} />
          <MathMarkdown content={String.raw`$\mathrm{rank}([\mathbf{A}\mid \mathbf{b}])=${rAug}$`} />
          <span
            className={[
              "rounded-full px-2 py-1 text-xs font-extrabold",
              inColCommitted
                ? "bg-emerald-400/15 text-emerald-200"
                : "bg-red-400/15 text-red-200",
            ].join(" ")}
          >
            {inColCommitted ? "b is reachable" : "b adds a new direction"}
          </span>
        </div>
      </div>

      <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${heightClass}`}>
        <VectorPad
          mode="2d"
          stateRef={stateRef}
          zHeldRef={zHeldRef}
          handles={{ a: true, b: false }}
          visible={{ a: true, b: false }}
          onPreview={(a) => {
            // ✅ super cheap on click/move
            const live = snap1({ x: a.x, y: a.y });
            inColLiveRef.current = fastInCol(A, live);
          }}
          onCommit={(a) => {
            const next = snap1({ x: a.x, y: a.y });

            // only update state if changed
            const prev = lastCommittedRef.current;
            if (next.x === prev.x && next.y === prev.y) return;

            lastCommittedRef.current = next;
            setBUI(next);

            // keep overlay consistent immediately
            inColLiveRef.current = fastInCol(A, next);
          }}
          overlay2D={overlay2D}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 text-xs text-white/70">
        Drag <span className="font-mono text-white/85">b</span>. The overlay shows the columns of{" "}
        <span className="font-mono text-white/85">A</span> and whether{" "}
        <span className="font-mono text-white/85">b</span> lies in their span (rank test).
      </div>
    </div>
  );
}
