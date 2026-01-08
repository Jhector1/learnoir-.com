// src/components/vectorpad/types.ts
import type { Mode, Vec3 } from "@/lib/math/vec3";
import { Difficulty, Topic } from "@/lib/practice/types";

// src/components/vectorpad/types.ts
// import type { Vec3 } from "@/lib/math/vec3";
// import type { Mode } from "@/lib/math/vec3";

export type VectorPadState = {
    mode?: Mode;
  a: Vec3;
  b: Vec3;

  scale: number;

  showGrid: boolean;

  // ✅ grid step + auto step
  gridStep: number;
  autoGridStep?: boolean;

  snapToGrid: boolean;

  showComponents: boolean;
  showAngle: boolean;
  showProjection: boolean;
  showPerp: boolean;
  showUnitB: boolean;

  depthMode: boolean;

  // -----------------------------
  // ✅ Optional “module fields”
  // (VectorPad won’t use them directly,
  // but overlays/modules can.)
  // -----------------------------
  view?: "span" | "dot" | "projection" | "angle" | "vectors";
  showSpan?: boolean;
  showCell?: boolean;
  alpha?: number;
  beta?: number;
};


export const topicOptions = [
  { id: "all", label: "All topics" },

  // Module 0
  { id: "dot", label: "Dot product" },
  { id: "projection", label: "Projection" },
  { id: "angle", label: "Angle / properties" },
  { id: "vectors", label: "Vectors (drag)" },

  // Module 1

  { id: "linear_systems", label: "Module 1: Linear systems" },
  { id: "augmented", label: "Module 1: Augmented matrices" },
  { id: "rref", label: "Module 1: RREF" },
  { id: "solution_types", label: "Module 1: Solution types" },
  { id: "parametric", label: "Module 1: Parametric solutions" },
{ id: "vectors_part2", label: " Vectors part 2" },
    { id: "vectors_part1", label: " Vectors part 1" },
  // Module 2
  { id: "matrix_ops", label: "Matrix ops (add/mul/transpose)" },
  { id: "matrix_inverse", label: "Identity / matrix_inverse" },
//   { id: "elementary", label: "Elementary matrices" },
//   { id: "matrix_props", label: "Matrix properties" },
] as const;

// import type { Difficulty } from "@/lib/practice/types";

export const difficultyOptions: { id: Difficulty | "all"; label: string }[] = [
  { id: "all", label: "All difficulty" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];



