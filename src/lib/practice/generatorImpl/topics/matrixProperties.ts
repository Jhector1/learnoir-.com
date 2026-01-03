// src/lib/practice/generator/topics/matrixProperties.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";

export function genMatrixProperties(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "always_true_multi" as const, w: 4 },
    { value: "identity_zero_trap" as const, w: 3 },
    { value: "noncomm_true" as const, w: 3 },
  ]);

  if (archetype === "identity_zero_trap") {
    const exercise: Exercise = {
      id,
      topic: "matrix_properties",
      difficulty: diff,
      kind: "single_choice",
      title: "Identity vs zero (trap)",
      prompt: "Which statement is always true for conformable matrices?",
      options: [
        { id: "A", text: "AI = IA = A" },
        { id: "B", text: "A0 = 0A = A" },
        { id: "C", text: "AB = BA for all A,B" },
        { id: "D", text: "(A + B)² = A² + B² always" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "A" } };
  }

  if (archetype === "noncomm_true") {
    const exercise: Exercise = {
      id,
      topic: "matrix_properties",
      difficulty: diff,
      kind: "single_choice",
      title: "Matrix rules",
      prompt: "Which statement is true?",
      options: [
        { id: "noncomm", text: "Matrix multiplication is generally not commutative: AB ≠ BA." },
        { id: "comm", text: "Matrix multiplication is commutative: AB = BA for all matrices." },
        { id: "distfalse", text: "A(B + C) ≠ AB + AC in general." },
        { id: "invalways", text: "Every square matrix has a matrix inverse." },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "noncomm" } };
  }

  const exercise: Exercise = {
    id,
    topic: "matrix_properties",
    difficulty: diff,
    kind: "multi_choice",
    title: "Matrix rules (select all true)",
    prompt: "Select all statements that are ALWAYS true.",
    options: [
      { id: "assoc", text: "(AB)C = A(BC)" },
      { id: "dist", text: "A(B + C) = AB + AC" },
      { id: "comm", text: "AB = BA for all A,B" },
      { id: "ident", text: "There exists I such that AI = IA = A" },
    ],
  } as any;

  return { archetype, exercise, expected: { kind: "multi_choice", optionIds: ["assoc", "dist", "ident"] } };
}
