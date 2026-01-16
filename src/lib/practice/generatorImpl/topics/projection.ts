// src/lib/practice/generator/topics/projection.ts
import type { Difficulty, Exercise, ExerciseKind, NumericExercise, SingleChoiceExercise } from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, dot, mag2D, roundTo } from "../utils";
import { RNG } from "../rng";

function fmtVec2Latex(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}

export function genProjection(rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> {
  const archetype = rng.weighted([
    { value: "proj_numeric" as const, w: 6 },
    { value: "proj_concept" as const, w: diff === "easy" ? 5 : 3 },
    { value: "proj_sign" as const, w: diff === "hard" ? 5 : 2 },
  ]);

  const A = nonZeroVec(rng, diff);
  const B = nonZeroVec(rng, diff);

  const bMag = mag2D(B);
  const scalarProjExact = bMag > 1e-9 ? dot(A, B) / bMag : 0;

  // -------------------- proj_concept --------------------
  if (archetype === "proj_concept") {
    const prompt = String.raw`
Which statement is always true?

$$
\operatorname{proj}_b(a)
$$

is the vector projection of \(a\) onto \(b\).
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: "projection",
      difficulty: diff,
      kind: "single_choice",
      title: "Projection concept",
      prompt,
      options: [
        { id: "parallel", text: "It is parallel to b" },
        { id: "perp", text: "It is always perpendicular to b" },
        { id: "sameLen", text: "It always has length |a|" },
        { id: "undef", text: "It is undefined if b ≠ 0" },
      ],
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "parallel" } };
  }

  // -------------------- proj_sign --------------------
  if (archetype === "proj_sign") {
    const sign =
      Math.abs(scalarProjExact) < 1e-9 ? "zero" : scalarProjExact > 0 ? "positive" : "negative";

    const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Consider the scalar projection (component):

$$
\operatorname{comp}_b(a)=\frac{a\cdot b}{\lVert b\rVert}.
$$

What is the sign of

$$
\operatorname{comp}_b(a)
$$
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: "projection",
      difficulty: diff,
      kind: "single_choice",
      title: "Projection sign",
      prompt,
      options: [
        { id: "positive", text: "Positive" },
        { id: "zero", text: "Zero" },
        { id: "negative", text: "Negative" },
        { id: "depends", text: "Depends on |a|, cannot be determined" },
      ],
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: sign } };
  }

  // -------------------- proj_numeric --------------------
  const decimals = diff === "easy" ? 1 : 2;
  const value = roundTo(scalarProjExact, decimals);
  const tol = diff === "easy" ? 0.2 : diff === "medium" ? 0.05 : 0.03;

  const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Compute:

$$
\operatorname{comp}_b(a)=\frac{a\cdot b}{\lVert b\rVert}.
$$

Round to ${decimals} decimal place(s).
`.trim();

  const hint =
    diff === "easy"
      ? String.raw`
$$
\operatorname{comp}_b(a)=\frac{a\cdot b}{\lVert b\rVert}
$$
`.trim()
      : undefined;

  const exercise: NumericExercise = {
    id,
    topic: "projection",
    difficulty: diff,
    kind: "numeric",
    title: diff === "hard" ? "Scalar projection (tricky)" : "Scalar projection",
    prompt,
    hint,
  };

  return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
}
