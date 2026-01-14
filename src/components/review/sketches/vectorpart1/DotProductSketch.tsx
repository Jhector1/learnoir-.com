"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import MathMarkdown from "@/components/math/MathMarkdown";
import VectorPad from "@/components/vectorpad/VectorPad";
import type { VectorPadState } from "@/components/vectorpad/types";
import type { Mode, Vec3 } from "@/lib/math/vec3";
import { fmtVec2Latex } from "@/lib/review/latex";
import { clamp, dot2, len, mul, type Overlay2DArgs } from "../_vec2";
import { makeNumberFormatter } from "@/i18n/format";
// import { makeNumberFormatter } from "@/lib/i18n/for mat";

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
  const t = useTranslations("SketchesVectorPart1.dot");
  const tc = useTranslations("SketchesVectorPart1.common");
  const locale = useLocale();
  const nf = useMemo(() => makeNumberFormatter(locale), [locale]);

  const mode: Mode = "2d";
  const zHeldRef = useRef(false);
  const INITIAL_SCALE = 26;

  const stateRef = useRef<VectorPadState>({
    a: { x: initialA.x, y: initialA.y, z: 0 },
    b: { x: initialB.x, y: initialB.y, z: 0 },

    scale: INITIAL_SCALE,
    showGrid: true,
    snapToGrid: true,
    autoGridStep: false,
    gridStep: grid,

    showComponents: false,
    showAngle: true,
    showProjection: true,
    showPerp: false,
    showUnitB: true,

    depthMode: false,
  });

  const [a, setA] = useState<Vec3>({ ...stateRef.current.a });
  const [b, setB] = useState<Vec3>({ ...stateRef.current.b });
  const [scale, setScale] = useState<number>(stateRef.current.scale);
  const [, bump] = useState(0);

  const handles = useMemo(() => ({ a: true, b: true }), []);

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

  const handleScaleChange = useCallback((next: number) => {
    stateRef.current.scale = next;
    setScale(next);
  }, []);

  // ---- dot product math
  const aMag = useMemo(() => len(a), [a]);
  const bMag = useMemo(() => len(b), [b]);
  const aDotb = useMemo(() => dot2(a, b), [a, b]);

  const cosTheta = useMemo(() => {
    const denom = aMag * bMag;
    if (denom <= 1e-12) return 0;
    return clamp(aDotb / denom, -1, 1);
  }, [aDotb, aMag, bMag]);

  const thetaDeg = useMemo(
    () => (Math.acos(cosTheta) * 180) / Math.PI,
    [cosTheta]
  );

  const bDotb = useMemo(() => dot2(b, b), [b]);
  const alpha = useMemo(() => (bDotb === 0 ? 0 : aDotb / bDotb), [aDotb, bDotb]);
  const proj = useMemo(
    () => (bDotb === 0 ? ({ x: 0, y: 0, z: 0 } as Vec3) : mul(b, alpha)),
    [b, bDotb, alpha]
  );

  const scalarProj = useMemo(
    () => (bMag <= 1e-12 ? 0 : aDotb / bMag),
    [aDotb, bMag]
  );

  const signLabel = useMemo(() => {
    if (Math.abs(aDotb) < 1e-6) return t("sign.zero");
    return aDotb > 0 ? t("sign.pos") : t("sign.neg");
  }, [aDotb, t]);

  const overlay2D = useCallback(
    ({ s, worldToScreen2 }: Overlay2DArgs) => {
      const st = stateRef.current;
      const A = st.a;
      const B = st.b;

      const aTip = worldToScreen2(A);
      const bTip = worldToScreen2(B);

      s.push();
      s.noStroke();
      s.textSize(12);
      s.fill("rgba(255,255,255,0.85)");
      s.textAlign(s.LEFT, s.CENTER);
      s.text("a", aTip.x + 10, aTip.y);
      s.text("b", bTip.x + 10, bTip.y);

      const aDotbLocal = dot2(A, B);
      const aMagLocal = Math.hypot(A.x, A.y);
      const bMagLocal = Math.hypot(B.x, B.y);
      const denom = aMagLocal * bMagLocal;
      const cosLocal = denom <= 1e-12 ? 0 : clamp(aDotbLocal / denom, -1, 1);
      const thetaLocal = (Math.acos(cosLocal) * 180) / Math.PI;

      s.fill("rgba(255,255,255,0.75)");
      s.textAlign(s.LEFT, s.TOP);

      s.text(
        t("overlayLine", { dot: nf(aDotbLocal, 3), theta: nf(thetaLocal, 1) }),
        12,
        32
      );

      s.pop();
    },
    [nf, t]
  );

  const hud = useMemo(() => {
    const aLatex = fmtVec2Latex(Number(a.x.toFixed(2)), Number(a.y.toFixed(2)));
    const bLatex = fmtVec2Latex(Number(b.x.toFixed(2)), Number(b.y.toFixed(2)));
    const projLatex = fmtVec2Latex(
      Number(proj.x.toFixed(2)),
      Number(proj.y.toFixed(2))
    );

    return String.raw`
${t("hud.header")}

$$
\vec a = ${aLatex},
\qquad
\vec b = ${bLatex}
$$

- ${t("hud.dot")}
  $$
  \vec a \cdot \vec b = ${nf(aDotb, 3)}
  $$
  ${t("hud.sign", { sign: signLabel })}

- ${t("hud.angle")}
  $$
  \cos\theta = \frac{\vec a\cdot \vec b}{\|\vec a\|\;\|\vec b\|} = ${nf(cosTheta, 3)}
  \qquad
  \theta = ${nf(thetaDeg, 1)}^\circ
  $$

- ${t("hud.scalarProj")}
  $$
  \operatorname{comp}_{\vec b}(\vec a)=\frac{\vec a\cdot \vec b}{\|\vec b\|} = ${nf(scalarProj, 3)}
  $$

- ${t("hud.projection")}
  $$
  \operatorname{proj}_{\vec b}(\vec a)
  =
  \frac{\vec a\cdot \vec b}{\vec b\cdot \vec b}\,\vec b
  =
  ${projLatex}
  $$
`.trim();
  }, [a, b, proj, aDotb, cosTheta, thetaDeg, scalarProj, signLabel, nf, t]);

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

    stateRef.current.scale = INITIAL_SCALE;
    setScale(INITIAL_SCALE);

    setA(A);
    setB(B);
    bump((x) => x + 1);
  };

  return (
    <div className="w-full select-none" style={{ touchAction: "none" }}>
      <div className="grid gap-3 md:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => toggle("showGrid")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              {tc("grid")}: {stateRef.current.showGrid ? tc("on") : tc("off")}
            </button>

            <button
              onClick={() => toggle("snapToGrid")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              {tc("snap")}: {stateRef.current.snapToGrid ? tc("on") : tc("off")}
            </button>

            <button
              onClick={() => toggle("autoGridStep")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              {tc("autoStep")}: {stateRef.current.autoGridStep ? tc("on") : tc("off")}
            </button>

            <button
              onClick={() => toggle("showAngle")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              {tc("angle")}: {stateRef.current.showAngle ? tc("on") : tc("off")}
            </button>

            <button
              onClick={() => toggle("showProjection")}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              {tc("projection")}: {stateRef.current.showProjection ? tc("on") : tc("off")}
            </button>

            <button
              onClick={reset}
              className="ml-auto rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.1]"
            >
              {tc("reset")}
            </button>
          </div>

          {!stateRef.current.autoGridStep && (
            <div className="mb-3 flex items-center gap-3">
              <div className="text-xs text-white/70">{tc("gridStep")}</div>
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
                {nf(stateRef.current.gridStep, 2)}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs text-white/70">{tc("zoom")}</div>
            <input
              type="range"
              min={20}
              max={140}
              step={2}
              value={scale}
              onChange={(e) => handleScaleChange(Number(e.target.value))}
              className="w-64"
            />
            <div className="text-xs text-white/70 w-12">{nf(scale, 2)}</div>
          </div>

          <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <VectorPad
              mode={mode}
              stateRef={stateRef}
              zHeldRef={zHeldRef}
              handles={handles}
              previewThrottleMs={33}
              onPreview={onPreview}
              onCommit={onCommit}
              onScaleChange={handleScaleChange}
              overlay2D={overlay2D}
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
