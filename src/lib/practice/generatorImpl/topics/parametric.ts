// src/lib/practice/generator/topics/parametric.ts
import type { Difficulty, Exercise, ExerciseKind, SingleChoiceExercise } from "../../types";
import type { GenOut } from "../expected";
import type { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

// ---------------- LaTeX helpers ----------------
function signedLin(coef: number, sym = "t") {
  const sign = coef < 0 ? "-" : "+";
  const abs = Math.abs(coef);
  const coefStr = abs === 1 ? "" : String(abs);
  return String.raw`${sign} ${coefStr}${sym}`;
}

function paramLineLatex(p: number, q: number, r: number, s: number) {
  // x = p + r t, y = q + s t   (with signs handled)
  return String.raw`
$$
\begin{cases}
x = ${p} ${signedLin(r)}\\
y = ${q} ${signedLin(s)}
\end{cases}
$$
`.trim();
}

type DraftChoice = { text: string; correct: boolean };

export function genParametric(
  rng: RNG,
  diff: Difficulty,
  id: string
): GenOut<ExerciseKind> {
  const p = rng.int(-4, 4);
  const q = rng.int(-4, 4);
  const r = randNonZeroInt(rng, -4, 4);
  const s = randNonZeroInt(rng, -4, 4);

  const correctText = paramLineLatex(p, q, r, s);

  // wrong choices
  const wrong1 = paramLineLatex(p, q, s, r);     // swap direction components
  const wrong3 = paramLineLatex(p, q, r, -s);    // flip one component
  const wrong4 = paramLineLatex(p + 1, q, r, s); // shift point

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

  const prompt = String.raw`
A line of solutions can be written in **parametric form**.

A common pattern is:
$$
\mathbf{x}(t)=\mathbf{x}_0+t\,\mathbf{v},\quad t\in\mathbb{R}.
$$

Which option below is a valid parametric representation? (The parameter $t$ is free.)
`.trim();

  const exercise: SingleChoiceExercise = {
    id,
    topic: "parametric",
    difficulty: diff,
    kind: "single_choice",
    title: "Parametric form",
    prompt,
    options: choices.map((c) => ({ id: c.id, text: c.text })),
    hint: "A parametric line looks like a starting point plus a direction times a free parameter t.",
  };

  return {
    archetype: "parametric_pattern",
    exercise,
    expected: { kind: "single_choice", optionId: correctId },
  };
}
