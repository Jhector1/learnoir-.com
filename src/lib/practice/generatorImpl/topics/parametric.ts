// src/lib/practice/generator/topics/parametric.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

export function genParametric(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const p = rng.int(-4, 4);
  const q = rng.int(-4, 4);
  const r = randNonZeroInt(rng, -4, 4);
  const s = randNonZeroInt(rng, -4, 4);

  const correct = `x = ${p} + (${r})t,  y = ${q} + (${s})t`;
  const wrong1 = `x = ${p} + (${s})t,  y = ${q} + (${r})t`;
  const wrong2 = `x = ${p} - (${r})t,  y = ${q} - (${s})t`;
  const wrong3 = `x = ${p} + (${r})t,  y = ${q} - (${s})t`;

  const choices = rng.shuffle([
    { id: "A", text: correct },
    { id: "B", text: wrong1 },
    { id: "C", text: wrong2 },
    { id: "D", text: wrong3 },
  ]);

  const exercise: Exercise = {
    id,
    topic: "parametric",
    difficulty: diff,
    kind: "single_choice",
    title: "Parametric form",
    prompt: `A line of solutions can be written in parametric form.\nWhich option is a valid parametric representation? (t is free)`,
    options: choices.map((c) => ({ id: c.id, text: c.text })),
  } as any;

  const correctId = choices.find((c) => c.text === correct)!.id;
  return { archetype: "parametric_pattern", exercise, expected: { kind: "single_choice", optionId: correctId } };
}
