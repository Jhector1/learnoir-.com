// src/lib/practice/generator/topics/matrixInverse.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { make2x2, det2, roundTo } from "../utils";

// ---------- LaTeX helpers ----------
function fmt2x2Latex(M: number[][]) {
  return String.raw`\begin{bmatrix}${M[0][0]} & ${M[0][1]}\\ ${M[1][0]} & ${M[1][1]}\end{bmatrix}`;
}

export function genMatrixInverse(
  rng: RNG,
  diff: Difficulty,
  id: string
): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "invertible_yesno" as const, w: 4 },
    { value: "det_numeric" as const, w: 3 },
    { value: "inv_entry" as const, w: diff === "hard" ? 3 : 2 },
  ]);

  const range = diff === "easy" ? 4 : diff === "medium" ? 6 : 9;

  let A = make2x2(rng, range);
  let d = det2(A);

  // For inv_entry we must ensure det != 0
  if (archetype === "inv_entry") {
    for (let tries = 0; tries < 200; tries++) {
      A = make2x2(rng, range);
      d = det2(A);
      if (Math.abs(d) > 1e-9) break;
    }
    if (Math.abs(d) <= 1e-9) {
      A = [
        [1, 0],
        [0, 1],
      ];
      d = 1;
    }
  }

  // -------------------- invertible_yesno (single_choice) --------------------
  if (archetype === "invertible_yesno") {
    const prompt = String.raw`
Let

$$
A=${fmt2x2Latex(A)}.
$$

Is \(A\) invertible?
`.trim();

    const exercise: Exercise = {
      id,
      topic: "matrix_inverse",
      difficulty: diff,
      kind: "single_choice",
      title: "Invertible?",
      prompt,
      options: [
        { id: "yes", text: "Yes (det(A) ≠ 0)" },
        { id: "no", text: "No (det(A) = 0)" },
      ],
    } as any;

    return {
      archetype,
      exercise,
      expected: {
        kind: "single_choice",
        optionId: Math.abs(d) < 1e-9 ? "no" : "yes",
      },
    };
  }

  // -------------------- det_numeric (numeric) --------------------
  if (archetype === "det_numeric") {
    const prompt = String.raw`
Compute $\det(A)$ for


$$
A=${fmt2x2Latex(A)}.
$$
`.trim();

    const exercise: Exercise = {
      id,
      topic: "matrix_inverse",
      difficulty: diff,
      kind: "numeric",
      title: "Determinant of a 2×2",
      prompt,
      hint: "For $A=\\begin{bmatrix}a & b\\\\ c & d\\end{bmatrix}$, $\\det(A)=ad-bc$.",
      correctValue: d,
      tolerance: 0,
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "numeric", value: d, tolerance: 0 },
    };
  }

  // -------------------- inv_entry (numeric) --------------------
  const a = A[0][0],
    b = A[0][1],
    c = A[1][0],
    dd = A[1][1];

  const inv11 = dd / d;

  const decimals = diff === "easy" ? 2 : diff === "medium" ? 3 : 4;
  const value = roundTo(inv11, decimals);
  const tol = diff === "easy" ? 0.05 : diff === "medium" ? 0.02 : 0.01;

  const prompt = String.raw`
Let

$$
A=${fmt2x2Latex(A)}.
$$

Compute $(A^{-1})_{11}$. Round to 2 decimal places.

`.trim();

  const exercise: Exercise = {
    id,
    topic: "matrix_inverse",
    difficulty: diff,
    kind: "numeric",
    title: "One entry of the inverse",
    prompt,
hint: String.raw`
Use the inverse formula:

$$
A^{-1}=\frac{1}{\det(A)}
\begin{bmatrix}
d & -b\\
-c & a
\end{bmatrix}.
$$
`.trim(),
    correctValue: value,
    tolerance: tol,
  } as any;

  return {
    archetype,
    exercise,
    expected: { kind: "numeric", value, tolerance: tol },
  };
}
