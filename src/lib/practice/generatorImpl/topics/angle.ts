// src/lib/practice/generator/topics/angle.ts
import type {
  Difficulty,
  Exercise,
  ExerciseKind,
  NumericExercise,
  SingleChoiceExercise,
} from "../../types";
import type { GenOut } from "../expected";
import { nonZeroVec, dot, mag2D, roundTo } from "../utils";
import { RNG } from "../rng";

// ---------- LaTeX helpers ----------
function fmtVec2Latex(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}

export function genAngle(rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> {
  const archetype = rng.weighted([
    { value: "angle_numeric" as const, w: 6 },
    { value: "angle_classify" as const, w: diff === "easy" ? 6 : 3 },
    { value: "cos_numeric" as const, w: diff === "hard" ? 5 : 2 },
  ]);

  const A = nonZeroVec(rng, diff);
  const B = nonZeroVec(rng, diff);

  const aMag = mag2D(A);
  const bMag = mag2D(B);
  const cosExact = aMag > 1e-9 && bMag > 1e-9 ? dot(A, B) / (aMag * bMag) : 1;
  const clamped = Math.max(-1, Math.min(1, cosExact));
  const angDegExact = (Math.acos(clamped) * 180) / Math.PI;

  // -------------------- angle_classify (single_choice) --------------------
  if (archetype === "angle_classify") {
    const d = dot(A, B);
    const correct = Math.abs(d) < 1e-9 ? "right" : d > 0 ? "acute" : "obtuse";

    const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Classify the angle $$\theta$$ between $$a$$ and $$b$$.
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: "angle",
      difficulty: diff,
      kind: "single_choice",
      title: "Angle type",
      prompt,
      options: [
        { id: "acute", text: String.raw`Acute ($$0^\circ < \theta < 90^\circ$$)` },
        { id: "right", text: String.raw`Right ($$\theta = 90^\circ$$)` },
        { id: "obtuse", text: String.raw`Obtuse ($$90^\circ < \theta < 180^\circ$$)` },
        { id: "cannot", text: "Cannot be determined without magnitudes" },
      ],
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: correct } };
  }

  // -------------------- cos_numeric (numeric) --------------------
  if (archetype === "cos_numeric") {
    const decimals = diff === "hard" ? 3 : 2;
    const value = roundTo(clamped, decimals);
    const tol = diff === "hard" ? 0.02 : 0.05;

    const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Compute $$\cos(\theta)$$, where $$\theta$$ is the angle between $$a$$ and $$b$$.
Round to ${decimals} decimal place(s).
`.trim();

    const hint = String.raw`
$$
\cos(\theta)=\frac{a\cdot b}{\|a\|\|b\|}
$$
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: "angle",
      difficulty: diff,
      kind: "numeric",
      title: "Cosine of angle",
      prompt,
      hint,
    };

    return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
  }

  // -------------------- angle_numeric (numeric) --------------------
  const decimals = diff === "easy" ? 0 : 1;
  const value = roundTo(angDegExact, decimals);
  const tol = diff === "easy" ? 3 : diff === "medium" ? 1.5 : 1.0;

  const prompt = String.raw`
Let

$$
a=${fmtVec2Latex(A.x, A.y)},
\qquad
b=${fmtVec2Latex(B.x, B.y)}.
$$

Compute the angle $$\theta$$ (in degrees) between $$a$$ and $$b$$.
Round to ${decimals} decimal place(s).
`.trim();

  const hint =
    diff === "easy"
      ? String.raw`
$$
\cos(\theta)=\frac{a\cdot b}{\|a\|\|b\|}
$$
`.trim()
      : undefined;

  const exercise: NumericExercise = {
    id,
    topic: "angle",
    difficulty: diff,
    kind: "numeric",
    title: "Angle between vectors",
    prompt,
    hint,
  };

  return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
}
