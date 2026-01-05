// src/components/vectorpad/VectorPad.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type p5 from "p5";
import type { Mode, Vec3 } from "@/lib/math/vec3";
import {
  COLORS,
  angleBetween,
  mag,
  projOfAonB,
  radToDeg,
  safeUnit,
  scalarProjOfAonB,
  sub,
  mul,
} from "@/lib/math/vec3";
import type { VectorPadState } from "./types";

type Handles = { a?: boolean; b?: boolean };

type Props = {
  mode: Mode;
  stateRef: React.MutableRefObject<VectorPadState>;
  zHeldRef: React.MutableRefObject<boolean>;
  handles?: Handles;

  onPreview?: (a: Vec3, b: Vec3) => void;
  onCommit?: (a: Vec3, b: Vec3) => void;
  previewThrottleMs?: number;

  className?: string;
};

export default function VectorPad({
  mode,
  stateRef,
  zHeldRef,
  handles,
  onPreview,
  onCommit,
  previewThrottleMs = 120,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<any>(null);

  const handlesMemo = useMemo(
    () => ({
      a: handles?.a ?? true,
      b: handles?.b ?? true,
    }),
    [handles]
  );

  const lastPreview = useRef<number>(0);
  const emitPreview = (nextA: Vec3, nextB: Vec3) => {
    stateRef.current.a = nextA;
    stateRef.current.b = nextB;

    if (!onPreview) return;
    const now = performance.now();
    if (now - lastPreview.current >= previewThrottleMs) {
      lastPreview.current = now;
      onPreview(nextA, nextB);
    }
  };

  const emitCommit = (nextA: Vec3, nextB: Vec3) => {
    stateRef.current.a = nextA;
    stateRef.current.b = nextB;
    onCommit?.(nextA, nextB);
  };

  useEffect(() => {
    if (!mountRef.current) return;
    let cancelled = false;

    (async () => {
      const mod = await import("p5");
      const P5 = (mod as any).default as any;
      if (cancelled) return;

      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }

      const create2DSketch = () => (s: p5) => {
        let canvasEl: HTMLCanvasElement | null = null;


const drawAxisLabels2D = () => {
  const o = origin();

  s.push();
  s.noStroke();
  s.fill("rgba(255,255,255,0.85)");
  s.textSize(12);
  s.textAlign(s.LEFT, s.CENTER);

  // +X label (right end)
  s.text("x", W - 18, o.y);

  // +Y label (top end) — align center for nicer placement
  s.textAlign(s.CENTER, s.TOP);
  s.text("y", o.x, 6);

  // Optional: origin label
  // s.textAlign(s.LEFT, s.TOP);
  // s.text("(0,0)", o.x + 6, o.y + 6);

  s.pop();
};



        const getSize = () => {
          const el = mountRef.current!;
          const r = el.getBoundingClientRect();
          return { w: Math.max(320, r.width), h: Math.max(320, r.height) };
        };

        let W = 800;
        let H = 600;

        const origin = () => ({ x: W / 2, y: H / 2 });

        const worldToScreen2 = (v: Vec3) => {
          const o = origin();
          return {
            x: o.x + v.x * stateRef.current.scale,
            y: o.y - v.y * stateRef.current.scale,
          };
        };

        const screenToWorld2 = (px: number, py: number): Vec3 => {
          const o = origin();
          return {
            x: (px - o.x) / stateRef.current.scale,
            y: (o.y - py) / stateRef.current.scale,
            z: 0,
          };
        };

        type DragTarget = "a" | "b" | null;
        let dragging: DragTarget = null;

        const dist2 = (ax: number, ay: number, bx: number, by: number) => {
          const dx = ax - bx;
          const dy = ay - by;
          return dx * dx + dy * dy;
        };

        const maybeSnap2 = (v: Vec3, shiftDown: boolean) => {
          if (!stateRef.current.snapToGrid) return v;
          if (shiftDown) return v;
          const step = Math.max(0.1, stateRef.current.gridStep);
          return {
            x: Math.round(v.x / step) * step,
            y: Math.round(v.y / step) * step,
            z: 0,
          };
        };

        const drawArrow = (
          from: { x: number; y: number },
          to: { x: number; y: number },
          col: string,
          weight = 3
        ) => {
          s.push();
          s.stroke(col);
          s.strokeWeight(weight);
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

        const drawHandle = (pos: { x: number; y: number }, col: string) => {
          s.push();
          s.noStroke();
          s.fill(col);
          s.circle(pos.x, pos.y, 14);
          s.fill("rgba(0,0,0,0.35)");
          s.circle(pos.x, pos.y, 6);
          s.pop();
        };

        const drawGrid = () => {
          if (!stateRef.current.showGrid) return;
          s.push();
          const step = Math.max(0.25, stateRef.current.gridStep);
          const pxStep = step * stateRef.current.scale;
          const o = origin();

          s.stroke(COLORS.grid);
          s.strokeWeight(1);

          const maxX = Math.ceil(W / pxStep) + 2;
          const maxY = Math.ceil(H / pxStep) + 2;

          for (let i = -maxX; i <= maxX; i++)
            s.line(o.x + i * pxStep, 0, o.x + i * pxStep, H);
          for (let j = -maxY; j <= maxY; j++)
            s.line(0, o.y + j * pxStep, W, o.y + j * pxStep);

          s.stroke(COLORS.axis);
          s.strokeWeight(2);
          s.line(0, o.y, W, o.y);
          s.line(o.x, 0, o.x, H);
          s.pop();
        };

        const drawComponents = (v: Vec3, col: string) => {
          if (!stateRef.current.showComponents) return;
          const o = origin();
          const tip = worldToScreen2(v);
          const xComp = worldToScreen2({ x: v.x, y: 0, z: 0 });

          s.push();
          s.strokeWeight(2);
          s.stroke(col);
          s.line(o.x, o.y, xComp.x, xComp.y);
          s.line(xComp.x, xComp.y, tip.x, tip.y);
          s.pop();
        };

        const drawAngleArc = (aV: Vec3, bV: Vec3) => {
          if (!stateRef.current.showAngle) return;
          const ang = angleBetween(aV, bV);
          if (!Number.isFinite(ang)) return;

          const aAng = Math.atan2(aV.y, aV.x);
          const bAng = Math.atan2(bV.y, bV.x);
          let d = aAng - bAng;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;

          const o = origin();
          const r = 48;
          const start = -bAng;
          const end = -(bAng + d);

          s.push();
          s.noFill();
          s.stroke("rgba(255,255,255,0.35)");
          s.strokeWeight(2);
          s.arc(o.x, o.y, r * 2, r * 2, start, end);

          const mid = (start + end) / 2;
          const lx = o.x + Math.cos(mid) * (r + 16);
          const ly = o.y + Math.sin(mid) * (r + 16);
          s.noStroke();
          s.fill(COLORS.text);
          s.textSize(12);
          s.textAlign(s.CENTER, s.CENTER);
          s.text(`θ = ${radToDeg(Math.abs(d)).toFixed(1)}°`, lx, ly);
          s.pop();
        };

        const drawProjection = (aV: Vec3, bV: Vec3) => {
          if (!stateRef.current.showProjection) return;
          const pr = projOfAonB(aV, bV);
          if (!Number.isFinite(pr.x) || !Number.isFinite(pr.y)) return;

          const o = origin();
          const aTip = worldToScreen2(aV);
          const prTip = worldToScreen2(pr);

          drawArrow(o, prTip, COLORS.proj, 4);

          s.push();
          s.stroke(
            stateRef.current.showPerp ? COLORS.perp : "rgba(255,255,255,0.18)"
          );
          s.strokeWeight(stateRef.current.showPerp ? 3 : 2);
          if (!stateRef.current.showPerp) {
            const steps = 10;
            for (let i = 0; i < steps; i++) {
              const t0 = i / steps;
              const t1 = (i + 0.5) / steps;
              s.line(
                prTip.x + (aTip.x - prTip.x) * t0,
                prTip.y + (aTip.y - prTip.y) * t0,
                prTip.x + (aTip.x - prTip.x) * t1,
                prTip.y + (aTip.y - prTip.y) * t1
              );
            }
          } else {
            s.line(prTip.x, prTip.y, aTip.x, aTip.y);
          }
          s.pop();

          s.push();
          s.noStroke();
          s.fill(COLORS.proj);
          s.textSize(12);
          s.textAlign(s.LEFT, s.CENTER);
          s.text("proj₍b₎(a)", prTip.x + 10, prTip.y);
          s.pop();
        };

        const drawUnitB = (bV: Vec3) => {
          if (!stateRef.current.showUnitB) return;
          const ub = safeUnit(bV);
          if (!ub) return;

          const o = origin();
          const tip = worldToScreen2(ub);
          drawArrow(o, tip, "rgba(255,255,255,0.75)", 3);

          s.push();
          s.noStroke();
          s.fill("rgba(255,255,255,0.85)");
          s.textSize(12);
          s.textAlign(s.LEFT, s.CENTER);
          s.text("û_b", tip.x + 10, tip.y);
          s.pop();
        };

s.setup = () => {
  const { w, h } = getSize();
  W = w;
  H = h;

  s.pixelDensity(1);

  const renderer = s.createCanvas(W, H); // ✅ only once
  canvasEl = renderer.elt as HTMLCanvasElement;

  canvasEl.style.touchAction = "none";
  canvasEl.tabIndex = 0;
  canvasEl.style.outline = "none";
  canvasEl.focus?.();

  s.textFont(
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
  );
};


        s.windowResized = () => {
          const { w, h } = getSize();
          W = w;
          H = h;
          s.resizeCanvas(W, H);
        };

        s.draw = () => {
          s.background(COLORS.bg);
          const st = stateRef.current;
          const o = origin();
          const aV = st.a;
          const bV = st.b;

          drawGrid();
          drawAxisLabels2D();

          drawUnitB(bV);
          drawComponents(aV, "rgba(122,162,255,0.55)");
          drawComponents(bV, "rgba(255,107,214,0.55)");
          drawProjection(aV, bV);
          drawAngleArc(aV, bV);

          drawArrow(o, worldToScreen2(aV), COLORS.a, 4);
          drawArrow(o, worldToScreen2(bV), COLORS.b, 4);
if (handlesMemo.a) drawHandle(worldToScreen2(aV), COLORS.a);
else drawHandle(worldToScreen2(aV), "rgba(122,162,255,0.25)");

if (handlesMemo.b) drawHandle(worldToScreen2(bV), COLORS.b);
else drawHandle(worldToScreen2(bV), "rgba(255,107,214,0.25)");


          s.push();
          s.noStroke();
          s.fill("rgba(255,255,255,0.75)");
          s.textSize(12);
          s.textAlign(s.LEFT, s.TOP);
          s.text("2D: drag tips • Shift = no-snap", 12, 12);
          s.pop();
        };

        s.mousePressed = () => {
          const st = stateRef.current;
          const aTip = worldToScreen2(st.a);
          const bTip = worldToScreen2(st.b);
          const mx = s.mouseX;
          const my = s.mouseY;
          const r2 = 14 * 14;

          const hitA = handlesMemo.a && dist2(mx, my, aTip.x, aTip.y) <= r2;
          const hitB = handlesMemo.b && dist2(mx, my, bTip.x, bTip.y) <= r2;
  canvasEl?.focus();

          if (hitA && hitB) {
            const da = dist2(mx, my, aTip.x, aTip.y);
            const db = dist2(mx, my, bTip.x, bTip.y);
            dragging = da <= db ? "a" : "b";
          } else if (hitA) dragging = "a";
          else if (hitB) dragging = "b";
          else dragging = null;
        };

        s.mouseDragged = (evt: any) => {
          if (!dragging) return;
          const st = stateRef.current;

          const w = screenToWorld2(s.mouseX, s.mouseY);

          // ✅ reliable Shift detection
          const shiftDown = !!evt?.shiftKey || s.keyIsDown(16);

          const snapped = maybeSnap2(w, shiftDown);

          if (dragging === "a") emitPreview(snapped, st.b);
          else emitPreview(st.a, snapped);
        };

        s.mouseReleased = () => {
          if (dragging)
            emitCommit({ ...stateRef.current.a }, { ...stateRef.current.b });
          dragging = null;
        };
      };

      const create3DSketch = () => (s: p5) => {
        let canvasEl: HTMLCanvasElement | null = null;

        const getSize = () => {
          const el = mountRef.current!;
          const r = el.getBoundingClientRect();
          return { w: Math.max(320, r.width), h: Math.max(320, r.height) };
        };

        let W = 800;
        let H = 600;

        type DragTarget = "a" | "b" | null;
        let dragging: DragTarget = null;
        let lastMouse: { x: number; y: number } | null = null;

        const dragSpeed = () => 1 / Math.max(20, stateRef.current.scale);

        const maybeSnap3 = (v: Vec3, shiftDown: boolean) => {
          if (!stateRef.current.snapToGrid) return v;
          if (shiftDown) return v;
          const step = Math.max(0.1, stateRef.current.gridStep);
          return {
            x: Math.round(v.x / step) * step,
            y: Math.round(v.y / step) * step,
            z: v.z,
          };
        };

        // ---- ✅ robust 3D->2D for picking (fixes "spheres not draggable") ----
        const normalizeToTopLeft = (pt: { x: number; y: number }) => {
          // If it looks like a centered coordinate, convert to top-left.
          if (
            pt.x >= -W / 2 &&
            pt.x <= W / 2 &&
            pt.y >= -H / 2 &&
            pt.y <= H / 2
          ) {
            return { x: pt.x + W / 2, y: pt.y + H / 2 };
          }
          return pt;
        };

        const getMat4 = (m: any): number[] | null => {
          if (!m) return null;
          if (Array.isArray(m) && m.length === 16) return m as number[];
          if (Array.isArray(m?.mat4) && m.mat4.length === 16)
            return m.mat4 as number[];
          if (Array.isArray(m?._mat4) && m._mat4.length === 16)
            return m._mat4 as number[];
          if (Array.isArray(m?.mat) && m.mat.length === 16)
            return m.mat as number[];
          return null;
        };

        const worldToScreen = (x: number, y: number, z: number) => {
          const anyS = s as any;

          // Newer p5 builds
          if (typeof anyS.worldToScreen === "function") {
            try {
              const v = anyS.worldToScreen(x, y, z);
              if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) {
                const tl = normalizeToTopLeft({ x: v.x, y: v.y });
                return { sx: tl.x, sy: tl.y };
              }
            } catch {}
          }

          // Older p5 builds
          if (typeof anyS.screenPosition === "function") {
            try {
              const v = anyS.screenPosition(x, y, z);
              if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) {
                const tl = normalizeToTopLeft({ x: v.x, y: v.y });
                return { sx: tl.x, sy: tl.y };
              }
            } catch {}
          }

          // Fallback: manual projection using renderer matrices (best effort)
          const r = anyS._renderer;
          const mv = getMat4(r?.uMVMatrix);
          const pr = getMat4(r?.uPMatrix);
          if (!mv || !pr) return null;

          const mulMat4Vec4 = (
            m: number[],
            vx: number,
            vy: number,
            vz: number,
            vw: number
          ) => ({
            x: m[0] * vx + m[4] * vy + m[8] * vz + m[12] * vw,
            y: m[1] * vx + m[5] * vy + m[9] * vz + m[13] * vw,
            z: m[2] * vx + m[6] * vy + m[10] * vz + m[14] * vw,
            w: m[3] * vx + m[7] * vy + m[11] * vz + m[15] * vw,
          });

          const eye = mulMat4Vec4(mv, x, y, z, 1);
          const clip = mulMat4Vec4(pr, eye.x, eye.y, eye.z, eye.w);
          if (!Number.isFinite(clip.w) || Math.abs(clip.w) < 1e-9) return null;

          const ndcX = clip.x / clip.w;
          const ndcY = clip.y / clip.w;

          const sx = (ndcX * 0.5 + 0.5) * W;
          const sy = (-ndcY * 0.5 + 0.5) * H;
          if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;
          return { sx, sy };
        };

        const isNear = (
          p: { sx: number; sy: number } | null,
          mx: number,
          my: number,
          r = 18
        ) => {
          if (!p) return false;
          const dx = p.sx - mx;
          const dy = p.sy - my;
          return dx * dx + dy * dy <= r * r;
        };

        const labelAt = (
          x: number,
          y: number,
          z: number,
          text: string,
          col: string
        ) => {
          const sp = worldToScreen(x, y, z);
          if (!sp) return;

          s.push();
          s.resetMatrix();
          s.translate(-W / 2, -H / 2);
          s.noStroke();
          s.fill(col);
          s.textSize(12);
          s.textAlign(s.LEFT, s.CENTER);
          s.text(text, sp.sx + 10, sp.sy);
          s.pop();
        };

        const drawAxis = () => {
          if (!stateRef.current.showGrid) return;

          s.push();
          s.strokeWeight(1);

          s.stroke(COLORS.grid);
          const step = Math.max(0.25, stateRef.current.gridStep);
          const worldStep = step * stateRef.current.scale;
          const half = 10 * worldStep;

          for (let x = -half; x <= half; x += worldStep)
            s.line(x, -half, 0, x, half, 0);
          for (let y = -half; y <= half; y += worldStep)
            s.line(-half, y, 0, half, y, 0);

          s.stroke(COLORS.axis);
          s.strokeWeight(2);
          s.line(-half, 0, 0, half, 0, 0); // X
          s.line(0, -half, 0, 0, half, 0); // Y
          s.line(0, 0, -half, 0, 0, half); // Z
          

          s.pop();
          // After drawing the axis lines...
labelAt(half, 0, 0, "x", "rgba(255,255,255,0.85)");
labelAt(0, half, 0, "y", "rgba(255,255,255,0.85)");
labelAt(0, 0, half, "z", "rgba(255,255,255,0.85)");

        };

        const drawVector = (v: Vec3, col: string) => {
          const sc = stateRef.current.scale;
          s.push();
          s.stroke(col);
          s.strokeWeight(4);
          s.line(0, 0, 0, v.x * sc, -v.y * sc, v.z * sc);
          s.pop();
        };

        const drawHandleSphere = (v: Vec3, col: string) => {
          const sc = stateRef.current.scale;
          s.push();
          s.translate(v.x * sc, -v.y * sc, v.z * sc);
          s.noStroke();
          s.fill(col);
          s.sphere(8, 14, 10);
          s.pop();
        };

        const drawUnitB3D = (B: Vec3) => {
          if (!stateRef.current.showUnitB) return;
          const ub = safeUnit(B);
          if (!ub) return;

          const sc = stateRef.current.scale;

          s.push();
          s.stroke("rgba(255,255,255,0.75)");
          s.strokeWeight(3);
          s.line(0, 0, 0, ub.x * sc, -ub.y * sc, ub.z * sc);
          s.pop();

          labelAt(
            ub.x * sc,
            -ub.y * sc,
            ub.z * sc,
            "û_b",
            "rgba(255,255,255,0.85)"
          );
        };

        const drawProjection3D = (A: Vec3, B: Vec3) => {
          if (!stateRef.current.showProjection) return;

          const pr = projOfAonB(A, B);
          if (![pr.x, pr.y, pr.z].every(Number.isFinite)) return;

          const sc = stateRef.current.scale;

          s.push();
          s.stroke(COLORS.proj);
          s.strokeWeight(4);
          s.line(0, 0, 0, pr.x * sc, -pr.y * sc, pr.z * sc);
          s.pop();

          s.push();
          s.stroke(
            stateRef.current.showPerp ? COLORS.perp : "rgba(255,255,255,0.18)"
          );
          s.strokeWeight(stateRef.current.showPerp ? 3 : 2);
          s.line(
            pr.x * sc,
            -pr.y * sc,
            pr.z * sc,
            A.x * sc,
            -A.y * sc,
            A.z * sc
          );
          s.pop();

          labelAt(pr.x * sc, -pr.y * sc, pr.z * sc, "proj_b(a)", COLORS.proj);
        };

        const drawShadowOnB = (A: Vec3, B: Vec3) => {
          const ub = safeUnit(B);
          if (!ub) return;
          const sp = scalarProjOfAonB(A, B);
          if (!Number.isFinite(sp)) return;

          const shadow = mul(ub, sp);
          const sc = stateRef.current.scale;

          s.push();
          s.stroke("rgba(255,255,255,0.55)");
          s.strokeWeight(3);
          s.line(0, 0, 0, shadow.x * sc, -shadow.y * sc, shadow.z * sc);
          s.pop();

          labelAt(
            shadow.x * sc,
            -shadow.y * sc,
            shadow.z * sc,
            `shadow = ${sp.toFixed(2)}`,
            "rgba(255,255,255,0.75)"
          );
        };

      s.setup = () => {
  const { w, h } = getSize();
  W = w;
  H = h;

  s.pixelDensity(1);

  const renderer = s.createCanvas(W, H, (s as any).WEBGL); // ✅ WEBGL REQUIRED
  canvasEl = renderer.elt as HTMLCanvasElement;

  canvasEl.style.touchAction = "none";
  canvasEl.tabIndex = 0;
  canvasEl.style.outline = "none";
  canvasEl.focus?.();
};


        s.windowResized = () => {
          const { w, h } = getSize();
          W = w;
          H = h;
          s.resizeCanvas(W, H);
        };

        s.draw = () => {
          s.background(COLORS.bg);
          const st = stateRef.current;
          const A = st.a;
          const B = st.b;

          const zDown =
            st.depthMode || zHeldRef.current || (s as any).keyIsDown?.(90);

          if (!dragging) {
            (s as any).orbitControl?.(1, 1, 0.15);
          }

          s.ambientLight(120);
          s.directionalLight(255, 255, 255, 0.2, 0.4, -1);

          drawAxis();
          drawVector(A, COLORS.a);
          drawVector(B, COLORS.b);
          drawUnitB3D(B);

          drawShadowOnB(A, B);
          drawProjection3D(A, B);

          drawHandleSphere(A, COLORS.a);
          drawHandleSphere(B, COLORS.b);

          const sc = st.scale;
          labelAt(A.x * sc, -A.y * sc, A.z * sc, "a", COLORS.a);
          labelAt(B.x * sc, -B.y * sc, B.z * sc, "b", COLORS.b);

          s.push();
          s.resetMatrix();
          s.translate(-W / 2, -H / 2);
          s.noStroke();
          s.fill("rgba(255,255,255,0.75)");
          s.textSize(12);
          s.textAlign(s.LEFT, s.TOP);
          s.text(
            "3D: orbit drag • pick sphere to move • hold Z (or Depth mode) while dragging to change depth • Shift = no-snap",
            12,
            12
          );
          s.text(
            `Depth: ${zDown ? "ON" : "off"}  |  a.z=${st.a.z.toFixed(
              2
            )}  b.z=${st.b.z.toFixed(2)}`,
            12,
            28
          );
          s.pop();
        };

        s.mousePressed = () => {
canvasEl?.focus();
          const st = stateRef.current;
          const sc = st.scale;

          const aS = worldToScreen(st.a.x * sc, -st.a.y * sc, st.a.z * sc);
          const bS = worldToScreen(st.b.x * sc, -st.b.y * sc, st.b.z * sc);

          // normalize mouse to top-left if needed
          const mTL = normalizeToTopLeft({ x: s.mouseX, y: s.mouseY });
          const mx = mTL.x;
          const my = mTL.y;

          const hitA = handlesMemo.a && isNear(aS, mx, my, 22);
          const hitB = handlesMemo.b && isNear(bS, mx, my, 22);

          if (hitA && hitB) {
            const da = (aS!.sx - mx) ** 2 + (aS!.sy - my) ** 2;
            const db = (bS!.sx - mx) ** 2 + (bS!.sy - my) ** 2;
            dragging = da <= db ? "a" : "b";
          } else if (hitA) dragging = "a";
          else if (hitB) dragging = "b";
          else dragging = null;

          lastMouse = dragging ? { x: s.mouseX, y: s.mouseY } : null;
        };

        s.mouseDragged = (evt: any) => {
          if (!dragging) return;

          const st = stateRef.current;

          if (!lastMouse) lastMouse = { x: s.mouseX, y: s.mouseY };
          const dx = s.mouseX - lastMouse.x;
          const dy = s.mouseY - lastMouse.y;
          lastMouse = { x: s.mouseX, y: s.mouseY };

          // ✅ reliable Shift detection
          const shiftDown =
            !!evt?.shiftKey || (s as any).keyIsDown?.(16) || s.keyIsDown(16);

          const zDown =
            st.depthMode || zHeldRef.current || (s as any).keyIsDown?.(90);

          const spd = dragSpeed();
          const zMult = 4;

          const cur = dragging === "a" ? st.a : st.b;
          let next: Vec3 = { ...cur };

          if (zDown) {
            next.z = cur.z + -dy * spd * zMult;
          } else {
            next.x = cur.x + dx * spd;
            next.y = cur.y + -dy * spd;
          }

          next = maybeSnap3(next, shiftDown);

          if (dragging === "a") emitPreview(next, st.b);
          else emitPreview(st.a, next);
        };

        s.mouseReleased = () => {
          if (dragging)
            emitCommit({ ...stateRef.current.a }, { ...stateRef.current.b });
          dragging = null;
          lastMouse = null;
        };
      };

      const sketch = mode === "2d" ? create2DSketch() : create3DSketch();
      p5Ref.current = new P5(sketch, mountRef.current);
    })();

    return () => {
      cancelled = true;
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [mode, previewThrottleMs, handlesMemo.a, handlesMemo.b]);

  return (
    <div ref={mountRef} className={className ?? "relative h-full w-full"} />
  );
}
