// src/lib/practice/generator/expected.ts
import type { Exercise, ExerciseKind, Vec3 } from "../types";

// Expected payloads (grading only)
export type ExpectedByKind = {
  numeric: { kind: "numeric"; value: number; tolerance: number };
  single_choice: { kind: "single_choice"; optionId: string };
  multi_choice: { kind: "multi_choice"; optionIds: string[] };
  vector_drag_target: {
    kind: "vector_drag_target";
    targetA: Vec3;
    tolerance: number;
    lockB: boolean;
  };
  vector_drag_dot: { kind: "vector_drag_dot"; targetDot: number; tolerance: number };
};

export type Expected = ExpectedByKind[ExerciseKind];

// Helper: get the matching Exercise union member for a kind
export type ExerciseOf<K extends ExerciseKind> = Extract<Exercise, { kind: K }>;
export type ExpectedOf<K extends ExerciseKind> = ExpectedByKind[K];

// Type-safe output: exercise.kind MUST match expected.kind
export type GenOut<K extends ExerciseKind> = {
  exercise: ExerciseOf<K>;
  expected: ExpectedOf<K>;
  archetype: string;
};

// Convenience constructor (prevents mismatched kinds)
export function out<K extends ExerciseKind>(
  archetype: string,
  exercise: ExerciseOf<K>,
  expected: ExpectedOf<K>
): GenOut<K> {
  return { archetype, exercise, expected };
}
