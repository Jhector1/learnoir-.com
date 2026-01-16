// src/lib/practice/templates.ts
import type { PracticeDifficulty, PracticeTopic } from "@prisma/client";
import type { ExercisePublic, Vec3 } from "./serverTypes";

export type Generated = {
  title: string;
  prompt: string;
  topic: string;
  kind: ExercisePublic["kind"];
  publicPayload: ExercisePublic;
  secretPayload: any; // correct/tolerance/etc
};

function rBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function rInt(min: number, max: number) {
  return Math.floor(rBetween(min, max + 1));
}
function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function roundStep(n: number, step: number) {
  return Math.round(n / step) * step;
}
function vec2(difficulty: PracticeDifficulty): Vec3 {
  const step = difficulty === "easy" ? 1 : difficulty === "medium" ? 0.5 : 0.25;
  const span = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  return { x: roundStep(rBetween(-span, span), step), y: roundStep(rBetween(-span, span), step), z: 0 };
}
function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function mag(a: Vec3) {
  return Math.hypot(a.x, a.y, a.z);
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function angleDeg(a: Vec3, b: Vec3) {
  const ma = mag(a);
  const mb = mag(b);
  if (ma < 1e-9 || mb < 1e-9) return NaN;
  const c = clamp(dot(a, b) / (ma * mb), -1, 1);
  return (Math.acos(c) * 180) / Math.PI;
}

// --- Templates ---

export function generateSingleChoiceDotConcept(difficulty: PracticeDifficulty): Generated {
  const options = [
    { id: "a", text: "A scalar number" },
    { id: "b", text: "A vector" },
    { id: "c", text: "A matrix" },
    { id: "d", text: "Always 0" },
  ];
  return {
    topic: "dot",
    kind: "single_choice",
    title: "Dot product basics",
    prompt: "What type of quantity is the dot product a · b?",
    publicPayload: {
      topic: "dot",
      kind: "single_choice",
      title: "Dot product basics",
      prompt: "What type of quantity is the dot product a · b?",
      options,
    },
    secretPayload: { correctOptionId: "a", explanation: "The dot product returns a scalar (a number)." },
  };
}

export function generateNumericDotCompute(difficulty: PracticeDifficulty): Generated {
  const a = vec2(difficulty);
  const b = vec2(difficulty);
  // keep b non-zero
  if (mag(b) < 1) b.x = 2;

  const correct = dot(a, b);
  const tol = difficulty === "easy" ? 0 : difficulty === "medium" ? 0.25 : 0.5;

  return {
    topic: "dot",
    kind: "numeric",
    title: "Compute a · b",
    prompt: `Let a = (${a.x}, ${a.y}) and b = (${b.x}, ${b.y}). Compute a · b.`,
    publicPayload: {
      topic: "dot",
      kind: "numeric",
      title: "Compute a · b",
      prompt: `Let a = (${a.x}, ${a.y}) and b = (${b.x}, ${b.y}). Compute a · b.`,
      hint: "Use a · b = ax*bx + ay*by.",
    },
    secretPayload: { correct, tolerance: tol, explanation: `a·b = ${a.x}*${b.x} + ${a.y}*${b.y} = ${correct}.` },
  };
}

export function generateNumericAngle(difficulty: PracticeDifficulty): Generated {
  const a = vec2(difficulty);
  const b = vec2(difficulty);
  if (mag(b) < 1) b.y = 2;

  const correct = angleDeg(a, b);
  const tol = difficulty === "easy" ? 2 : difficulty === "medium" ? 1 : 0.5;

  return {
    topic: "angle",
    kind: "numeric",
    title: "Angle between vectors",
    prompt: `Let a = (${a.x}, ${a.y}) and b = (${b.x}, ${b.y}). Compute θ in degrees.`,
    publicPayload: {
      topic: "angle",
      kind: "numeric",
      title: "Angle between vectors",
      prompt: `Let a = (${a.x}, ${a.y}) and b = (${b.x}, ${b.y}). Compute θ in degrees.`,
      hint: "Use cos θ = (a·b)/(|a||b|).",
      unit: "°",
    },
    secretPayload: {
      correct,
      tolerance: tol,
      explanation: `Compute cosθ = (a·b)/(|a||b|), then θ = arccos(cosθ) in degrees.`,
    },
  };
}

export function generateVectorDragTarget(difficulty: PracticeDifficulty): Generated {
  const initialA = vec2(difficulty);
  const targetA = vec2(difficulty);

  const tol = difficulty === "easy" ? 0.0 : difficulty === "medium" ? 0.5 : 0.75;

  return {
    topic: "vectors",
    kind: "vector_drag_target",
    title: "Drag vector a to target",
    prompt: "Drag a (blue) to match the target coordinates.",
    publicPayload: {
      topic: "vectors",
      kind: "vector_drag_target",
      title: "Drag vector a to target",
      prompt: "Drag a (blue) to match the target coordinates.",
      initialA,
      initialB: { x: 2, y: 1, z: 0 },
      lockB: true,
      targetA,
      tolerance: tol,
    },
    secretPayload: {
      targetA,
      tolerance: tol,
      explanation: `You’re correct when |a - a*| ≤ ${tol}.`,
    },
  };
}

export function generateVectorDragDot(difficulty: PracticeDifficulty): Generated {
  const b = vec2(difficulty);
  if (mag(b) < 1) b.x = 2;

  const initialA = vec2(difficulty);

  const targetDot = roundStep(rBetween(-20, 20), difficulty === "easy" ? 1 : 0.5);
  const tol = difficulty === "easy" ? 0.5 : difficulty === "medium" ? 1 : 1.5;

  return {
    topic: "dot",
    kind: "vector_drag_dot",
    title: "Drag a so that a · b hits a target",
    prompt: "Drag a (blue) until the dot product matches the target.",
    publicPayload: {
      topic: "dot",
      kind: "vector_drag_dot",
      title: "Drag a so that a · b hits a target",
      prompt: "Drag a (blue) until the dot product matches the target.",
      initialA,
      b,
      targetDot,
      tolerance: tol,
    },
    secretPayload: {
      b,
      targetDot,
      tolerance: tol,
      explanation: `Correct when |a·b - ${targetDot}| ≤ ${tol}.`,
    },
  };
}

export function getGeneratorsByTopic(topic: string) {
  switch (topic) {
    case "dot":
      return [generateSingleChoiceDotConcept, generateNumericDotCompute, generateVectorDragDot];
    case "angle":
      return [generateNumericAngle];
    case "vectors":
      return [generateVectorDragTarget];
    case "projection":
      // projection templates can be added next (same pattern)
      return [generateNumericDotCompute]; // placeholder to keep section working
    default:
      return [generateNumericDotCompute];
  }
}

export function generateAny(topic: string, difficulty: PracticeDifficulty): Generated {
  const gens = getGeneratorsByTopic(topic);
  return pick(gens)(difficulty);
}
