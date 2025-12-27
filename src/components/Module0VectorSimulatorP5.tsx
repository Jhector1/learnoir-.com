// Module0VectorSimulatorP5.tsx
// React + TypeScript + p5 + Tailwind (Module 0: vectors, dot, angle, projection)
//
// Install:
//   npm i p5
//   (optional TS types) npm i -D @types/p5
//
// Usage (Next.js):
//   "use client";
//   import Module0VectorSimulatorP5 from "@/components/Module0VectorSimulatorP5";
//   export default function Page(){ return <Module0VectorSimulatorP5 />; }

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import p5 from "p5";

type Vec2 = { x: number; y: number };
type QuestionType = "dot" | "angle" | "scalarProj" | "projX" | "projY";
type StatusKind = "idle" | "good" | "bad";

type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  correct: number;
  unit?: string;
  tolerance: number;
  createdAt: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function mag(v: Vec2) {
  return Math.hypot(v.x, v.y);
}
function dot(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}
function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}
function mul(a: Vec2, k: number): Vec2 {
  return { x: a.x * k, y: a.y * k };
}
function safeUnit(v: Vec2): Vec2 | null {
  const m = mag(v);
  if (!Number.isFinite(m) || m <= 1e-9) return null;
  return { x: v.x / m, y: v.y / m };
}
function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}
function fmt(n: number, d = 3) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}
function fmt2(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}
function angleBetween(a: Vec2, b: Vec2) {
  const ma = mag(a);
  const mb = mag(b);
  if (ma <= 1e-9 || mb <= 1e-9) return NaN;
  const c = clamp(dot(a, b) / (ma * mb), -1, 1);
  return Math.acos(c);
}
function projOfAonB(a: Vec2, b: Vec2): Vec2 {
  const bb = dot(b, b);
  if (bb <= 1e-9) return { x: NaN, y: NaN };
  const k = dot(a, b) / bb;
  return mul(b, k);
}
function scalarProjOfAonB(a: Vec2, b: Vec2) {
  const ub = safeUnit(b);
  if (!ub) return NaN;
  return dot(a, ub);
}

const COLORS = {
  bg: "#0b0d12",
  text: "rgba(232,236,255,0.92)",
  muted: "rgba(170,179,214,0.92)",
  a: "#7aa2ff",
  b: "#ff6bd6",
  proj: "#53f7b6",
  perp: "#ffdf6b",
  axis: "rgba(255,255,255,0.18)",
  grid: "rgba(255,255,255,0.07)",
};

export default function Module0VectorSimulatorP5() {
  // ----- UI state -----
  const [scale, setScale] = useState<number>(40); // px per unit
  const [gridStep, setGridStep] = useState<number>(1); // units
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  const [showGrid, setShowGrid] = useState(true);
  const [showComponents, setShowComponents] = useState(true);
  const [showAngle, setShowAngle] = useState(true);
  const [showProjection, setShowProjection] = useState(true);
  const [showUnitB, setShowUnitB] = useState(false);
  const [showPerp, setShowPerp] = useState(false);

  const [a, setA] = useState<Vec2>({ x: 3, y: 2 });
  const [b, setB] = useState<Vec2>({ x: 2, y: 4 });

  const [qType, setQType] = useState<QuestionType>("dot");
  const [answerText, setAnswerText] = useState<string>("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [status, setStatus] = useState<{ kind: StatusKind; msg: string }>({
    kind: "idle",
    msg: 'Click “New question”. Use overlays to reason visually, then answer.',
  });

  // ----- Refs for p5 + fast state inside draw loop -----
  const mountRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);

  const stateRef = useRef({
    scale,
    gridStep,
    snapToGrid,
    showGrid,
    showComponents,
    showAngle,
    showProjection,
    showUnitB,
    showPerp,
    a,
    b,
  });

  useEffect(() => {
    stateRef.current = {
      scale,
      gridStep,
      snapToGrid,
      showGrid,
      showComponents,
      showAngle,
      showProjection,
      showUnitB,
      showPerp,
      a,
      b,
    };
  }, [
    scale,
    gridStep,
    snapToGrid,
    showGrid,
    showComponents,
    showAngle,
    showProjection,
    showUnitB,
    showPerp,
    a,
    b,
  ]);

  // Throttle p5->React updates during drag
  const lastReactPush = useRef<number>(0);
  function pushVectors(nextA: Vec2, nextB: Vec2) {
    stateRef.current.a = nextA;
    stateRef.current.b = nextB;

    const now = performance.now();
    if (now - lastReactPush.current > 33) {
      lastReactPush.current = now;
      setA(nextA);
      setB(nextB);
    }
  }

  // Derived values for UI
  const derived = useMemo(() => {
    const aMag = mag(a);
    const bMag = mag(b);
    const d = dot(a, b);
    const ang = angleBetween(a, b);
    const cosv =
      aMag > 1e-9 && bMag > 1e-9 ? clamp(d / (aMag * bMag), -1, 1) : NaN;

    const proj = projOfAonB(a, b);
    const perp = sub(a, proj);
    const sp = scalarProjOfAonB(a, b);

    const aDir = Math.atan2(a.y, a.x);
    const bDir = Math.atan2(b.y, b.x);

    return {
      aMag,
      bMag,
      dot: d,
      angleDeg: radToDeg(ang),
      cos: cosv,
      proj,
      perp,
      scalarProj: sp,
      aDirDeg: radToDeg(aDir),
      bDirDeg: radToDeg(bDir),
    };
  }, [a, b]);

  // ----- Quiz helpers -----
  function buildQuestion(type: QuestionType): Question {
    const A = stateRef.current.a;
    const B = stateRef.current.b;

    const angDeg = radToDeg(angleBetween(A, B));
    const pr = projOfAonB(A, B);
    const sp = scalarProjOfAonB(A, B);

    let prompt = "";
    let correct = NaN;
    let unit = "";
    let tol = 0.05;

    switch (type) {
      case "dot":
        prompt = "Compute the dot product a · b";
        correct = dot(A, B);
        unit = "";
        tol = 0.25;
        break;
      case "angle":
        prompt = "Compute the angle θ between a and b (degrees)";
        correct = angDeg;
        unit = "°";
        tol = 1.0;
        break;
      case "scalarProj":
        prompt = "Compute the scalar projection of a on b (comp_b(a))";
        correct = sp;
        unit = "";
        tol = 0.25;
        break;
      case "projX":
        prompt = "Compute the x-component of proj_b(a)";
        correct = pr.x;
        unit = "";
        tol = 0.25;
        break;
      case "projY":
        prompt = "Compute the y-component of proj_b(a)";
        correct = pr.y;
        unit = "";
        tol = 0.25;
        break;
    }

    return {
      id: `${type}-${Date.now()}`,
      type,
      prompt,
      correct,
      unit,
      tolerance: tol,
      createdAt: Date.now(),
    };
  }

  function onNewQuestion() {
    const q = buildQuestion(qType);
    setQuestion(q);
    setAnswerText("");
    setStatus({
      kind: "idle",
      msg: `Question: ${q.prompt}. Enter a number (tolerance ±${q.tolerance}${q.unit ?? ""}).`,
    });
  }

  function parseAnswer(s: string) {
    const cleaned = s.replace(/[^\d\-+.eE]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  function onCheck() {
    if (!question) {
      setStatus({ kind: "bad", msg: "No active question. Click “New question” first." });
      return;
    }
    const user = parseAnswer(answerText);
    if (!Number.isFinite(user)) {
      setStatus({ kind: "bad", msg: "Please enter a valid number (e.g., 3.5 or -2)." });
      return;
    }
    const ok = Math.abs(user - question.correct) <= question.tolerance;
    setStatus(
      ok
        ? { kind: "good", msg: `✅ Correct. ${user} is within tolerance.` }
        : { kind: "bad", msg: `❌ Not quite. You said ${user}. Try again using the overlays.` }
    );
  }

  function onReveal() {
    if (!question) {
      setStatus({ kind: "bad", msg: "No question to reveal. Click “New question” first." });
      return;
    }
    setStatus({
      kind: "good",
      msg: `Answer: ${question.correct.toFixed(3)}${question.unit ?? ""}`,
    });
  }

  // ----- Buttons -----
  function randomizeVectors() {
    const r = () => Math.round((Math.random() * 10 - 5) * 2) / 2; // step 0.5
    let A = { x: r(), y: r() };
    let B = { x: r(), y: r() };
    if (Math.hypot(B.x, B.y) < 1) B = { x: 3, y: 2 };
    if (Math.hypot(A.x, A.y) < 1) A = { x: 4, y: -1.5 };
    pushVectors(A, B);
    setA(A);
    setB(B);
    setStatus({ kind: "idle", msg: "Randomized vectors. Drag tips to explore." });
  }
  function resetVectors() {
    const A = { x: 3, y: 2 };
    const B = { x: 2, y: 4 };
    pushVectors(A, B);
    setA(A);
    setB(B);
    setStatus({ kind: "idle", msg: "Reset to default vectors." });
  }
  function zeroA() {
    const A = { x: 0, y: 0 };
    const B = stateRef.current.b;
    pushVectors(A, B);
    setA(A);
    setStatus({ kind: "idle", msg: "Set a = 0. Dot/projection becomes 0." });
  }
  function zeroB() {
    const A = stateRef.current.a;
    const B = { x: 0, y: 0 };
    pushVectors(A, B);
    setB(B);
    setStatus({ kind: "idle", msg: "Set b = 0. Projection/angle becomes undefined." });
  }

  // ----- p5 sketch -----
  useEffect(() => {
    if (!mountRef.current) return;

    // avoid double mount
    if (p5Ref.current) {
      p5Ref.current.remove();
      p5Ref.current = null;
    }

    const sketch = (s: p5) => {
      const getSize = () => {
        const el = mountRef.current!;
        const r = el.getBoundingClientRect();
        return { w: Math.max(320, r.width), h: Math.max(320, r.height) };
      };

      let W = 800;
      let H = 600;

      const origin = () => ({ x: W / 2, y: H / 2 });

      function worldToScreen(v: Vec2) {
        const o = origin();
        return {
          x: o.x + v.x * stateRef.current.scale,
          y: o.y - v.y * stateRef.current.scale,
        };
      }
      function screenToWorld(px: number, py: number): Vec2 {
        const o = origin();
        return {
          x: (px - o.x) / stateRef.current.scale,
          y: (o.y - py) / stateRef.current.scale,
        };
      }

      type DragTarget = "a" | "b" | null;
      let dragging: DragTarget = null;

      const dist2 = (ax: number, ay: number, bx: number, by: number) => {
        const dx = ax - bx;
        const dy = ay - by;
        return dx * dx + dy * dy;
      };

      function maybeSnap(v: Vec2, shiftDown: boolean) {
        if (!stateRef.current.snapToGrid) return v;
        if (shiftDown) return v;
        const step = Math.max(0.1, stateRef.current.gridStep);
        return {
          x: Math.round(v.x / step) * step,
          y: Math.round(v.y / step) * step,
        };
      }

      function drawArrow(from: { x: number; y: number }, to: { x: number; y: number }, col: string, weight = 3) {
        s.push();
        s.stroke(col);
        s.strokeWeight(weight);
        s.noFill();
        s.line(from.x, from.y, to.x, to.y);

        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = 12;

        s.push();
        s.translate(to.x, to.y);
        s.rotate(angle);
        s.line(0, 0, -headLen, -headLen * 0.55);
        s.line(0, 0, -headLen, headLen * 0.55);
        s.pop();

        s.pop();
      }

      function drawHandle(pos: { x: number; y: number }, col: string) {
        s.push();
        s.noStroke();
        s.fill(col);
        s.circle(pos.x, pos.y, 14);
        s.fill("rgba(0,0,0,0.35)");
        s.circle(pos.x, pos.y, 6);
        s.pop();
      }

      function drawGrid() {
        if (!stateRef.current.showGrid) return;
        s.push();

        const step = Math.max(0.25, stateRef.current.gridStep);
        const pxStep = step * stateRef.current.scale;
        const o = origin();

        s.stroke(COLORS.grid);
        s.strokeWeight(1);

        const maxX = Math.ceil(W / pxStep) + 2;
        const maxY = Math.ceil(H / pxStep) + 2;

        for (let i = -maxX; i <= maxX; i++) {
          const x = o.x + i * pxStep;
          s.line(x, 0, x, H);
        }
        for (let j = -maxY; j <= maxY; j++) {
          const y = o.y + j * pxStep;
          s.line(0, y, W, y);
        }

        s.stroke(COLORS.axis);
        s.strokeWeight(2);
        s.line(0, o.y, W, o.y);
        s.line(o.x, 0, o.x, H);

        s.pop();
      }

      function drawComponents(vec: Vec2, col: string) {
        if (!stateRef.current.showComponents) return;

        const o = origin();
        const tip = worldToScreen(vec);
        const xComp = worldToScreen({ x: vec.x, y: 0 });

        s.push();
        s.strokeWeight(2);
        s.stroke(col);

        s.line(o.x, o.y, xComp.x, xComp.y);
        s.line(xComp.x, xComp.y, tip.x, tip.y);

        s.noFill();
        s.stroke("rgba(255,255,255,0.20)");
        const m = 10;
        s.rect(xComp.x - Math.sign(vec.x || 1) * m, o.y - Math.sign(vec.y || 1) * m, m, m);

        s.pop();
      }

      function drawAngleArc(aV: Vec2, bV: Vec2) {
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

        // screen y is down => flip
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
      }

      function drawUnitB(bV: Vec2) {
        if (!stateRef.current.showUnitB) return;
        const ub = safeUnit(bV);
        if (!ub) return;

        const o = origin();
        const tip = worldToScreen(ub);
        drawArrow(o, tip, "rgba(255,255,255,0.55)", 3);

        s.push();
        s.noStroke();
        s.fill("rgba(255,255,255,0.75)");
        s.textSize(12);
        s.textAlign(s.LEFT, s.CENTER);
        s.text("û_b", tip.x + 10, tip.y);
        s.pop();
      }

      function drawProjection(aV: Vec2, bV: Vec2) {
        if (!stateRef.current.showProjection) return;

        const pr = projOfAonB(aV, bV);
        if (!Number.isFinite(pr.x) || !Number.isFinite(pr.y)) return;

        const o = origin();
        const aTip = worldToScreen(aV);
        const prTip = worldToScreen(pr);

        // proj vector
        drawArrow(o, prTip, COLORS.proj, 4);

        // segment from projection to a
        if (stateRef.current.showPerp) {
          s.push();
          s.stroke(COLORS.perp);
          s.strokeWeight(3);
          s.line(prTip.x, prTip.y, aTip.x, aTip.y);
          s.pop();
        } else {
          // dashed guide
          s.push();
          s.stroke("rgba(255,255,255,0.18)");
          s.strokeWeight(2);
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
          s.pop();
        }

        // right angle marker
        const bUnit = safeUnit(bV);
        if (bUnit) {
          const perpDir = { x: -bUnit.y, y: bUnit.x };
          const p0 = pr;
          const m = 0.35;
          const p1 = add(p0, mul(bUnit, m));
          const p2 = add(p0, mul(perpDir, m));

          const P0 = worldToScreen(p0);
          const P1 = worldToScreen(p1);
          const P2 = worldToScreen(p2);

          s.push();
          s.noFill();
          s.stroke("rgba(255,255,255,0.22)");
          s.strokeWeight(2);
          s.line(P0.x, P0.y, P1.x, P1.y);
          s.line(P0.x, P0.y, P2.x, P2.y);
          s.pop();
        }

        // label
        s.push();
        s.noStroke();
        s.fill(COLORS.proj);
        s.textSize(12);
        s.textAlign(s.LEFT, s.CENTER);
        s.text("proj₍b₎(a)", prTip.x + 10, prTip.y);
        s.pop();
      }

      function drawLabels(aV: Vec2, bV: Vec2) {
        const aTip = worldToScreen(aV);
        const bTip = worldToScreen(bV);

        s.push();
        s.noStroke();
        s.textSize(13);
        s.textAlign(s.LEFT, s.CENTER);

        s.fill(COLORS.a);
        s.text("a", aTip.x + 10, aTip.y);

        s.fill(COLORS.b);
        s.text("b", bTip.x + 10, bTip.y);

        s.pop();
      }

      s.setup = () => {
        const { w, h } = getSize();
        W = w;
        H = h;
        s.createCanvas(W, H).parent(mountRef.current!);
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
        drawUnitB(bV);
        drawComponents(aV, "rgba(122,162,255,0.55)");
        drawComponents(bV, "rgba(255,107,214,0.55)");

        drawProjection(aV, bV);
        drawUnitB(bV);
        drawAngleArc(aV, bV);

        drawArrow(o, worldToScreen(aV), COLORS.a, 4);
        drawArrow(o, worldToScreen(bV), COLORS.b, 4);

        drawHandle(worldToScreen(aV), COLORS.a);
        drawHandle(worldToScreen(bV), COLORS.b);

        drawLabels(aV, bV);

        s.push();
        s.noStroke();
        s.fill("rgba(255,255,255,0.75)");
        s.textSize(12);
        s.textAlign(s.LEFT, s.TOP);
        s.text("Drag tips • Shift = no-snap", 12, 12);
        s.pop();
      };

      s.mousePressed = () => {
        const st = stateRef.current;
        const aTip = worldToScreen(st.a);
        const bTip = worldToScreen(st.b);
        const mx = s.mouseX;
        const my = s.mouseY;

        const r2 = 14 * 14;
        if (dist2(mx, my, aTip.x, aTip.y) <= r2) dragging = "a";
        else if (dist2(mx, my, bTip.x, bTip.y) <= r2) dragging = "b";
        else dragging = null;
      };

      s.mouseDragged = () => {
        if (!dragging) return;

        const st = stateRef.current;
        const w = screenToWorld(s.mouseX, s.mouseY);

        const shiftDown = s.keyIsDown(16);
        const snapped = maybeSnap(w, shiftDown);

        if (dragging === "a") pushVectors(snapped, st.b);
        else pushVectors(st.a, snapped);
      };

      s.mouseReleased = () => {
        dragging = null;
        setA({ ...stateRef.current.a });
        setB({ ...stateRef.current.b });
      };
    };

    p5Ref.current = new p5(sketch);

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, []);

  // ----- Tailwind helpers -----
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_rgba(0,0,0,0.35)] overflow-hidden">
      {children}
    </div>
  );
const Toggle = ({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => {
  const id = React.useId();

  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 cursor-pointer touch-manipulation"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-extrabold text-white/70 pointer-events-none">
        {label}
      </span>

      <input
        id={id}
        type="checkbox"
        className="scale-110 cursor-pointer accent-white"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
      />
    </label>
  );
};


  const KV = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div className="text-xs font-extrabold text-white/70">{label}</div>
      <div className="font-extrabold tabular-nums text-white/90">{value}</div>
    </div>
  );

  const statusClass =
    status.kind === "good"
      ? "border-emerald-300/30 bg-emerald-300/10 text-white/90"
      : status.kind === "bad"
      ? "border-rose-300/30 bg-rose-300/10 text-white/90"
      : "border-white/10 bg-black/20 text-white/70";

  return (
    <div className="min-h-screen p-3 md:p-4 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT PANEL */}
        <Card>
          <div className="border-b border-white/10 bg-black/20 px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-black tracking-tight">Module 0 Visual Simulator</div>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-extrabold text-white/70">
                Vectors • Dot • Angle • Projection
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Drag vector tips. Toggle overlays to <span className="font-bold text-white/80">see</span> dot product,
              angle, and projection.
            </p>
          </div>

          {/* Controls */}
          <div className="border-b border-white/10 p-3">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">Scale (px per unit)</div>
              <div className="font-extrabold tabular-nums">{scale}</div>
            </div>
            <input
              className="mt-2 w-full"
              type="range"
              min={20}
              max={80}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />

            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">Snap to grid</div>
              <input
                type="checkbox"
                className="scale-110"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
              />
            </div>

            <div className="mt-2 grid grid-cols-[1fr_120px] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">Grid step (units)</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold tabular-nums text-white/90 outline-none"
                type="number"
                min={0.5}
                step={0.5}
                value={gridStep}
                onChange={(e) => setGridStep(Number(e.target.value))}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold hover:bg-emerald-300/15 active:translate-y-[1px]"
                onClick={randomizeVectors}
              >
                Randomize a & b
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 active:translate-y-[1px]"
                onClick={resetVectors}
              >
                Reset
              </button>
              <button
                className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-extrabold hover:bg-rose-300/15 active:translate-y-[1px]"
                onClick={zeroA}
              >
                Zero a
              </button>
              <button
                className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-extrabold hover:bg-rose-300/15 active:translate-y-[1px]"
                onClick={zeroB}
              >
                Zero b
              </button>
            </div>

            <p className="mt-2 text-xs text-white/60">
              Tip: Hold <span className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Shift</span>{" "}
              while dragging for smooth (no-snap) movement.
            </p>
          </div>

          {/* Overlays */}
          <div className="border-b border-white/10 p-3">
            <div className="mb-2 text-sm font-black">Overlays</div>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Show grid + axes" checked={showGrid} onChange={setShowGrid} />
              <Toggle label="Show components (x,y)" checked={showComponents} onChange={setShowComponents} />
              <Toggle label="Show angle θ" checked={showAngle} onChange={setShowAngle} />
              <Toggle label="Show projection" checked={showProjection} onChange={setShowProjection} />
              <Toggle label="Show unit vector of b" checked={showUnitB} onChange={setShowUnitB} />
              <Toggle label="Show perpendicular part" checked={showPerp} onChange={setShowPerp} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              Projection overlay draws <span className="font-bold text-white/80">proj₍b₎(a)</span> and the “error” from that
              projection to <span className="font-bold text-white/80">a</span>.
            </p>
          </div>

          {/* Live Math */}
          <div className="border-b border-white/10 p-3">
            <div className="mb-2 text-sm font-black">Live Math</div>

            <div className="grid grid-cols-3 gap-2">
              <KV label="a = (ax, ay)" value={`(${fmt2(a.x)}, ${fmt2(a.y)})`} />
              <KV label="|a|" value={fmt(derived.aMag)} />
              <KV label="dir(a)" value={`${fmt2(derived.aDirDeg)}°`} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <KV label="b = (bx, by)" value={`(${fmt2(b.x)}, ${fmt2(b.y)})`} />
              <KV label="|b|" value={fmt(derived.bMag)} />
              <KV label="dir(b)" value={`${fmt2(derived.bDirDeg)}°`} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <KV label="a · b" value={fmt(derived.dot)} />
              <KV label="θ (deg)" value={fmt2(derived.angleDeg)} />
              <KV label="cos(θ)" value={fmt(derived.cos)} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <KV label="scalar proj comp_b(a)" value={fmt(derived.scalarProj)} />
              <KV label="proj_b(a)" value={`(${fmt(derived.proj.x)}, ${fmt(derived.proj.y)})`} />
              <KV label="a⊥" value={`(${fmt(derived.perp.x)}, ${fmt(derived.perp.y)})`} />
            </div>

            <div className="mt-3 space-y-1 text-xs leading-relaxed text-white/60">
              <div>• a·b = ax·bx + ay·by</div>
              <div>• cos(θ) = (a·b) / (|a||b|)</div>
              <div>• proj₍b₎(a) = ((a·b)/(b·b)) b</div>
              <div>• a = proj₍b₎(a) + a⊥</div>
            </div>
          </div>

          {/* Practice Mode */}
          <div className="p-3">
            <div className="mb-2 text-sm font-black">Practice Mode</div>

            <div className="grid grid-cols-[1fr_170px] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">Question type</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold text-white/90 outline-none"
                value={qType}
                onChange={(e) => setQType(e.target.value as QuestionType)}
              >
                <option value="dot">Dot product a·b</option>
                <option value="angle">Angle θ (degrees)</option>
                <option value="scalarProj">Scalar projection</option>
                <option value="projX">proj_b(a) x-component</option>
                <option value="projY">proj_b(a) y-component</option>
              </select>
            </div>

            <div className="mt-2 grid grid-cols-[1fr_170px] items-center gap-2">
              <div className="text-xs font-extrabold text-white/70">Your answer</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-extrabold tabular-nums text-white/90 outline-none"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="e.g. 3.5"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold hover:bg-emerald-300/15 active:translate-y-[1px]"
                onClick={onNewQuestion}
              >
                New question
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 active:translate-y-[1px]"
                onClick={onCheck}
              >
                Check
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 active:translate-y-[1px]"
                onClick={onReveal}
              >
                Reveal
              </button>
            </div>

            <div className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed ${statusClass}`}>
              {question ? (
                <div className="mb-1">
                  <span className="font-extrabold text-white/90">Active:</span>{" "}
                  <span className="text-white/80">{question.prompt}</span>
                </div>
              ) : null}
              {status.msg}
            </div>
          </div>
        </Card>

        {/* CANVAS */}
        <div className="relative min-h-[520px] lg:min-h-[calc(100vh-28px)]">
          <div className="h-full w-full rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_18px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <div ref={mountRef} className="h-full w-full min-h-[520px]" />
          </div>

          {/* HUD */}
          <div className="pointer-events-none absolute inset-3 flex items-start justify-between gap-3">
            <div className="max-w-[520px] rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
              <div className="text-sm font-black">How to use</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                Drag the <span className="font-extrabold" style={{ color: COLORS.a }}>blue</span> tip for <b>a</b> and the{" "}
                <span className="font-extrabold" style={{ color: COLORS.b }}>pink</span> tip for <b>b</b>. Dot product meaning:
                <b> positive</b> = acute, <b>0</b> = orthogonal, <b>negative</b> = obtuse.
              </p>
            </div>

            <div className="max-w-[420px] text-right rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
              <div className="text-sm font-black">Legend</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                <span className="font-extrabold" style={{ color: COLORS.a }}>a</span>,{" "}
                <span className="font-extrabold" style={{ color: COLORS.b }}>b</span>,{" "}
                <span className="font-extrabold" style={{ color: COLORS.proj }}>proj₍b₎(a)</span>,{" "}
                <span className="font-extrabold" style={{ color: COLORS.perp }}>a⊥</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Small responsive note */}
      <div className="mt-3 text-xs text-white/50">
        Mobile: drag with your finger. Desktop: hold <span className="font-mono">Shift</span> for smooth movement.
      </div>
    </div>
  );
}
