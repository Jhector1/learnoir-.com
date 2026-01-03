// src/lib/practice/generator/expected.ts
import type { Vec3 } from "../types";

export type Expected =
  | { kind: "numeric"; value: number; tolerance: number }
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | {
      kind: "vector_drag_target";
      targetA: Vec3;
      tolerance: number;
      lockB: boolean;
    }
  | { kind: "vector_drag_dot"; targetDot: number; tolerance: number };

export type GenOut<TExercise> = {
  exercise: TExercise;
  expected: Expected;
  archetype: string; // useful for “anti-repeat” later
};
