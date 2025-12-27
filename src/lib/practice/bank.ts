// src/lib/practice/bank.ts
import { PracticeDifficulty, PracticeKind, PracticeTopic } from "@/generated/prisma";

export type GeneratedExercise = {
  topic: PracticeTopic;
  kind: PracticeKind;
  difficulty: PracticeDifficulty;
  title: string;
  prompt: string;
  publicPayload: any;
  secretPayload: any;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateExercise(args: {
  topic: PracticeTopic;
  difficulty: PracticeDifficulty;
}): GeneratedExercise {
  const { topic, difficulty } = args;

  // Example: numeric dot product
  if (topic === "dot") {
    const ax = randInt(-3, 4);
    const ay = randInt(-3, 4);
    const bx = randInt(-3, 4);
    const by = randInt(-3, 4);
    const expected = ax * bx + ay * by;

    return {
      topic,
      difficulty,
      kind: "numeric",
      title: `Dot product (${difficulty})`,
      prompt: `Compute a · b for a=(${ax}, ${ay}) and b=(${bx}, ${by}).`,
      publicPayload: {
        kind: "numeric",
        hint: difficulty === "easy" ? "Dot: a·b = ax·bx + ay·by" : undefined,
      },
      secretPayload: { expected, tolerance: 0 },
    };
  }

  // Example: single choice projection property
  if (topic === "projection") {
    const options = [
      { id: "a", text: "proj_b(a) is parallel to b" },
      { id: "b", text: "proj_b(a) is always perpendicular to b" },
      { id: "c", text: "proj_b(a) always has length |a|" },
      { id: "d", text: "proj_b(a) is undefined if b ≠ 0" },
    ];
    return {
      topic,
      difficulty,
      kind: "single_choice",
      title: `Projection concept (${difficulty})`,
      prompt: "Which statement is always true?",
      publicPayload: { kind: "single_choice", options },
      secretPayload: { correctOptionId: "a" },
    };
  }

  // Example: angle numeric
  if (topic === "angle") {
    const expected = difficulty === "easy" ? 90 : 60;
    return {
      topic,
      difficulty,
      kind: "numeric",
      title: `Angle basics (${difficulty})`,
      prompt: difficulty === "easy" ? "What is the angle between perpendicular vectors?" : "What is cos(60°)?",
      publicPayload: { kind: "numeric", hint: difficulty === "easy" ? "Perpendicular means right angle." : undefined },
      secretPayload: { expected, tolerance: difficulty === "easy" ? 0 : 0.01 },
    };
  }

  // Example: vector drag target (2D)
  if (topic === "vectors") {
    const targetA = { x: randInt(-3, 4), y: randInt(-3, 4), z: 0 };
    return {
      topic,
      difficulty,
      kind: "vector_drag_target",
      title: `Drag vector (${difficulty})`,
      prompt: "Drag vector a to match the target coordinates.",
      publicPayload: {
        kind: "vector_drag_target",
        initialA: { x: 0, y: 0, z: 0 },
        initialB: { x: 2, y: 1, z: 0 },
        lockB: true,
        targetA,
        tolerance: difficulty === "easy" ? 0.25 : difficulty === "medium" ? 0.15 : 0.08,
      },
      secretPayload: { targetA },
    };
  }

  // fallback
  return generateExercise({ topic: "dot", difficulty });
}
