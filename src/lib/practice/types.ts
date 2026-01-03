export type Difficulty = "easy" | "medium" | "hard";
export type Topic =
  // Module 0
  | "dot"
  | "projection"
  | "angle"
  | "vectors"
  // Module 1
  | "linear_systems"
  | "augmented"
  | "rref"
  | "solution_types"
  | "parametric"
  // Module 2
  | "matrix_ops"
  | "matrix_inverse"
  | "matrix_properties";


export type Vec3 = { x: number; y: number; z: number };

export type ExerciseBase = {
  id: string;
  topic: Topic;
  difficulty: Difficulty;
  title: string;
  prompt: string;
};

export type SingleChoiceExercise = ExerciseBase & {
  kind: "single_choice";
  options: { id: string; text: string }[];
  correctOptionId: string;
    tolerance: number;
};

export type MultiChoiceExercise = ExerciseBase & {
  kind: "multi_choice";
  options: { id: string; text: string }[];
  correctOptionIds: string[];
    tolerance: number;
};

export type NumericExercise = ExerciseBase & {
  kind: "numeric";
  hint?: string;
  correctValue: number;
  tolerance: number;
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
  | VectorDragDotExercise;

export type SubmitAnswer =
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "numeric"; value: number }
  | { kind: "vector_drag_target"; a: Vec3; b: Vec3 }
  | { kind: "vector_drag_dot"; a: Vec3 };

export type ValidateResponse = {
  ok: boolean;
  expected: any;
  explanation?: string;
};
