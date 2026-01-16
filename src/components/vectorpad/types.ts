// src/components/vectorpad/types.ts
import type { Mode, Vec3 } from "@/lib/math/vec3";
import type { Difficulty, TopicSlug } from "@/lib/practice/types";

export type VectorPadState = {
  mode?: Mode;
  a: Vec3;
  b: Vec3;

  scale: number;
  showGrid: boolean;

  gridStep: number;
  autoGridStep?: boolean;

  snapToGrid: boolean;

  showComponents: boolean;
  showAngle: boolean;
  showProjection: boolean;
  showPerp: boolean;
  showUnitB: boolean;

  depthMode: boolean;

  view?: "span" | "dot" | "projection" | "angle" | "vectors";
  showSpan?: boolean;
  showCell?: boolean;
  alpha?: number;
  beta?: number;
};

export type TopicOption = { id: TopicSlug | "all"; label: string };

export const topicOptions = [
  { id: "all", label: "All topics" },

  // -------------------- Module 0 --------------------
  { id: "m0.dot", label: "Dot product" },
  { id: "m0.projection", label: "Projection" },
  { id: "m0.angle", label: "Angle / properties" },
  { id: "m0.vectors", label: "Vectors (drag)" },
  { id: "m0.vectors_part1", label: "Vectors (Part 1)" },
  { id: "m0.vectors_part2", label: "Vectors (Part 2)" },

  // -------------------- Module 1 --------------------
  { id: "m1.linear_systems", label: "Module 1: Linear systems" },
  { id: "m1.augmented", label: "Module 1: Augmented matrices" },
  { id: "m1.rref", label: "Module 1: RREF" },
  { id: "m1.solution_types", label: "Module 1: Solution types" },
  { id: "m1.parametric", label: "Module 1: Parametric solutions" },

  // -------------------- Module 2 --------------------
  { id: "m2.matrices_part1", label: "Matrices — Part 1 (mixed)" },

  { id: "m2.matrices_intro", label: "Matrices: Intro" },
  { id: "m2.index_slice", label: "Matrices: Indexing & slicing" },
  { id: "m2.special", label: "Matrices: Special matrices" },
  { id: "m2.elementwise_shift", label: "Matrices: Elementwise & shifts" },
  { id: "m2.matmul", label: "Matrices: Matrix multiplication" },
  { id: "m2.matvec", label: "Matrices: Matrix-vector product" },
  { id: "m2.transpose_liveevil", label: "Matrices: Transpose" },
  { id: "m2.symmetric", label: "Matrices: Symmetric matrices" },

  { id: "m2.matrix_ops", label: "Matrix ops (add/mul/transpose)" },
  { id: "m2.matrix_inverse", label: "Identity / inverse" },
  { id: "m2.matrix_properties", label: "Matrix properties" },
] as const satisfies readonly TopicOption[];

export const difficultyOptions: { id: Difficulty | "all"; label: string }[] = [
  { id: "all", label: "All difficulty" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];
