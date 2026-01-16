// src/lib/practice/generator/topics/vectors.ts
import type { Difficulty, Exercise, ExerciseKind, VectorDragDotExercise, VectorDragTargetExercise } from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, toleranceFor } from "../utils";
import { RNG } from "../rng";

export function genVectors(rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> {
  const archetype = rng.weighted([
    { value: "drag_target" as const, w: 6 },
    { value: "drag_perp" as const, w: diff === "hard" ? 5 : 2 },
  ]);

  if (archetype === "drag_perp") {
    const B = nonZeroVec(rng, diff);
    const tol = toleranceFor(diff, "vector_drag_dot");

    const exercise: VectorDragDotExercise = {
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
    };

    return { archetype, exercise, expected: { kind: "vector_drag_dot", targetDot: 0, tolerance: tol } };
  }

  const targetA = nonZeroVec(rng, diff);
  const initialA = { x: 0, y: 0, z: 0 };
  const initialB = nonZeroVec(rng, diff);

  const lockB = diff !== "hard";
  const tol = toleranceFor(diff, "vector_drag_target");

  const exercise: VectorDragTargetExercise = {
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
  };

  return { archetype, exercise, expected: { kind: "vector_drag_target", targetA, tolerance: tol, lockB } };
}
