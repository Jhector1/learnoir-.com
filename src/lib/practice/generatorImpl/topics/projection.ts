// src/lib/practice/generator/topics/projection.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, dot, mag2D, roundTo } from "../utils";
import { RNG } from "../rng";

export function genProjection(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "proj_numeric" as const, w: 6 },
    { value: "proj_concept" as const, w: diff === "easy" ? 5 : 3 },
    { value: "proj_sign" as const, w: diff === "hard" ? 5 : 2 },
  ]);

  const A = nonZeroVec(rng, diff);
  const B = nonZeroVec(rng, diff);
  const bMag = mag2D(B);
  const scalarProjExact = bMag > 1e-9 ? dot(A, B) / bMag : 0;

  if (archetype === "proj_concept") {
    const exercise: Exercise = {
      id,
      topic: "projection",
      difficulty: diff,
      kind: "single_choice",
      title: "Projection concept",
      prompt: "Which statement is always true?",
      options: [
        { id: "parallel", text: "proj_b(a) is parallel to b" },
        { id: "perp", text: "proj_b(a) is always perpendicular to b" },
        { id: "sameLen", text: "proj_b(a) always has length |a|" },
        { id: "undef", text: "proj_b(a) is undefined if b ≠ 0" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "parallel" } };
  }

  if (archetype === "proj_sign") {
    const sign =
      Math.abs(scalarProjExact) < 1e-9 ? "zero" : scalarProjExact > 0 ? "positive" : "negative";

    const exercise: Exercise = {
      id,
      topic: "projection",
      difficulty: diff,
      kind: "single_choice",
      title: "Projection sign",
      prompt: `Consider the scalar projection of a onto b for a=(${A.x}, ${A.y}), b=(${B.x}, ${B.y}). What is the sign?`,
      options: [
        { id: "positive", text: "Positive" },
        { id: "zero", text: "Zero" },
        { id: "negative", text: "Negative" },
        { id: "depends", text: "Depends on |a|, cannot be determined" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: sign } };
  }

  // proj_numeric
  const decimals = diff === "easy" ? 1 : 2;
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

  return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
}
