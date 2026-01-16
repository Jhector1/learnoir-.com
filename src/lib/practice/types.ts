// src/lib/practice/types.ts
export type Difficulty = "easy" | "medium" | "hard";

/**
 * DB-facing slug (unlimited).
 * Canonical topic id for UI + URL + DB.
 */
export type TopicSlug = string;

/**
 * @deprecated Use TopicSlug. Kept for backward compatibility.
 */
export type Topic = TopicSlug;

/**
 * Generator engine keys (ONLY engines you implement).
 */
export type GenKey =
  | "dot"
  | "projection"
  | "angle"
  | "vectors"
  | "vectors_part1"
  | "vectors_part2"
  | "linear_systems"
  | "augmented"
  | "rref"
  | "solution_types"
  | "parametric"
  | "matrix_ops"
  | "matrix_inverse"
  | "matrix_properties"
  | "matrices_part1";

export type ExerciseKind =
  | "single_choice"
  | "multi_choice"
  | "numeric"
  | "vector_drag_target"
  | "vector_drag_dot"
    | "matrix_input"; // ✅ NEW;

export type Vec3 = { x: number; y: number; z?: number };

export type ExerciseBase = {
  id: string;
  topic: TopicSlug; // ✅ DB slug always
  difficulty: Difficulty;
  title: string;
  prompt: string;
};

export type SingleChoiceExercise = ExerciseBase & {
  kind: "single_choice";
  options: { id: string; text: string }[];
  hint?: string;
};
export type MatrixInputExercise = ExerciseBase & {
  kind: "matrix_input";
  rows: number;
  cols: number;
  tolerance: number; // per-entry tolerance
  hint?: string;
  /**
   * Optional display / UX flags:
   * - step: for input stepping
   * - integerOnly: enforce integer parsing on submit
   */
  step?: number;
  integerOnly?: boolean;
};


export type MultiChoiceExercise = ExerciseBase & {
  kind: "multi_choice";
  options: { id: string; text: string }[];
};

export type NumericExercise = ExerciseBase & {
  kind: "numeric";
  hint?: string;
  tolerance?: number;
  /**
   * Optional; don’t include in production payloads if you don’t want to leak answers.
   * Validation should rely on signed expected.
   */
  correctValue?: number;
};

export type VectorDragTargetExercise = ExerciseBase & {
  kind: "vector_drag_target";
  initialA: Vec3;
  initialB?: Vec3;
  targetA: Vec3;
  lockB: boolean;
  tolerance: number;
};

export type VectorDragDotExercise = ExerciseBase & {
  kind: "vector_drag_dot";
  initialA: Vec3;
  b: Vec3;
  targetDot: number;
  tolerance: number;
};

export type Exercise =
  | SingleChoiceExercise
  | MultiChoiceExercise
  | NumericExercise
  | VectorDragTargetExercise
  | VectorDragDotExercise
  | MatrixInputExercise; // ✅ include

export type SubmitAnswer =
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "numeric"; value: number }
  | { kind: "vector_drag_target"; a: Vec3; b: Vec3 }
  | { kind: "vector_drag_dot"; a: Vec3 }
  | { kind: "matrix_input"; values: number[][] }; // ✅ NEW

export type ValidateResponse = {
  ok: boolean;
  expected: any;
  explanation?: string;
};
