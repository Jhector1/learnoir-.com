// src/lib/practice/generator/topics/dot.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, dot as dot3, roundTo, toleranceFor } from "../utils";
import { RNG } from "../rng";

export function genDot(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "dot_classify" as const, w: diff === "easy" ? 5 : 1 },
    { value: "dot_numeric" as const, w: diff === "easy" ? 2 : 6 },
    { value: "dot_drag" as const, w: 3 },
    { value: "dot_word_work" as const, w: diff === "hard" ? 4 : 2 },
  ]);

  const A = nonZeroVec(rng, diff);
  const B = nonZeroVec(rng, diff);
  const target = dot3(A, B);

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
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "vector_drag_dot", targetDot: target, tolerance: exercise.tolerance },
    };
  }

  if (archetype === "dot_classify") {
    const d = target;
    const correct = Math.abs(d) < 1e-9 ? "zero" : d > 0 ? "positive" : "negative";

    const exercise: Exercise = {
      id,
      topic: "dot",
      difficulty: diff,
      kind: "single_choice",
      title: "Dot product sign",
      prompt: `For a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}), what is the sign of a · b?`,
      options: [
        { id: "positive", text: "Positive (acute angle)" },
        { id: "zero", text: "Zero (perpendicular)" },
        { id: "negative", text: "Negative (obtuse angle)" },
        { id: "cannot", text: "Cannot be determined from given vectors" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: correct } };
  }

  if (archetype === "dot_word_work") {
    const F = nonZeroVec(rng, diff);
    const disp = nonZeroVec(rng, diff);
    const work = dot3(F, disp);

    const decimals = diff === "easy" ? 0 : diff === "medium" ? 1 : 2;
    const rounded = roundTo(work, decimals);
    const tol = diff === "easy" ? 0.5 : diff === "medium" ? 0.2 : 0.05;

    const exercise: Exercise = {
      id,
      topic: "dot",
      difficulty: diff,
      kind: "numeric",
      title: "Work (dot product)",
      prompt: `A force F=(${F.x}, ${F.y}) N moves an object by displacement d=(${disp.x}, ${disp.y}) m. Compute W = F · d.${decimals ? ` Round to ${decimals} decimal place(s).` : ""}`,
      hint: "Work is a dot product: W = Fx·dx + Fy·dy",
      correctValue: rounded,
      tolerance: tol,
    } as any;

    return { archetype, exercise, expected: { kind: "numeric", value: rounded, tolerance: tol } };
  }

  // dot_numeric
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

  return { archetype, exercise, expected: { kind: "numeric", value: target, tolerance: tol } };
}
