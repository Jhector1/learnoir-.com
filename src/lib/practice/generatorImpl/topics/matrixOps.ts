// src/lib/practice/generator/topics/matrixOps.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { make2x2, fmt2x2 } from "../utils";

export function genMatrixOps(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "entry_AB" as const, w: 4 },
    { value: "dims_defined" as const, w: 3 },
    { value: "entry_AplusB" as const, w: 2 },
    { value: "entry_Av" as const, w: diff === "hard" ? 3 : 2 },
  ]);

  const range = diff === "easy" ? 3 : diff === "medium" ? 6 : 9;

  if (archetype === "dims_defined") {
    const A = rng.pick([{ r: 2, c: 3 }, { r: 3, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 3 }] as const);
    const B = rng.pick([{ r: 2, c: 3 }, { r: 3, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 1 }] as const);
    const ok = A.c === B.r;

    const exercise: Exercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "single_choice",
      title: "Is AB defined?",
      prompt: `A is ${A.r}×${A.c} and B is ${B.r}×${B.c}. Is the product AB defined?`,
      options: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: ok ? "yes" : "no" } };
  }

  if (archetype === "entry_AplusB") {
    const A = make2x2(rng, range);
    const B = make2x2(rng, range);
    const val = A[1][0] + B[1][0];

    const exercise: Exercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "numeric",
      title: "Matrix addition entry",
      prompt: `Let A=${fmt2x2(A)} and B=${fmt2x2(B)}.\nCompute (A + B)₂₁ (row 2, col 1).`,
      hint: "Addition is entrywise.",
      correctValue: val,
      tolerance: 0,
    } as any;

    return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
  }

  if (archetype === "entry_Av") {
    const A = make2x2(rng, range);
    const v = { x: rng.int(-range, range), y: rng.int(-range, range) };
    const val = A[0][0] * v.x + A[0][1] * v.y;

    const exercise: Exercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "numeric",
      title: "Matrix–vector multiply",
      prompt: `Let A=${fmt2x2(A)} and v=(${v.x}, ${v.y}).\nCompute the first component of Av.`,
      hint: "First component = row1(A) · v",
      correctValue: val,
      tolerance: 0,
    } as any;

    return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
  }

  // entry_AB
  const A = make2x2(rng, range);
  const B = make2x2(rng, range);
  const val = A[0][0] * B[0][0] + A[0][1] * B[1][0];

  const exercise: Exercise = {
    id,
    topic: "matrix_ops",
    difficulty: diff,
    kind: "numeric",
    title: "Matrix multiplication entry",
    prompt: `Let A=${fmt2x2(A)} and B=${fmt2x2(B)}.\nCompute (AB)₁₁ (top-left entry).`,
    hint: "Top-left = row1(A) · col1(B).",
    correctValue: val,
    tolerance: 0,
  } as any;

  return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
}
