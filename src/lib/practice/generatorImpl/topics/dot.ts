// src/lib/practice/generator/topics/dot.ts
import type {
  Difficulty,
  Exercise,
  ExerciseKind,
  NumericExercise,
  SingleChoiceExercise,
  VectorDragDotExercise,
} from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, dot as dot3, roundTo, toleranceFor } from "../utils";
import { RNG } from "../rng";

// ---------- LaTeX helpers ----------
function fmtVec2Latex(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}

export function genDot(rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> {
  const archetype = rng.weighted([
    { value: "dot_classify" as const, w: diff === "easy" ? 5 : 1 },
    { value: "dot_numeric" as const, w: diff === "easy" ? 2 : 6 },
    { value: "dot_drag" as const, w: 3 },
    { value: "dot_word_work" as const, w: diff === "hard" ? 4 : 2 },
  ]);

  const A = nonZeroVec(rng, diff);
  const B = nonZeroVec(rng, diff);
  const target = dot3(A, B);

  // -------------------- dot_drag --------------------
  if (archetype === "dot_drag") {
    const tol = toleranceFor(diff, "vector_drag_dot");

    const prompt = String.raw`
Drag \(a\) so that the dot product matches the target.

$$
a \cdot b \approx \text{target}
$$

${diff === "hard" ? "Watch the sign." : ""}
`.trim();

    const exercise: VectorDragDotExercise = {
      id,
      topic: "dot",
      difficulty: diff,
      kind: "vector_drag_dot",
      title: diff === "hard" ? "Drag: hit a dot target" : "Drag to match dot",
      prompt,
      initialA: { x: 0, y: 0, z: 0 },
      b: B,
      targetDot: target,
      tolerance: tol,
    };

    return {
      archetype,
      exercise,
      expected: { kind: "vector_drag_dot", targetDot: target, tolerance: tol },
    };
  }

  // -------------------- dot_classify --------------------
  if (archetype === "dot_classify") {
    const d = target;
    const correct = Math.abs(d) < 1e-9 ? "zero" : d > 0 ? "positive" : "negative";

    const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Determine the sign of

$$
a \cdot b
$$
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: "dot",
      difficulty: diff,
      kind: "single_choice",
      title: "Dot product sign",
      prompt,
      options: [
        { id: "positive", text: "Positive" },
        { id: "zero", text: "Zero" },
        { id: "negative", text: "Negative" },
        { id: "cannot", text: "Cannot be determined from given vectors" },
      ],
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: correct } };
  }

  // -------------------- dot_word_work --------------------
  if (archetype === "dot_word_work") {
    const F = nonZeroVec(rng, diff);
    const disp = nonZeroVec(rng, diff);
    const work = dot3(F, disp);

    const decimals = diff === "easy" ? 0 : diff === "medium" ? 1 : 2;
    const rounded = roundTo(work, decimals);
    const tol = diff === "easy" ? 0.5 : diff === "medium" ? 0.2 : 0.05;

    const prompt = String.raw`
A force \(F\) and displacement \(d\) are:

$$
F=${fmtVec2Latex(F.x, F.y)}\ \text{N},
\qquad
d=${fmtVec2Latex(disp.x, disp.y)}\ \text{m}.
$$

Compute the work

$$
W = F \cdot d
$$

${decimals ? `Round to ${decimals} decimal place(s).` : ""}
`.trim();

    const hint = String.raw`
$$
W = F \cdot d = F_x d_x + F_y d_y
$$
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: "dot",
      difficulty: diff,
      kind: "numeric",
      title: "Work (dot product)",
      prompt,
      hint,
    };

    return { archetype, exercise, expected: { kind: "numeric", value: rounded, tolerance: tol } };
  }

  // -------------------- dot_numeric --------------------
  const tol = toleranceFor(diff, "numeric");

  const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Compute

$$
a \cdot b
$$

${diff === "hard" ? "Be careful with negatives." : ""}
`.trim();

  const hint =
    diff === "easy"
      ? String.raw`
$$
a \cdot b = a_x b_x + a_y b_y
$$
`.trim()
      : undefined;

  const exercise: NumericExercise = {
    id,
    topic: "dot",
    difficulty: diff,
    kind: "numeric",
    title: diff === "hard" ? "Dot product (tricky)" : "Dot product",
    prompt,
    hint,
  };

  return { archetype, exercise, expected: { kind: "numeric", value: target, tolerance: tol } };
}
