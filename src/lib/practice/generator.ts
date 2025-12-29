import type { Difficulty, Exercise, Topic, Vec3 } from "./types";

/** ---------------- randomness helpers ---------------- */

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randStep(min: number, max: number, step: number) {
  const n = randInt(Math.ceil(min / step), Math.floor(max / step));
  return n * step;
}

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(items: readonly { value: T; w: number }[]) {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function roundTo(n: number, decimals: number) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function mag2D(v: Vec3) {
  return Math.hypot(v.x, v.y);
}

/** ---------------- difficulty shaping ---------------- */

function vec2FromDifficulty(difficulty: Difficulty): Vec3 {
  if (difficulty === "easy") {
    return { x: randInt(-4, 4), y: randInt(-4, 4), z: 0 };
  }
  if (difficulty === "medium") {
    return { x: randStep(-7, 7, 0.5), y: randStep(-7, 7, 0.5), z: 0 };
  }
  return { x: randStep(-12, 12, 0.5), y: randStep(-12, 12, 0.5), z: 0 };
}

function nonZeroVec(difficulty: Difficulty): Vec3 {
  let v = vec2FromDifficulty(difficulty);
  let tries = 0;
  while (Math.abs(v.x) + Math.abs(v.y) < 1 && tries < 40) {
    v = vec2FromDifficulty(difficulty);
    tries++;
  }
  // avoid b≈0 for projection
  return v;
}

function toleranceFor(difficulty: Difficulty, kind: Exercise["kind"]) {
  // numeric tolerances should match "human rounding"
  if (kind === "numeric") {
    if (difficulty === "easy") return 0.5;
    if (difficulty === "medium") return 0.15;
    return 0.05;
  }
  if (kind === "vector_drag_dot" || kind === "vector_drag_target") {
    if (difficulty === "easy") return 0.5;
    if (difficulty === "medium") return 0.35;
    return 0.25;
  }
  return 0.25;
}

function normalizeTopic(t: Topic | "all"): Topic {
  const topics: Topic[] = ["dot", "projection", "angle", "vectors"];
  return t === "all" ? pick(topics) : t;
}

function normalizeDifficulty(d: Difficulty | "all"): Difficulty {
  if (d === "all") {
    // slight bias toward medium
    return pickWeighted([
      { value: "easy" as const, w: 2 },
      { value: "medium" as const, w: 5 },
      { value: "hard" as const, w: 3 },
    ]);
  }
  return d;
}

/** ---------------- expected payload (server-side signing) ---------------- */

export type Expected =
  | { kind: "numeric"; value: number; tolerance: number }
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "vector_drag_target"; targetA: Vec3; tolerance: number; lockB: boolean }
  | { kind: "vector_drag_dot"; targetDot: number; tolerance: number };

/**
 * ✅ New function for API route:
 * returns { exercise, expected } so you can sign expected and keep frontend format unchanged.
 */
export async function getExerciseWithExpected(
  topic: Topic | "all",
  difficulty: Difficulty | "all"
): Promise<{ exercise: Exercise; expected: Expected }> {
  const finalTopic = normalizeTopic(topic);
  const diff = normalizeDifficulty(difficulty);

  const id = `${finalTopic}-${diff}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  /** ---------- DOT TOPIC: diverse ---------- */
  if (finalTopic === "dot") {
    const archetype = pickWeighted([
      // easy: more inference, less arithmetic
      { value: "dot_classify" as const, w: diff === "easy" ? 5 : 1 },
      // medium/hard: computation + traps
      { value: "dot_numeric" as const, w: diff === "easy" ? 2 : 6 },
      // drag is fun for all
      { value: "dot_drag" as const, w: 3 },
      // word problem flavor
      { value: "dot_word_work" as const, w: diff === "hard" ? 4 : 2 },
    ]);

    const A = nonZeroVec(diff);
    const B = nonZeroVec(diff);
    const target = dot(A, B);

    if (archetype === "dot_drag") {
      const exercise: Exercise = {
        id,
        topic: "dot",
        difficulty: diff,
        kind: "vector_drag_dot",
        title: diff === "hard" ? "Drag: hit a dot target" : "Drag to match dot",
        prompt:
          diff === "hard"
            ? "Drag a so that a · b ≈ target (watch the sign)."
            : "Drag a so that a · b ≈ target.",
        initialA: { x: 0, y: 0, z: 0 },
        b: B,
        targetDot: target,
        tolerance: toleranceFor(diff, "vector_drag_dot"),
      };

      return {
        exercise,
        expected: {
          kind: "vector_drag_dot",
          targetDot: target,
          tolerance: exercise.tolerance,
        },
      };
    }

    if (archetype === "dot_classify") {
      // classify by sign of dot without computing full value (mind game)
      const d = target;
      const correct =
        Math.abs(d) < 1e-9 ? "zero" : d > 0 ? "positive" : "negative";

      // always 4 options
      const options = [
        { id: "positive", text: "Positive (acute angle)" },
        { id: "zero", text: "Zero (perpendicular)" },
        { id: "negative", text: "Negative (obtuse angle)" },
        { id: "cannot", text: "Cannot be determined from given vectors" },
      ];

      const exercise: Exercise = {
        id,
        topic: "dot",
        difficulty: diff,
        kind: "single_choice",
        title: "Dot product sign",
        prompt: `For a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}), what is the sign of a · b?`,
        options,
      } as any;

      return { exercise, expected: { kind: "single_choice", optionId: correct } };
    }

    if (archetype === "dot_word_work") {
      // word problem: Work = F · d
      const F = nonZeroVec(diff);
      const disp = nonZeroVec(diff);
      const work = dot(F, disp);

      // enforce more “realistic” numbers for hard (not too ugly)
      const decimals = diff === "easy" ? 0 : diff === "medium" ? 1 : 2;
      const rounded = roundTo(work, decimals);
      const tol = diff === "easy" ? 0.5 : diff === "medium" ? 0.2 : 0.05;

      const exercise: Exercise = {
        id,
        topic: "dot",
        difficulty: diff,
        kind: "numeric",
        title: "Work (dot product)",
        prompt: `A force F=(${F.x}, ${F.y}) N moves an object by displacement d=(${disp.x}, ${disp.y}) m. Compute the work W = F · d. ${
          decimals ? `Round to ${decimals} decimal place(s).` : ""
        }`,
        hint: "Work is a dot product: W = Fx·dx + Fy·dy",
        correctValue: rounded,
        tolerance: tol,
      } as any;

      return {
        exercise,
        expected: { kind: "numeric", value: rounded, tolerance: tol },
      };
    }

    // dot_numeric (classic)
    {
      const tol = toleranceFor(diff, "numeric");
      const exercise: Exercise = {
        id,
        topic: "dot",
        difficulty: diff,
        kind: "numeric",
        title: diff === "hard" ? "Dot product (tricky)" : "Dot product",
        prompt:
          diff === "hard"
            ? `Compute a · b for a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}). (Be careful with negatives.)`
            : `Compute a · b for a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}).`,
        hint: diff === "easy" ? "a · b = ax·bx + ay·by" : undefined,
        correctValue: target,
        tolerance: tol,
      } as any;

      return { exercise, expected: { kind: "numeric", value: target, tolerance: tol } };
    }
  }

  /** ---------- PROJECTION TOPIC: numeric + concept + trap ---------- */
  if (finalTopic === "projection") {
    const archetype = pickWeighted([
      { value: "proj_numeric" as const, w: 6 },
      { value: "proj_concept" as const, w: diff === "easy" ? 5 : 3 },
      { value: "proj_sign" as const, w: diff === "hard" ? 5 : 2 },
    ]);

    const A = nonZeroVec(diff);
    const B = nonZeroVec(diff);
    const bMag = mag2D(B);
    const scalarProjExact = bMag > 1e-9 ? dot(A, B) / bMag : 0;

    if (archetype === "proj_concept") {
      const options = [
        { id: "parallel", text: "proj_b(a) is parallel to b" },
        { id: "perp", text: "proj_b(a) is always perpendicular to b" },
        { id: "sameLen", text: "proj_b(a) always has length |a|" },
        { id: "undef", text: "proj_b(a) is undefined if b ≠ 0" },
      ];

      const exercise: Exercise = {
        id,
        topic: "projection",
        difficulty: diff,
        kind: "single_choice",
        title: "Projection concept",
        prompt: "Which statement is always true?",
        options,
      } as any;

      return { exercise, expected: { kind: "single_choice", optionId: "parallel" } };
    }

    if (archetype === "proj_sign") {
      const sign =
        Math.abs(scalarProjExact) < 1e-9
          ? "zero"
          : scalarProjExact > 0
          ? "positive"
          : "negative";

      const options = [
        { id: "positive", text: "Positive" },
        { id: "zero", text: "Zero" },
        { id: "negative", text: "Negative" },
        { id: "depends", text: "Depends on |a|, cannot be determined" },
      ];

      const exercise: Exercise = {
        id,
        topic: "projection",
        difficulty: diff,
        kind: "single_choice",
        title: "Projection sign (mind game)",
        prompt: `Consider the scalar projection of a onto b for a=(${A.x}, ${A.y}), b=(${B.x}, ${B.y}). What is the sign?`,
        options,
      } as any;

      return { exercise, expected: { kind: "single_choice", optionId: sign } };
    }

    // proj_numeric (with rounding rules)
    {
      const decimals = diff === "easy" ? 1 : diff === "medium" ? 2 : 2;
      const value = roundTo(scalarProjExact, decimals);
      const tol = diff === "easy" ? 0.2 : diff === "medium" ? 0.05 : 0.03;

      const exercise: Exercise = {
        id,
        topic: "projection",
        difficulty: diff,
        kind: "numeric",
        title: diff === "hard" ? "Scalar projection (tricky)" : "Scalar projection",
        prompt: `Compute the scalar projection of a onto b for a=(${A.x}, ${A.y}), b=(${B.x}, ${B.y}). Round to ${decimals} decimals.`,
        hint: diff === "easy" ? "scalar proj = (a·b)/|b|" : undefined,
        correctValue: value,
        tolerance: tol,
      } as any;

      return { exercise, expected: { kind: "numeric", value, tolerance: tol } };
    }
  }

  /** ---------- ANGLE TOPIC: numeric + classify + cosine trap ---------- */
  if (finalTopic === "angle") {
    const archetype = pickWeighted([
      { value: "angle_numeric" as const, w: 6 },
      { value: "angle_classify" as const, w: diff === "easy" ? 6 : 3 },
      { value: "cos_numeric" as const, w: diff === "hard" ? 5 : 2 },
    ]);

    const A = nonZeroVec(diff);
    const B = nonZeroVec(diff);

    const aMag = mag2D(A);
    const bMag = mag2D(B);
    const cosExact =
      aMag > 1e-9 && bMag > 1e-9 ? dot(A, B) / (aMag * bMag) : 1;
    const clamped = Math.max(-1, Math.min(1, cosExact));
    const angDegExact = (Math.acos(clamped) * 180) / Math.PI;

    if (archetype === "angle_classify") {
      const d = dot(A, B);
      const correct =
        Math.abs(d) < 1e-9 ? "right" : d > 0 ? "acute" : "obtuse";

      const options = [
        { id: "acute", text: "Acute (< 90°)" },
        { id: "right", text: "Right (= 90°)" },
        { id: "obtuse", text: "Obtuse (> 90°)" },
        { id: "cannot", text: "Cannot be determined without magnitudes" },
      ];

      const exercise: Exercise = {
        id,
        topic: "angle",
        difficulty: diff,
        kind: "single_choice",
        title: "Angle type (mind game)",
        prompt: `For a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}), classify the angle between them.`,
        options,
      } as any;

      return { exercise, expected: { kind: "single_choice", optionId: correct } };
    }

    if (archetype === "cos_numeric") {
      // tricky: compute cos(theta) directly
      const decimals = diff === "hard" ? 3 : 2;
      const value = roundTo(clamped, decimals);
      const tol = diff === "hard" ? 0.02 : 0.05;

      const exercise: Exercise = {
        id,
        topic: "angle",
        difficulty: diff,
        kind: "numeric",
        title: "Cosine of angle",
        prompt: `Compute cos(θ) between a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}). Round to ${decimals} decimals.`,
        hint: "cos(θ) = (a·b)/(|a||b|)",
        correctValue: value,
        tolerance: tol,
      } as any;

      return { exercise, expected: { kind: "numeric", value, tolerance: tol } };
    }

    // angle_numeric
    {
      const decimals = diff === "easy" ? 0 : diff === "medium" ? 1 : 1;
      const value = roundTo(angDegExact, decimals);
      const tol = diff === "easy" ? 3 : diff === "medium" ? 1.5 : 1.0;

      const exercise: Exercise = {
        id,
        topic: "angle",
        difficulty: diff,
        kind: "numeric",
        title: "Angle between vectors",
        prompt: `Compute the angle θ (degrees) between a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}). Round to ${decimals} decimals.`,
        hint: diff === "easy" ? "cos(θ) = (a·b)/(|a||b|)" : undefined,
        correctValue: value,
        tolerance: tol,
      } as any;

      return { exercise, expected: { kind: "numeric", value, tolerance: tol } };
    }
  }

  /** ---------- VECTORS TOPIC: drag target + perpendicular challenge ---------- */
  {
    const archetype = pickWeighted([
      { value: "drag_target" as const, w: 6 },
      { value: "drag_perp" as const, w: diff === "hard" ? 5 : 2 }, // fun + tricky
    ]);

    if (archetype === "drag_perp") {
      // use drag_dot with targetDot = 0 (perpendicular)
      const B = nonZeroVec(diff);
      const tol = toleranceFor(diff, "vector_drag_dot");

      const exercise: Exercise = {
        id,
        topic: "vectors",
        difficulty: diff,
        kind: "vector_drag_dot",
        title: "Drag: make perpendicular",
        prompt:
          diff === "hard"
            ? "Drag a so that a · b ≈ 0 (perpendicular). Try to do it with a not too small."
            : "Drag a so that a · b ≈ 0 (perpendicular).",
        initialA: { x: 0, y: 0, z: 0 },
        b: B,
        targetDot: 0,
        tolerance: tol,
      } as any;

      return { exercise, expected: { kind: "vector_drag_dot", targetDot: 0, tolerance: tol } };
    }

    // drag_target
    const targetA = nonZeroVec(diff);
    const initialA = { x: 0, y: 0, z: 0 };
    const initialB = nonZeroVec(diff);

    const lockB = diff !== "hard"; // hard allows moving B
    const tol = toleranceFor(diff, "vector_drag_target");

    const exercise: Exercise = {
      id,
      topic: "vectors",
      difficulty: diff,
      kind: "vector_drag_target",
      title: diff === "hard" ? "Drag to target (hard)" : "Drag to target",
      prompt:
        diff === "hard"
          ? "Drag a to match the target. (Hard: tolerance is tight.)"
          : "Drag a to match the target within tolerance.",
      initialA,
      initialB,
      targetA,
      lockB,
      tolerance: tol,
    } as any;

    return {
      exercise,
      expected: { kind: "vector_drag_target", targetA, tolerance: tol, lockB },
    };
  }
}

/**
 * ✅ Keep legacy signature: returns Exercise only.
 * (So any old imports won't break.)
 */
export async function getExercise(
  topic: Topic | "all",
  difficulty: Difficulty | "all"
): Promise<Exercise> {
  const { exercise } = await getExerciseWithExpected(topic, difficulty);
  return exercise;
}
