// src/components/vectorpad/types.ts
import type { Mode, Vec3 } from "@/lib/math/vec3";
import { Difficulty, Topic } from "@/lib/practice/types";

export type VectorPadState = {
  mode: Mode;
  scale: number;
  gridStep: number;
  snapToGrid: boolean;

  showGrid: boolean;
  showComponents: boolean;
  showAngle: boolean;
  showProjection: boolean;
  showUnitB: boolean;
  showPerp: boolean;

  depthMode: boolean; // in 3D: force Z drag

  a: Vec3;
  b: Vec3;
};

export const topicOptions: { id: Topic | "all"; label: string }[] = [
  { id: "all", label: "All topics" },
  { id: "dot", label: "Dot product" },
  { id: "projection", label: "Projection" },
  { id: "angle", label: "Angle / properties" },
  { id: "vectors", label: "Vectors (drag)" },
];
// import type { Difficulty } from "@/lib/practice/types";

export const difficultyOptions: { id: Difficulty | "all"; label: string }[] = [
  { id: "all", label: "All difficulty" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];