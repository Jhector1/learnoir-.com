// src/lib/practice/generator/topics/augmented.ts
import type { Difficulty, Exercise, ExerciseKind, SingleChoiceExercise } from "../../types";
import type { GenOut } from "../expected";
import type { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

// ---------------- LaTeX helpers ----------------
function fmtSystem2(a: number, b: number, c: number, d: number, e: number, f: number) {
  return String.raw`
$$
\begin{cases}
${a}x + ${b}y = ${c}\\
${d}x + ${e}y = ${f}
\end{cases}
$$
`.trim();
}

function fmtAug2(a: number, b: number, c: number, d: number, e: number, f: number) {
  // augmented matrix: [ a b | c ; d e | f ]
  return String.raw`
$$
\left[\begin{array}{cc|c}
${a} & ${b} & ${c}\\
${d} & ${e} & ${f}
\end{array}\right]
$$
`.trim();
}

export function genAugmented(rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> {
  const a = randNonZeroInt(rng, -5, 5);
  const b = randNonZeroInt(rng, -5, 5);
  const d = randNonZeroInt(rng, -5, 5);
  const e = randNonZeroInt(rng, -5, 5);

  const x0 = rng.int(-3, 3);
  const y0 = rng.int(-3, 3);

  const c = a * x0 + b * y0;
  const f = d * x0 + e * y0;

  // ✅ correct augmented matrix
  const correct = fmtAug2(a, b, c, d, e, f);

  // ❌ common mistakes
  const wrong1 = fmtAug2(a, b, f, d, e, c); // swap constants
  const wrong2 = fmtAug2(a, b, c, e, d, f); // swap coefficients in 2nd row
  const wrong3 = fmtAug2(a, c, b, d, f, e); // mix coefficient/constant positions

  const choices = rng.shuffle([
    { id: "A", text: correct },
    { id: "B", text: wrong1 },
    { id: "C", text: wrong2 },
    { id: "D", text: wrong3 },
  ]);

  const prompt = String.raw`
Convert the system to an **augmented matrix**:

${fmtSystem2(a, b, c, d, e, f)}
`.trim();

  const exercise: SingleChoiceExercise = {
    id,
    topic: "augmented",
    difficulty: diff,
    kind: "single_choice",
    title: "Build the augmented matrix",
    prompt,
    options: choices.map((c) => ({ id: c.id, text: c.text })),
    hint: "Put the coefficients of x and y in the left block, and the constants on the right of the vertical bar.",
  };

  const correctId = choices.find((c) => c.text === correct)!.id;

  return {
    archetype: "augmented_basic",
    exercise,
    expected: { kind: "single_choice", optionId: correctId },
  };
}
