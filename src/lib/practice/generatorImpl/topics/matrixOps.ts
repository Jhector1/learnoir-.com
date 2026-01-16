// src/lib/practice/generator/topics/matrixOps.ts
import type { Difficulty, Exercise, ExerciseKind, NumericExercise, SingleChoiceExercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { make2x2 } from "../utils";

// ---------- LaTeX helpers ----------
function fmt2x2Latex(M: number[][]) {
  return String.raw`\begin{bmatrix}${M[0][0]} & ${M[0][1]}\\ ${M[1][0]} & ${M[1][1]}\end{bmatrix}`;
}
function fmtVec2Latex(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}

function mul2x2(A: number[][], B: number[][]) {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1],
    ],
  ];
}

export function genMatrixOps(rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> {
  const archetype = rng.weighted([
    { value: "entry_AB" as const, w: 4 },
    { value: "dims_defined" as const, w: 3 },
    { value: "entry_AplusB" as const, w: 2 },
    { value: "entry_Av" as const, w: diff === "hard" ? 3 : 2 },
    { value: "multiply_full" as const, w: diff === "easy" ? 1 : 3 },
  ]);

  const range = diff === "easy" ? 3 : diff === "medium" ? 6 : 9;

  // -------------------- dims_defined (single_choice) --------------------
  if (archetype === "dims_defined") {
    const dimA = rng.pick(
      [
        { r: 2, c: 3 },
        { r: 3, c: 2 },
        { r: 2, c: 2 },
        { r: 3, c: 3 },
      ] as const
    );

    const dimB = rng.pick(
      [
        { r: 2, c: 3 },
        { r: 3, c: 2 },
        { r: 2, c: 2 },
        { r: 3, c: 1 },
      ] as const
    );

    const ok = dimA.c === dimB.r;

    const prompt = String.raw`
Let \(A\) be a \(${dimA.r}\times ${dimA.c}\) matrix and \(B\) be a \(${dimB.r}\times ${dimB.c}\) matrix.
Is the product \(AB\) defined?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "single_choice",
      title: "Is AB defined?",
      prompt,
      options: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: ok ? "yes" : "no" } };
  }

  // -------------------- entry_AplusB (numeric) --------------------
  if (archetype === "entry_AplusB") {
    const A = make2x2(rng, range);
    const B = make2x2(rng, range);
    const val = A[1][0] + B[1][0];

    const prompt = String.raw`
Let

$$
A=${fmt2x2Latex(A)}
\quad\text{and}\quad
B=${fmt2x2Latex(B)}.
$$

Compute $(A+B)_{21}$ (row 2, column 1).
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "numeric",
      title: "Matrix addition entry",
      prompt,
      hint: "Addition is entrywise.",
    };

    return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
  }

  // -------------------- entry_Av (numeric) --------------------
  if (archetype === "entry_Av") {
    const A = make2x2(rng, range);
    const vx = rng.int(-range, range);
    const vy = rng.int(-range, range);
    const val = A[0][0] * vx + A[0][1] * vy;

    const prompt = String.raw`
Let

$$
A=${fmt2x2Latex(A)},
\qquad
v=${fmtVec2Latex(vx, vy)}.
$$

Compute the first component of $Av$.
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "numeric",
      title: "Matrix–vector multiply",
      prompt,
      hint: "First component = row 1 of A · v",
    };

    return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
  }

  // -------------------- multiply_full (single_choice) --------------------
  if (archetype === "multiply_full") {
    const A = [
      [-3, -3],
      [1, -3],
    ];
    const B = [
      [3, 3],
      [1, -1],
    ];
    const AB = mul2x2(A, B); // [[-12, -6],[0, 6]]

    const wrong1 = [
      [AB[0][0], -AB[0][1]],
      [AB[1][0], AB[1][1]],
    ];
    const wrong2 = [
      [AB[0][1], AB[0][0]],
      [AB[1][1], AB[1][0]],
    ];
    const wrong3 = [
      [AB[0][0], AB[0][1]],
      [AB[1][1], AB[1][0]],
    ];

    const prompt = String.raw`
Let

$$
A=${fmt2x2Latex(A)}
\quad\text{and}\quad
B=${fmt2x2Latex(B)}.
$$

Compute $AB$.
`.trim();

    const pool = [
      { id: "A", M: AB, correct: true },
      { id: "B", M: wrong1, correct: false },
      { id: "C", M: wrong2, correct: false },
      { id: "D", M: wrong3, correct: false },
    ];

    const shuffled = rng.shuffle(pool);
    const options = shuffled.map((c) => ({
      id: c.id,
      text: String.raw`$${fmt2x2Latex(c.M)}$`,
    }));
    const correctId = shuffled.find((c) => c.correct)!.id;

    const exercise: SingleChoiceExercise = {
      id,
      topic: "matrix_ops",
      difficulty: diff,
      kind: "single_choice",
      title: "Matrix multiplication",
      prompt,
      options,
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: correctId } };
  }

  // -------------------- entry_AB (numeric) --------------------
  const A = make2x2(rng, range);
  const B = make2x2(rng, range);
  const val = A[0][0] * B[0][0] + A[0][1] * B[1][0];

  const prompt = String.raw`
Let

$$
A=${fmt2x2Latex(A)}
\quad\text{and}\quad
B=${fmt2x2Latex(B)}.
$$

Compute $(AB)_{11}$ (top-left entry).
`.trim();

  const exercise: NumericExercise = {
    id,
    topic: "matrix_ops",
    difficulty: diff,
    kind: "numeric",
    title: "Matrix multiplication entry",
    prompt,
    hint: "Top-left = row 1 of A · column 1 of B.",
  };

  return { archetype: "entry_AB", exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
}
