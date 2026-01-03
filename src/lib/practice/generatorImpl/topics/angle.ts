// src/lib/practice/generator/topics/angle.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, dot, mag2D, roundTo } from "../utils";
import { RNG } from "../rng";

export function genAngle(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "angle_numeric" as const, w: 6 },
    { value: "angle_classify" as const, w: diff === "easy" ? 6 : 3 },
    { value: "cos_numeric" as const, w: diff === "hard" ? 5 : 2 },
  ]);

  const A = nonZeroVec(rng, diff);
  const B = nonZeroVec(rng, diff);

  const aMag = mag2D(A);
  const bMag = mag2D(B);
  const cosExact = aMag > 1e-9 && bMag > 1e-9 ? dot(A, B) / (aMag * bMag) : 1;
  const clamped = Math.max(-1, Math.min(1, cosExact));
  const angDegExact = (Math.acos(clamped) * 180) / Math.PI;

  if (archetype === "angle_classify") {
    const d = dot(A, B);
    const correct = Math.abs(d) < 1e-9 ? "right" : d > 0 ? "acute" : "obtuse";

    const exercise: Exercise = {
      id,
      topic: "angle",
      difficulty: diff,
      kind: "single_choice",
      title: "Angle type",
      prompt: `For a=(${A.x}, ${A.y}) and b=(${B.x}, ${B.y}), classify the angle between them.`,
      options: [
        { id: "acute", text: "Acute (< 90°)" },
        { id: "right", text: "Right (= 90°)" },
        { id: "obtuse", text: "Obtuse (> 90°)" },
        { id: "cannot", text: "Cannot be determined without magnitudes" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: correct } };
  }

  if (archetype === "cos_numeric") {
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

    return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
  }

  // angle_numeric
  const decimals = diff === "easy" ? 0 : 1;
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

  return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
}
