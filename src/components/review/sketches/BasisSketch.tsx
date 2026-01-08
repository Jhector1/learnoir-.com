// src/components/review/sketches/BasisSketch.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Mode, Vec3 } from "@/lib/math/vec3";
import MathMarkdown from "@/components/math/MathMarkdown";
import { fmtNum, fmtVec2Latex } from "@/lib/review/latex";

type Vec2 = { x: number; y: number };

function det2(a: Vec2, b: Vec2) {
  return a.x * b.y - a.y * b.x;
}
function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}
function mul(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}
function mag(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

function solveCoords2D(p: Vec2, b1: Vec2, b2: Vec2) {
  // Solve [b1 b2] [c1;c2] = p
  // det = b1x*b2y - b1y*b2x
  const d = det2(b1, b2);
  if (!Number.isFinite(d) || Math.abs(d) < 1e-7) {
    return { ok: false as const, det: d, c1: 0, c2: 0 };
  }
  const c1 = (p.x * b2.y - p.y * b2.x) / d;
  const c2 = (-p.x * b1.y + p.y * b1.x) / d;
  return { ok: true as const, det: d, c1, c2 };
}

export default function BasisSketch({
  initialB1 = { x: 1, y: 0, z: 0 },
  initialB2 = { x: 0.4, y: 1, z: 0 },
  pointP = { x: 3, y: 1 }, // fixed point we “measure”
}: {
  initialB1?: Vec3;
  initialB2?: Vec3;
  pointP?: Vec2;
}) {
  const [mode] = useState<Mode>("2d");
  const zHeldRef = useRef(false);

  const stateRef = useRef<VectorPadState>({
    a: initialB1, // use handle A as basis vector b1
    b: initialB2, // use handle B as basis vector b2
    scale: 60,

    showGrid: true,
    snapToGrid: false,
    autoGridStep: true,
    gridStep: 1,

    showComponents: false,
    showAngle: false,
    showProjection: false,
    showPerp: false,
    showUnitB: false,

    depthMode: false,
  });

  const [b1, setB1] = useState<Vec3>(stateRef.current.a);
  const [b2, setB2] = useState<Vec3>(stateRef.current.b);

  const onPreview = (na: Vec3, nb: Vec3) => {
    setB1(na);
    setB2(nb);
  };

  const b1_2: Vec2 = { x: b1.x, y: b1.y };
  const b2_2: Vec2 = { x: b2.x, y: b2.y };

  const sol = useMemo(() => solveCoords2D(pointP, b1_2, b2_2), [pointP.x, pointP.y, b1.x, b1.y, b2.x, b2.y]);

  const recon = useMemo<Vec2>(() => {
    if (!sol.ok) return { x: NaN, y: NaN };
    return add(mul(b1_2, sol.c1), mul(b2_2, sol.c2));
  }, [sol.ok, sol.c1, sol.c2, b1.x, b1.y, b2.x, b2.y]);

  const reconErr = useMemo(() => {
    if (!sol.ok) return NaN;
    return Math.hypot(recon.x - pointP.x, recon.y - pointP.y);
  }, [sol.ok, recon.x, recon.y, pointP.x, pointP.y]);

  const hud = useMemo(() => {
    const b1Latex = fmtVec2Latex(Number(fmtNum(b1.x, 2)), Number(fmtNum(b1.y, 2)));
    const b2Latex = fmtVec2Latex(Number(fmtNum(b2.x, 2)), Number(fmtNum(b2.y, 2)));
    const pLatex = fmtVec2Latex(Number(fmtNum(pointP.x, 2)), Number(fmtNum(pointP.y, 2)));

    if (!sol.ok) {
      return String.raw`
**Basis (2D)**

Drag the basis vectors \(\vec b_1\) (blue) and \(\vec b_2\) (pink).

$$
\vec b_1=${b1Latex},\quad \vec b_2=${b2Latex},\quad \vec p=${pLatex}
$$

A set is a **basis** for \(\mathbb{R}^2\) only if it is **independent**.

Determinant:
$$
\det[\vec b_1\,\vec b_2]=b_{1x}b_{2y}-b_{1y}b_{2x} = ${fmtNum(sol.det, 6)}
$$

✅ If \(\det\neq 0\), the basis is valid and coordinates are unique.  
❌ Right now \(\det\approx 0\) → vectors are collinear → **not a basis** → coordinates are not unique.
`.trim();
    }

    const c1 = sol.c1;
    const c2 = sol.c2;

    const cLatex = fmtVec2Latex(Number(fmtNum(c1, 3)), Number(fmtNum(c2, 3)));
    const reconLatex = fmtVec2Latex(Number(fmtNum(recon.x, 3)), Number(fmtNum(recon.y, 3)));

    return String.raw`
**Basis = span + independence**

Drag \(\vec b_1\) and \(\vec b_2\). The point \(\vec p\) is fixed.

$$
\vec b_1=${b1Latex},\quad \vec b_2=${b2Latex}
$$

We express \(\vec p\) as:
$$
\vec p = c_1\vec b_1 + c_2\vec b_2
$$

- Fixed point:
  $$
  \vec p=${pLatex}
  $$

- Coordinates in basis \(\{\vec b_1,\vec b_2\}\):
  $$
  \begin{bmatrix}c_1\\c_2\end{bmatrix} = ${cLatex}
  $$

- Reconstruct check:
  $$
  c_1\vec b_1 + c_2\vec b_2 = ${reconLatex}
  $$

- Error: \(\|\text{recon}-p\|\approx ${fmtNum(reconErr, 6)}\)

Determinant:
$$
\det[\vec b_1\,\vec b_2] = ${fmtNum(sol.det, 6)} \neq 0 \Rightarrow \text{independent (valid basis)}
$$

> Independence guarantees **unique coordinates**.
`.trim();
  }, [b1.x, b1.y, b2.x, b2.y, pointP.x, pointP.y, sol.ok, sol.det, sol.c1, sol.c2, recon.x, recon.y, reconErr]);

  const overlay2D = useMemo(() => {
    return ({ s, W, H, origin, worldToScreen2 }: any) => {
      const o = origin();

      const B1 = stateRef.current.a;
      const B2 = stateRef.current.b;

      // draw the fixed point p
      const pS = worldToScreen2({ x: pointP.x, y: pointP.y, z: 0 });

      s.push();
      s.noStroke();
      s.fill("rgba(251,191,36,0.92)");
      s.circle(pS.x, pS.y, 10);
      s.fill("rgba(0,0,0,0.35)");
      s.circle(pS.x, pS.y, 4);
      s.pop();

      // label p
      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.85)");
      s.textSize(12);
      s.textAlign(s.LEFT, s.CENTER);
      s.text("p (fixed)", pS.x + 10, pS.y);
      s.pop();

      // draw reconstructed point (from coords) if basis valid
      if (sol.ok && Number.isFinite(recon.x) && Number.isFinite(recon.y)) {
        const rS = worldToScreen2({ x: recon.x, y: recon.y, z: 0 });

        // connector
        s.push();
        s.stroke("rgba(251,191,36,0.35)");
        s.strokeWeight(2);
        s.line(rS.x, rS.y, pS.x, pS.y);
        s.pop();

        // recon dot
        s.push();
        s.noStroke();
        s.fill("rgba(251,191,36,0.35)");
        s.circle(rS.x, rS.y, 12);
        s.pop();
      }

      // show a faint "basis parallelogram" using b1+b2
      const b1Tip = worldToScreen2(B1);
      const b2Tip = worldToScreen2(B2);
      const b1Plusb2 = worldToScreen2({ x: B1.x + B2.x, y: B1.y + B2.y, z: 0 });

      const ok = sol.ok;
      s.push();
      s.noStroke();
      s.fill(ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.10)");
      s.beginShape();
      s.vertex(o.x, o.y);
      s.vertex(b1Tip.x, b1Tip.y);
      s.vertex(b1Plusb2.x, b1Plusb2.y);
      s.vertex(b2Tip.x, b2Tip.y);
      s.endShape(s.CLOSE);
      s.pop();

      s.push();
      s.noStroke();
      s.fill("rgba(255,255,255,0.75)");
      s.textSize(12);
      s.textAlign(s.LEFT, s.TOP);
      s.text(ok ? "Basis is valid (det ≠ 0)" : "Not a basis (det ≈ 0)", 12, 48);
      s.pop();
    };
  }, [pointP.x, pointP.y, sol.ok, recon.x, recon.y, sol.det]);

  return (
    <div className="w-full h-full">
      <div className="grid gap-3 md:grid-cols-[1fr_320px] h-full">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <VectorPad
            mode={mode}
            stateRef={stateRef}
            zHeldRef={zHeldRef}
            handles={{ a: true, b: true }}
            onPreview={onPreview}
            overlay2D={overlay2D as any}
            className="h-[440px] w-full"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <MathMarkdown className="text-sm text-white/80 [&_.katex]:text-white/90" content={hud} />
          <div className="mt-3 text-xs text-white/55">
            Tip: keep the two basis vectors not-collinear (not on the same line) to stay a valid basis.
          </div>
        </div>
      </div>
    </div>
  );
}
