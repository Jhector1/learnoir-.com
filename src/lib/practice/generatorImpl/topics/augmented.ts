// src/lib/practice/generator/topics/augmented.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

export function genAugmented(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  // (you can add more archetypes later)
  const a = randNonZeroInt(rng, -5, 5);
  const b = randNonZeroInt(rng, -5, 5);
  const d = randNonZeroInt(rng, -5, 5);
  const e = randNonZeroInt(rng, -5, 5);
  const x0 = rng.int(-3, 3);
  const y0 = rng.int(-3, 3);
  const c = a * x0 + b * y0;
  const f = d * x0 + e * y0;

  const correct = `[[${a}, ${b} | ${c}], [${d}, ${e} | ${f}]]`;
  const wrong1 = `[[${a}, ${b} | ${f}], [${d}, ${e} | ${c}]]`;
  const wrong2 = `[[${a}, ${b} | ${c}], [${e}, ${d} | ${f}]]`;
  const wrong3 = `[[${a}, ${c} | ${b}], [${d}, ${f} | ${e}]]`;

  const choices = rng.shuffle([
    { id: "A", text: correct },
    { id: "B", text: wrong1 },
    { id: "C", text: wrong2 },
    { id: "D", text: wrong3 },
  ]);

  const exercise: Exercise = {
    id,
    topic: "augmented",
    difficulty: diff,
    kind: "single_choice",
    title: "Build the augmented matrix",
    prompt: `Convert the system to an augmented matrix:\n${a}x + ${b}y = ${c}\n${d}x + ${e}y = ${f}`,
    options: choices.map((c) => ({ id: c.id, text: c.text })),
  } as any;

  const correctId = choices.find((c) => c.text === correct)!.id;
  return { archetype: "augmented_basic", exercise, expected: { kind: "single_choice", optionId: correctId } };
}
