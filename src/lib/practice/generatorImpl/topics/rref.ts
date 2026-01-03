// src/lib/practice/generator/topics/rref.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";

export function genRref(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "is_rref" as const, w: 4 },
    { value: "valid_ops" as const, w: 3 },
  ]);

  if (archetype === "valid_ops") {
    const exercise: Exercise = {
      id,
      topic: "rref",
      difficulty: diff,
      kind: "multi_choice",
      title: "Elementary row operations",
      prompt: "Select ALL operations that are valid elementary row operations.",
      options: [
        { id: "swap", text: "Swap two rows" },
        { id: "scale", text: "Multiply a row by a nonzero constant" },
        { id: "add", text: "Replace a row by (row + k·another row)" },
        { id: "square", text: "Square every entry in a row" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "multi_choice", optionIds: ["swap", "scale", "add"] } };
  }

  const rref = `[[1, 0, 2 | 3], [0, 1, -1 | 4]]`;
  const not1 = `[[1, 2, 0 | 3], [0, 1, -1 | 4]]`;
  const not2 = `[[1, 0, 2 | 3], [0, 2, -2 | 8]]`;
  const not3 = `[[0, 1, -1 | 4], [1, 0, 2 | 3]]`;

  const choices = rng.shuffle([
    { id: "A", text: rref },
    { id: "B", text: not1 },
    { id: "C", text: not2 },
    { id: "D", text: not3 },
  ]);

  const exercise: Exercise = {
    id,
    topic: "rref",
    difficulty: diff,
    kind: "single_choice",
    title: "Recognize RREF",
    prompt: "Which augmented matrix is in RREF?",
    options: choices.map((c) => ({ id: c.id, text: c.text })),
  } as any;

  const correctId = choices.find((c) => c.text === rref)!.id;
  return { archetype, exercise, expected: { kind: "single_choice", optionId: correctId } };
}
