import type { Difficulty, Exercise, Topic, Vec3 } from "./types";

function randInt(min: number, max: number) {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randStep(min: number, max: number, step: number) {
  const n = randInt(Math.ceil(min / step), Math.floor(max / step));
  return n * step;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec2FromDifficulty(difficulty: Difficulty): Vec3 {
  // ranges get bigger with difficulty
  if (difficulty === "easy") {
    return { x: randInt(-3, 3), y: randInt(-3, 3), z: 0 };
  }
  if (difficulty === "medium") {
    return { x: randStep(-6, 6, 0.5), y: randStep(-6, 6, 0.5), z: 0 };
  }
  return { x: randStep(-10, 10, 0.5), y: randStep(-10, 10, 0.5), z: 0 };
}

function nonZeroVec(difficulty: Difficulty): Vec3 {
  let v = vec2FromDifficulty(difficulty);
  let tries = 0;
  while (Math.abs(v.x) + Math.abs(v.y) < 1 && tries < 20) {
    v = vec2FromDifficulty(difficulty);
    tries++;
  }
  return v;
}

function toleranceFor(difficulty: Difficulty, kind: Exercise["kind"]) {
  // tighter tolerance as difficulty increases
  if (kind === "numeric") {
    if (difficulty === "easy") return 0.5;
    if (difficulty === "medium") return 0.25;
    return 0.15;
  }
  if (kind === "vector_drag_dot" || kind === "vector_drag_target") {
    if (difficulty === "easy") return 0.5;
    if (difficulty === "medium") return 0.35;
    return 0.25;
  }
  return 0.25;
}

function normalizeTopic(t: Topic | "all"): Topic {
  // if you pass "all", pick one
  const topics: Topic[] = ["dot", "projection", "angle", "vectors"];
  return t === "all" ? pick(topics) : t;
}

export async function getExercise(
  topic: Topic | "all",
  difficulty: Difficulty | "all"
): Promise<Exercise> {
  const finalTopic = normalizeTopic(topic);
  const diff: Difficulty =
    difficulty === "all" ? pick(["easy", "medium", "hard"]) : difficulty;

  const id = `${finalTopic}-${diff}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Choose an exercise kind depending on topic
  if (finalTopic === "dot") {
    // sometimes numeric dot, sometimes drag-to-dot
    const kind = pick<"numeric" | "vector_drag_dot">(["numeric", "vector_drag_dot"]);
    const A = nonZeroVec(diff);
    const B = nonZeroVec(diff);
    const target = dot(A, B);

    if (kind === "numeric") {
      return {
        id,
        topic: "dot",
        difficulty: diff,
        kind: "numeric",
        title: "Dot product",
        prompt: `Compute a · b for a = (${A.x}, ${A.y}) and b = (${B.x}, ${B.y}).`,
        hint: "a · b = ax·bx + ay·by",
        correctValue: target,
        tolerance: toleranceFor(diff, "numeric"),
      };
    }

    // drag a to hit target dot with fixed b
    return {
      id,
      topic: "dot",
      difficulty: diff,
      kind: "vector_drag_dot",
      title: "Drag to match dot",
      prompt: `Drag a so that a · b ≈ target.`,
      initialA: { x: 0, y: 0, z: 0 },
      b: B,
      targetDot: target,
      tolerance: toleranceFor(diff, "vector_drag_dot"),
    };
  }

  if (finalTopic === "projection") {
    const A = nonZeroVec(diff);
    const B = nonZeroVec(diff);
    // numeric: scalar projection length = (a·b)/|b|
    const bMag = Math.hypot(B.x, B.y);
    const scalarProj = bMag > 1e-9 ? dot(A, B) / bMag : 0;

    return {
      id,
      topic: "projection",
      difficulty: diff,
      kind: "numeric",
      title: "Scalar projection",
      prompt: `Compute the scalar projection of a onto b (shadow length on b) for a=(${A.x}, ${A.y}), b=(${B.x}, ${B.y}).`,
      hint: "scalar proj = (a·b)/|b|",
      correctValue: scalarProj,
      tolerance: toleranceFor(diff, "numeric"),
    };
  }

  if (finalTopic === "angle") {
    const A = nonZeroVec(diff);
    const B = nonZeroVec(diff);
    const aMag = Math.hypot(A.x, A.y);
    const bMag = Math.hypot(B.x, B.y);
    const cos = aMag > 1e-9 && bMag > 1e-9 ? dot(A, B) / (aMag * bMag) : 1;
    const clamped = Math.max(-1, Math.min(1, cos));
    const angDeg = (Math.acos(clamped) * 180) / Math.PI;

    return {
      id,
      topic: "angle",
      difficulty: diff,
      kind: "numeric",
      title: "Angle between vectors",
      prompt: `Compute the angle θ (degrees) between a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}).`,
      hint: "cos(θ) = (a·b) / (|a||b|)",
      correctValue: angDeg,
      tolerance: diff === "easy" ? 3 : diff === "medium" ? 2 : 1.25,
    };
  }

  // vectors topic: drag target
  {
    const targetA = nonZeroVec(diff);
    const initialA = { x: 0, y: 0, z: 0 };
    const initialB = nonZeroVec(diff);

    const lockB = diff !== "hard"; // example: only hard allows moving B
    return {
      id,
      topic: "vectors",
      difficulty: diff,
      kind: "vector_drag_target",
      title: "Drag to target",
      prompt: `Drag a to match the target a* within tolerance.`,
      initialA,
      initialB,
      targetA,
      lockB,
      tolerance: toleranceFor(diff, "vector_drag_target"),
    };
  }
}
