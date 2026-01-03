// src/lib/practice/options.ts
import type { Difficulty, Topic } from "@/lib/practice/types";

export const difficultyOptions: { id: Difficulty | "all"; label: string }[] = [
  { id: "all", label: "All difficulties" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export const TOPIC_LABEL: Record<Topic, string> = {
  // Module 0
  dot: "Dot product",
  projection: "Projection",
  angle: "Angle / properties",
  vectors: "Vectors (drag)",

  // Module 1
  linear_systems: "linear_systems (solve)",
  augmented: "Augmented matrices",
  rref: "Gaussian elim / RREF",
  solution_types: "Solution types",
  parametric: "Parametric / free vars",
    // Module 2
    matrix_ops: "Matrix ops (add/mul/transpose)",
    matrix_inverse: "Identity / matrix_inverse",
    matrix_properties: "Matrix properties",
    
};

export const ALL_TOPICS = Object.keys(TOPIC_LABEL) as Topic[];

export function isTopic(x: string | null | undefined): x is Topic {
  return !!x && (ALL_TOPICS as readonly string[]).includes(x);
}

export const topicOptions: { id: Topic | "all"; label: string }[] = [
  { id: "all", label: "All topics" },

  // Module 0
  { id: "dot", label: TOPIC_LABEL.dot },
  { id: "projection", label: TOPIC_LABEL.projection },
  { id: "angle", label: TOPIC_LABEL.angle },
  { id: "vectors", label: TOPIC_LABEL.vectors },

  // Module 1
  { id: "linear_systems", label: TOPIC_LABEL.linear_systems },
  { id: "augmented", label: TOPIC_LABEL.augmented },
  { id: "rref", label: TOPIC_LABEL.rref },
  { id: "solution_types", label: TOPIC_LABEL.solution_types },
  { id: "parametric", label: TOPIC_LABEL.parametric },
];
