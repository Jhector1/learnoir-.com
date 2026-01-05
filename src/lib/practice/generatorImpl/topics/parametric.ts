// src/lib/practice/generator/topics/parametric.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

function linTerm(coef: number, t = "t") {
  const sign = coef < 0 ? "-" : "+";
  const abs = Math.abs(coef);
  const coefStr = abs === 1 ? "" : String(abs);
  return `${sign} ${coefStr}${t}`;
}

function paramLine(p: number, q: number, r: number, s: number) {
  // Plain text choice (no LaTeX) => renders cleanly in radio list
  return `x = ${p} ${linTerm(r)},  y = ${q} ${linTerm(s)}`;
}

type DraftChoice = { text: string; correct: boolean };

export function genParametric(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const p = rng.int(-4, 4);
  const q = rng.int(-4, 4);
  const r = randNonZeroInt(rng, -4, 4);
  const s = randNonZeroInt(rng, -4, 4);

  const correctText = paramLine(p, q, r, s);

  const wrong1 = paramLine(p, q, s, r);     // swapped directions
  const wrong3 = paramLine(p, q, r, -s);    // sign error in one component
  const wrong4 = paramLine(p + 1, q, r, s); // shifted point

  const draftPool: DraftChoice[] = [
    { text: correctText, correct: true },
    { text: wrong1, correct: false },
    { text: wrong3, correct: false },
    { text: wrong4, correct: false },
  ];

  const shuffled = rng.shuffle(draftPool);
  const ids = ["A", "B", "C", "D"] as const;
  const choices = shuffled.map((c, i) => ({ ...c, id: ids[i] }));
  const correctId = choices.find((c) => c.correct)!.id;

  const exercise: Exercise = {
    id,
    topic: "parametric",
    difficulty: diff,
    kind: "single_choice",
    title: "Parametric form",
    // ✅ Markdown paragraphs, avoids weird wrapping
    prompt: [
      "A line of solutions can be written in parametric form.",
      "Which option is a valid parametric representation? (t is free)",
    ].join("\n\n"),
    options: choices.map((c) => ({ id: c.id, text: c.text })),
  } as any;

  return {
    archetype: "parametric_pattern",
    exercise,
    expected: { kind: "single_choice", optionId: correctId },
  };
}
