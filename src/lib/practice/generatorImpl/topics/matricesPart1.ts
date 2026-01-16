// src/lib/practice/generator/topics/matricesPart1.ts
import type {
  Difficulty,
  Exercise,
  ExerciseKind,
  NumericExercise,
  SingleChoiceExercise,
  // ✅ add this to your types.ts exports
  MatrixInputExercise,
} from "../../types";
import type { GenOut } from "../expected";
import type { RNG } from "../rng";

// ---------------- LaTeX helpers ----------------
function shapeLatex(m: number, n: number) {
  return String.raw`${m}\times${n}`;
}

function pickShape(rng: RNG, min = 2, max = 6) {
  const m = rng.int(min, max);
  const n = rng.int(min, max);
  return { m, n };
}

function fmtMat(A: number[][]) {
  const rows = A.map((row) => row.join(" & ")).join(String.raw`\\ `);
  return String.raw`\begin{bmatrix}${rows}\end{bmatrix}`;
}

function fmtMat2(A: number[][]) {
  return String.raw`\begin{bmatrix}${A[0][0]} & ${A[0][1]}\\ ${A[1][0]} & ${A[1][1]}\end{bmatrix}`;
}

function fmtVec2(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}

// ---------------- math helpers ----------------
function coinFlip(rng: RNG) {
  return rng.int(0, 1) === 1;
}

function dot2(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1];
}

function randIntNonZero(rng: RNG, lo: number, hi: number) {
  let v = 0;
  while (v === 0) v = rng.int(lo, hi);
  return v;
}

function randMat(rng: RNG, m: number, n: number, range: number) {
  return Array.from({ length: m }, () =>
    Array.from({ length: n }, () => rng.int(-range, range))
  );
}

function matmul(A: number[][], B: number[][]) {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const n2 = B.length;
  const k = B[0]?.length ?? 0;

  if (n === 0 || n2 === 0 || n !== n2) {
    throw new Error("matmul shape mismatch");
  }

  const C = Array.from({ length: m }, () => Array.from({ length: k }, () => 0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += A[i][t] * B[t][j];
      C[i][j] = s;
    }
  }
  return C;
}

// ---------------- main factory ----------------
export function makeGenMatricesPart1(topicSlug: string) {
  return (rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> => {
    const range = diff === "easy" ? 5 : diff === "medium" ? 9 : 12;

    const archetype = (() => {
      switch (topicSlug) {
        case "m2.matrices_intro":
          return rng.weighted([
            { value: "shape_rows_cols" as const, w: 5 },
            { value: "shape_entries_count" as const, w: 3 },
            { value: "mental_model" as const, w: 2 },
          ]);

        case "m2.index_slice":
          return rng.weighted([
            { value: "indexing_math_to_numpy" as const, w: 5 },
            { value: "slicing_shape" as const, w: 4 },
            { value: "slicing_halfopen" as const, w: 2 },
          ]);

        case "m2.special":
          return rng.weighted([
            { value: "identity_def" as const, w: 4 },
            { value: "diagonal_def" as const, w: 3 },
            { value: "triangular_def" as const, w: 3 },
          ]);

        case "m2.elementwise_shift":
          return rng.weighted([
            { value: "star_vs_at" as const, w: 5 },
            { value: "shifting_diagonal_only" as const, w: 5 },
            { value: "hadamard_def" as const, w: 3 },
          ]);

        case "m2.matmul":
          return rng.weighted([
            { value: "matmul_shape" as const, w: 5 },
            { value: "matmul_entry_dot" as const, w: 5 },
            { value: "valid_or_invalid" as const, w: 3 },

            // ✅ NEW: full matrix input (dynamic)
            { value: "matmul_full_matrix" as const, w: 4 },
          ]);

        case "m2.matvec":
          return rng.weighted([
            { value: "weighted_sum_columns" as const, w: 5 },
            { value: "matvec_shape" as const, w: 4 },
            { value: "compute_small_matvec" as const, w: 4 },
          ]);

        case "m2.transpose_liveevil":
          return rng.weighted([
            { value: "transpose_product_rule" as const, w: 6 },
            { value: "transpose_shape" as const, w: 3 },
            { value: "double_transpose" as const, w: 1 },

            // ✅ NEW: fill full transpose (dynamic)
            { value: "transpose_fill_matrix" as const, w: 3 },
          ]);

        case "m2.symmetric":
          return rng.weighted([
            { value: "symmetric_definition" as const, w: 4 },
            { value: "ata_shape" as const, w: 5 },
            { value: "ata_is_symmetric" as const, w: 3 },
          ]);

        default:
          return rng.weighted([{ value: "matmul_shape" as const, w: 1 }]);
      }
    })();

    // ------------------------------------------------------------
    // m2.matrices_intro
    // ------------------------------------------------------------
    if (archetype === "shape_rows_cols") {
      const { m, n } = pickShape(rng, 2, 6);

      const prompt = String.raw`
If
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}}
$$
how many rows and columns does
$$
\mathbf{A}
$$
have?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Matrix shape",
        prompt,
        options: [
          { id: "a", text: `${m} rows, ${n} columns` },
          { id: "b", text: `${n} rows, ${m} columns` },
          { id: "c", text: `${m + n} total rows/cols` },
        ],
        hint: "m×n means rows × columns.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "shape_entries_count") {
      const { m, n } = pickShape(rng, 2, 6);
      const correct = m * n;

      const prompt = String.raw`
If
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}}
$$
how many total entries does
$$
\mathbf{A}
$$
have?
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "How many entries?",
        prompt,
        hint: "Total entries = rows × columns.",
      };

      return { archetype, exercise, expected: { kind: "numeric", value: correct, tolerance: 0 } };
    }

    if (archetype === "mental_model") {
      const prompt = String.raw`
Which statement is a correct “mental model” of a matrix?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "What is a matrix?",
        prompt,
        options: [
          { id: "a", text: "A matrix is only used for solving systems of equations." },
          { id: "b", text: "A matrix can be seen as a data table or as stacked column vectors." },
          { id: "c", text: "A matrix is always a single column vector." },
        ],
        hint: "Think: data tables, images, transformations, stacks of vectors.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    // ------------------------------------------------------------
    // m2.index_slice
    // ------------------------------------------------------------
    if (archetype === "indexing_math_to_numpy") {
      const i = rng.int(2, 6);
      const j = rng.int(2, 6);

      const prompt = String.raw`
In math,
$$
a_{${i},${j}}
$$
means ${i}th row, ${j}th column.

In NumPy (0-based), which index selects
$$
a_{${i},${j}}
$$
from matrix
$$
A
$$
?
`.trim();

      const correct = `A[${i - 1}, ${j - 1}]`;

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Indexing (math vs NumPy)",
        prompt,
        options: [
          { id: "a", text: `A[${i}, ${j}]` },
          { id: "b", text: correct },
          { id: "c", text: `A[${j - 1}, ${i - 1}]` },
        ],
        hint: "Subtract 1 from each coordinate for 0-based indexing.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    if (archetype === "slicing_shape") {
      const rows = rng.int(5, 10);
      const cols = rng.int(6, 12);

      const r0 = rng.int(0, rows - 3);
      const r1 = rng.int(r0 + 1, rows - 1);
      const c0 = rng.int(0, cols - 4);
      const c1 = rng.int(c0 + 1, cols - 1);

      const outRows = r1 - r0;
      const outCols = c1 - c0;

      const prompt = String.raw`
Let
$$
A
$$
be a ${rows}\times${cols} matrix in NumPy.

What is the shape of
$$
\texttt{A[${r0}:${r1},\ ${c0}:${c1}]}
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Slicing shape",
        prompt,
        options: [
          { id: "a", text: `${outRows}×${outCols}` },
          { id: "b", text: `${outCols}×${outRows}` },
          { id: "c", text: `${r1}×${c1}` },
        ],
        hint: "Stop is exclusive: rows = r1−r0, cols = c1−c0.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "slicing_halfopen") {
      const prompt = String.raw`
In Python slicing, what does the slice
$$
\texttt{1:4}
$$
select?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Half-open intervals",
        prompt,
        options: [
          { id: "a", text: "Indices 1, 2, 3" },
          { id: "b", text: "Indices 1, 2, 3, 4" },
          { id: "c", text: "Indices 0, 1, 2, 3" },
        ],
        hint: "Stop is excluded.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    // ------------------------------------------------------------
    // m2.special
    // ------------------------------------------------------------
    if (archetype === "identity_def") {
      const prompt = String.raw`
Which matrix has 1s on the diagonal and 0s elsewhere?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Identity matrix",
        prompt,
        options: [
          { id: "a", text: "Diagonal matrix" },
          { id: "b", text: "Identity matrix" },
          { id: "c", text: "Upper triangular matrix" },
        ],
        hint: "Identity is a special diagonal matrix with all diagonal entries = 1.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    if (archetype === "diagonal_def") {
      const prompt = String.raw`
A diagonal matrix is a square matrix where:
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Diagonal definition",
        prompt,
        options: [
          { id: "a", text: "Only diagonal entries may be nonzero." },
          { id: "b", text: "All entries above the diagonal are 0." },
          { id: "c", text: "All entries are 1." },
        ],
        hint: "Triangular is about above/below diagonal; diagonal means only diagonal may be nonzero.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "triangular_def") {
      const prompt = String.raw`
An **upper triangular** matrix is a square matrix where:
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Triangular definition",
        prompt,
        options: [
          { id: "a", text: "All entries below the diagonal are 0." },
          { id: "b", text: "All entries above the diagonal are 0." },
          { id: "c", text: "Only diagonal entries are 1." },
        ],
        hint: "Upper = zeros below. Lower = zeros above.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    // ------------------------------------------------------------
    // m2.elementwise_shift
    // ------------------------------------------------------------
    if (archetype === "star_vs_at") {
      const prompt = String.raw`
In NumPy, which operator performs **standard matrix multiplication**?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "* vs @",
        prompt,
        options: [
          { id: "a", text: "`*`" },
          { id: "b", text: "`@`" },
          { id: "c", text: "`**`" },
        ],
        hint: "`*` is element-wise; `@` is matrix multiplication.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    if (archetype === "hadamard_def") {
      const prompt = String.raw`
Hadamard (element-wise) multiplication is:
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Hadamard product",
        prompt,
        options: [
          { id: "a", text: "Dot product of rows and columns" },
          { id: "b", text: "Multiply entries component-wise (same shape required)" },
          { id: "c", text: "Only multiply diagonal entries" },
        ],
        hint: "Hadamard = element-by-element.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    if (archetype === "shifting_diagonal_only") {
      const prompt = String.raw`
Which operation changes **only the diagonal** entries of a square matrix
$$
\mathbf{A}
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Shifting",
        prompt,
        options: [
          { id: "a", text: String.raw`$$\mathbf{A} + \lambda$$` },
          { id: "b", text: String.raw`$$\mathbf{A} + \lambda\mathbf{I}$$` },
          { id: "c", text: String.raw`$$\lambda\mathbf{A}$$` },
        ],
        hint: "Shifting is A + λI, which touches only the diagonal.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    // ------------------------------------------------------------
    // m2.matmul
    // ------------------------------------------------------------
    if (archetype === "matmul_shape") {
      const m = rng.int(2, 4);
      const n = rng.int(2, 5);
      const k = rng.int(2, 5);

      const prompt = String.raw`
If
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}} \quad \text{and} \quad \mathbf{B}\in\mathbb{R}^{${shapeLatex(n, k)}},
$$
what is the shape of
$$
\mathbf{A}\mathbf{B}
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Matmul shape",
        prompt,
        options: [
          { id: "a", text: `${m}×${k}` },
          { id: "b", text: `${n}×${n}` },
          { id: "c", text: `${k}×${m}` },
        ],
        hint: "Inner dims match; result takes outer dims.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "valid_or_invalid") {
      const m = rng.int(2, 4);
      const n = rng.int(2, 5);
      const k = coinFlip(rng) ? n : rng.int(2, 6); // sometimes mismatch
      const valid = k === n;

      const colsOfB = rng.int(2, 6);

      const prompt = String.raw`
Is the product valid?

$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},\quad
\mathbf{B}\in\mathbb{R}^{${shapeLatex(k, colsOfB)}}
$$

Is
$$
\mathbf{A}\mathbf{B}
$$
defined?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Matmul validity",
        prompt,
        options: [
          { id: "yes", text: "Yes" },
          { id: "no", text: "No" },
        ],
        hint: "Valid iff inner dimensions match.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: valid ? "yes" : "no" },
      };
    }

    if (archetype === "matmul_entry_dot") {
      const A = [
        [rng.int(-range, range), rng.int(-range, range)],
        [rng.int(-range, range), rng.int(-range, range)],
      ];
      const B = [
        [rng.int(-range, range), rng.int(-range, range)],
        [rng.int(-range, range), rng.int(-range, range)],
      ];

      const i = rng.pick([0, 1] as const);
      const j = rng.pick([0, 1] as const);

      const row = A[i];
      const col = [B[0][j], B[1][j]];
      const correct = dot2(row, col);

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat2(A)},\quad
\mathbf{B}=${fmtMat2(B)},\quad
\mathbf{C}=\mathbf{A}\mathbf{B}.
$$

Compute the entry
$$
c_{${i + 1},${j + 1}}.
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "One matmul entry",
        prompt,
        hint: "cᵢⱼ = (row i of A) · (col j of B).",
      };

      return { archetype, exercise, expected: { kind: "numeric", value: correct, tolerance: 0 } };
    }

    // ✅ NEW: full AB with matrix_input (dynamic m×n times n×k)
    if (archetype === "matmul_full_matrix") {
      // keep it solvable: cap sizes by difficulty
      const maxDim = diff === "easy" ? 3 : diff === "medium" ? 4 : 5;

      const m = rng.int(2, maxDim);
      const n = rng.int(2, maxDim);
      const k = rng.int(2, maxDim);

      const A = randMat(rng, m, n, range);
      const B = randMat(rng, n, k, range);
      const C = matmul(A, B);

      const prompt = String.raw`
Let
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},\quad
\mathbf{B}\in\mathbb{R}^{${shapeLatex(n, k)}}.
$$

$$
\mathbf{A}=${fmtMat(A)},\qquad
\mathbf{B}=${fmtMat(B)}.
$$

Compute the full product:
$$
\mathbf{C}=\mathbf{A}\mathbf{B}.
$$
`.trim();

      const exercise: MatrixInputExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "matrix_input",
        title: "Compute A·B (full matrix)",
        prompt,
        rows: m,
        cols: k,
        tolerance: 0,
        integerOnly: true,
        step: 1,
        hint: "Each entry cᵢⱼ is (row i of A) · (col j of B).",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "matrix_input", values: C, tolerance: 0 },
      };
    }

    // ------------------------------------------------------------
    // m2.matvec
    // ------------------------------------------------------------
    if (archetype === "matvec_shape") {
      const m = rng.int(2, 5);
      const n = rng.int(2, 6);

      const prompt = String.raw`
If
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}} \quad \text{and} \quad \vec x\in\mathbb{R}^{${n}},
$$
what is the shape of
$$
\mathbf{A}\vec x
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Mat-vec shape",
        prompt,
        options: [
          { id: "a", text: `${m}×1 (a vector in ℝ^${m})` },
          { id: "b", text: `${n}×1 (a vector in ℝ^${n})` },
          { id: "c", text: `${m}×${n}` },
        ],
        hint: "(m×n)(n×1) = (m×1).",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "weighted_sum_columns") {
      const prompt = String.raw`
If the columns of
$$
\mathbf{A}
$$
are vectors
$$
\mathbf{a}_1,\dots,\mathbf{a}_n,
$$
which interpretation matches
$$
\mathbf{A}\vec w
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Columns interpretation",
        prompt,
        options: [
          { id: "a", text: "Weighted sum of columns of A" },
          { id: "b", text: "Element-wise multiplication of A and w" },
          { id: "c", text: "Always equals the dot product" },
        ],
        hint: "A w = w₁a₁ + w₂a₂ + ...",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "compute_small_matvec") {
      const A = [
        [rng.int(-range, range), rng.int(-range, range)],
        [rng.int(-range, range), rng.int(-range, range)],
      ];
      const x = [randIntNonZero(rng, -4, 4), randIntNonZero(rng, -4, 4)];

      const y0 = A[0][0] * x[0] + A[0][1] * x[1];
      const y1 = A[1][0] * x[0] + A[1][1] * x[1];

      const askFirst = coinFlip(rng);
      const correct = askFirst ? y0 : y1;

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat2(A)},\quad
\vec x=${fmtVec2(x[0], x[1])},\quad
\vec y=\mathbf{A}\vec x.
$$

Compute
$$
${askFirst ? "y_1" : "y_2"}.
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "Compute A·x",
        prompt,
        hint: "Multiply A by x: each row dot the vector.",
      };

      return { archetype, exercise, expected: { kind: "numeric", value: correct, tolerance: 0 } };
    }

    // ------------------------------------------------------------
    // m2.transpose_liveevil
    // ------------------------------------------------------------
    if (archetype === "transpose_product_rule") {
      const prompt = String.raw`
Which identity is correct?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "LIVE EVIL",
        prompt,
        options: [
          { id: "a", text: String.raw`$$(AB)^T = A^T B^T$$` },
          { id: "b", text: String.raw`$$(AB)^T = B^T A^T$$` },
          { id: "c", text: String.raw`$$(AB)^T = AB$$` },
        ],
        hint: "Transpose reverses order: (AB)ᵀ = BᵀAᵀ.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    if (archetype === "transpose_shape") {
      const { m, n } = pickShape(rng, 2, 6);

      const prompt = String.raw`
If
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},
$$
what is the shape of
$$
\mathbf{A}^T
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Transpose shape",
        prompt,
        options: [
          { id: "a", text: `${n}×${m}` },
          { id: "b", text: `${m}×${n}` },
          { id: "c", text: `${m}×${m}` },
        ],
        hint: "Transpose swaps rows and columns.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "double_transpose") {
      const prompt = String.raw`
True or false:
$$
(\mathbf{A}^T)^T = \mathbf{A}.
$$
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Double transpose",
        prompt,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        hint: "Transpose is an involution: doing it twice returns the original.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "true" } };
    }

    // ✅ NEW: enter full A^T (dynamic)
    if (archetype === "transpose_fill_matrix") {
      const maxDim = diff === "easy" ? 4 : diff === "medium" ? 5 : 6;
      const m = rng.int(2, maxDim);
      const n = rng.int(2, maxDim);

      const A = randMat(rng, m, n, range);
      const AT = Array.from({ length: n }, (_, r) =>
        Array.from({ length: m }, (_, c) => A[c][r])
      );

      const prompt = String.raw`
Let
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},\qquad
\mathbf{A}=${fmtMat(A)}.
$$

Compute the transpose:
$$
\mathbf{A}^T.
$$
`.trim();

      const exercise: MatrixInputExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "matrix_input",
        title: "Compute Aᵀ (full matrix)",
        prompt,
        rows: n,
        cols: m,
        tolerance: 0,
        integerOnly: true,
        step: 1,
        hint: "Transpose swaps rows and columns: (Aᵀ)ᵢⱼ = Aⱼᵢ.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "matrix_input", values: AT, tolerance: 0 },
      };
    }

    // ------------------------------------------------------------
    // m2.symmetric
    // ------------------------------------------------------------
    if (archetype === "symmetric_definition") {
      const prompt = String.raw`
A matrix
$$
\mathbf{A}
$$
is **symmetric** if:
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Symmetry",
        prompt,
        options: [
          { id: "a", text: String.raw`$$\mathbf{A}=\mathbf{A}^T$$` },
          { id: "b", text: String.raw`$$\mathbf{A}^T=-\mathbf{A}$$` },
          { id: "c", text: String.raw`$$\mathbf{A}\mathbf{A}=\mathbf{I}$$` },
        ],
        hint: "Symmetric means mirrored across the diagonal: A = Aᵀ.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "a" } };
    }

    if (archetype === "ata_shape") {
      const m = rng.int(2, 6);
      const n = rng.int(2, 6);

      const prompt = String.raw`
If
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},
$$
what is the shape of
$$
\mathbf{A}^T\mathbf{A}
$$
?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Shape of AᵀA",
        prompt,
        options: [
          { id: "a", text: `${m}×${m}` },
          { id: "b", text: `${n}×${n}` },
          { id: "c", text: `${m}×${n}` },
        ],
        hint: "Aᵀ is n×m, so (n×m)(m×n)=n×n.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "b" } };
    }

    if (archetype === "ata_is_symmetric") {
      const prompt = String.raw`
True or false: for any matrix
$$
\mathbf{A},
$$
the matrix
$$
\mathbf{A}^T\mathbf{A}
$$
is symmetric.
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "AᵀA symmetry",
        prompt,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        hint: "Use LIVE EVIL: (AᵀA)ᵀ = Aᵀ(Aᵀ)ᵀ = AᵀA.",
      };

      return { archetype, exercise, expected: { kind: "single_choice", optionId: "true" } };
    }

    // Fallback
    const fallback: SingleChoiceExercise = {
      id,
      topic: topicSlug,
      difficulty: diff,
      kind: "single_choice",
      title: "Matrices (fallback)",
      prompt: "Fallback exercise.",
      options: [{ id: "ok", text: "OK" }],
    };

    return {
      archetype: "fallback",
      exercise: fallback,
      expected: { kind: "single_choice", optionId: "ok" },
    };
  };
}
