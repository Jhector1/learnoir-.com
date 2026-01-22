// src/lib/practice/generatorImpl/topics/matricesPart2.ts
import type {
  Difficulty,
  ExerciseKind,
  NumericExercise,
  SingleChoiceExercise,
  MatrixInputExercise,
} from "../../types";
import type { GenOut } from "../expected";
import type { RNG } from "../rng";

// ---------------- LaTeX helpers ----------------
function shapeLatex(m: number, n: number) {
  return String.raw`${m}\times${n}`;
}

function fmtMat(A: number[][]) {
  const rows = A.map((row) => row.join(" & ")).join(String.raw`\\ `);
  return String.raw`\begin{bmatrix}${rows}\end{bmatrix}`;
}

function fmtMat2(A: number[][]) {
  return String.raw`\begin{bmatrix}${A[0][0]} & ${A[0][1]}\\ ${A[1][0]} & ${A[1][1]}\end{bmatrix}`;
}

// ---------------- type-safe “ensure nonzero” helpers ----------------
// IMPORTANT: Do NOT write `if (A.every(...)) A[0][0] = 1;`
// Newer TS may narrow A to 0[][] inside that if, causing:
//   Type '1' is not assignable to type '0'.
// function ensureNonZeroMatrix(A: number[][]) {
//   const allZero = A.every((row) => row.every((v) => v === 0));
//   if (allZero) A[0][0] = 1;
//   return A;
// }

// function ensureNonZeroVector(x: number[]) {
//   const allZero = x.every((v) => v === 0);
//   if (allZero) x[0] = 1;
//   return x;
// }






// ---------------- type-safe “ensure nonzero” helpers ----------------
function isAllZeroMatrix(A: number[][]): boolean {
  for (let i = 0; i < A.length; i++) {
    const row = A[i];
    for (let j = 0; j < row.length; j++) {
      if (row[j] !== 0) return false;
    }
  }
  return true;
}

function ensureNonZeroMatrix(A: number[][]) {
  if (isAllZeroMatrix(A)) {
    // no TS narrowing here
    A[0][0] = 1;
  }
  return A;
}

function isAllZeroVector(x: number[]): boolean {
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== 0) return false;
  }
  return true;
}

function ensureNonZeroVector(x: number[]) {
  if (isAllZeroVector(x)) {
    x[0] = 1;
  }
  return x;
}






// ---------------- small utils ----------------
function coinFlip(rng: RNG) {
  return rng.int(0, 1) === 1;
}

function randIntNonZero(rng: RNG, lo: number, hi: number) {
  let v = 0;
  while (v === 0) v = rng.int(lo, hi);
  return v;
}

function randMat(rng: RNG, m: number, n: number, range: number) {
  return Array.from({ length: m }, () =>
    Array.from({ length: n }, () => rng.int(-range, range)),
  );
}

function pickShape(rng: RNG, min = 2, max = 4) {
  const m = rng.int(min, max);
  const n = rng.int(min, max);
  return { m, n };
}

function matVec(A: number[][], x: number[]) {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const out = Array.from({ length: m }, () => 0);
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * (x[j] ?? 0);
    out[i] = s;
  }
  return out;
}

function augmentWithVector(A: number[][], b: number[]) {
  return A.map((row, i) => [...row, b[i] ?? 0]);
}

// ---------------- exact rational rank ----------------
type Frac = { n: number; d: number };

function igcd(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

function normFrac(n: number, d: number): Frac {
  if (d === 0) throw new Error("division by zero");
  if (n === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  const nn = n * sign;
  const dd = d * sign;
  const g = igcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

function f1(n: number): Frac {
  return { n, d: 1 };
}

function isZeroF(x: Frac) {
  return x.n === 0;
}

function subF(a: Frac, b: Frac): Frac {
  return normFrac(a.n * b.d - b.n * a.d, a.d * b.d);
}
function mulF(a: Frac, b: Frac): Frac {
  return normFrac(a.n * b.n, a.d * b.d);
}
function divF(a: Frac, b: Frac): Frac {
  if (b.n === 0) throw new Error("division by zero");
  return normFrac(a.n * b.d, a.d * b.n);
}

function toFracMat(A: number[][]): Frac[][] {
  return A.map((row) => row.map((v) => f1(v)));
}

/**
 * Rank over ℝ using exact rationals (safe for small integer matrices).
 */
function rankOf(A: number[][]): number {
  const M = toFracMat(A);
  const m = M.length;
  const n = M[0]?.length ?? 0;
  let r = 0;
  let c = 0;

  while (r < m && c < n) {
    // find pivot
    let piv = -1;
    for (let i = r; i < m; i++) {
      if (!isZeroF(M[i][c])) {
        piv = i;
        break;
      }
    }
    if (piv === -1) {
      c++;
      continue;
    }

    // swap
    if (piv !== r) {
      const tmp = M[piv];
      M[piv] = M[r];
      M[r] = tmp;
    }

    // normalize pivot row
    const pivotVal = M[r][c];
    for (let j = c; j < n; j++) M[r][j] = divF(M[r][j], pivotVal);

    // eliminate below
    for (let i = r + 1; i < m; i++) {
      const factor = M[i][c];
      if (isZeroF(factor)) continue;
      for (let j = c; j < n; j++) {
        M[i][j] = subF(M[i][j], mulF(factor, M[r][j]));
      }
    }

    r++;
    c++;
  }

  return r;
}

// ---------------- determinants (keep small) ----------------
function det2(A: number[][]) {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

function det3(A: number[][]) {
  const a = A[0][0],
    b = A[0][1],
    c = A[0][2];
  const d = A[1][0],
    e = A[1][1],
    f = A[1][2];
  const g = A[2][0],
    h = A[2][1],
    i = A[2][2];
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function frobSq(A: number[][]) {
  let s = 0;
  for (const row of A) for (const v of row) s += v * v;
  return s;
}

function buildAminusLambdaI_2x2(A: number[][], lam: number) {
  return [
    [A[0][0] - lam, A[0][1]],
    [A[1][0], A[1][1] - lam],
  ];
}

// ---------------- main factory ----------------
export function makeGenMatricesPart2(topicSlug: string) {
  return (rng: RNG, diff: Difficulty, id: string): GenOut<ExerciseKind> => {
    const range = diff === "easy" ? 5 : diff === "medium" ? 8 : 10;

    const archetype = (() => {
      switch (topicSlug) {
        // “mix” topic
        case "m3.matrices_part2":
          return rng.weighted([
            { value: "frobenius_sq" as const, w: 4 },
            { value: "trace_ata" as const, w: 3 },
            { value: "colspace_membership" as const, w: 4 },
            { value: "nullity_from_matrix" as const, w: 4 },
            { value: "rank_compute" as const, w: 4 },
            { value: "det_compute" as const, w: 4 },
            { value: "det_invertible" as const, w: 3 },
            { value: "build_A_minus_lambdaI" as const, w: 3 },
            { value: "det_A_minus_lambdaI" as const, w: 3 },
            { value: "eigen_check" as const, w: 2 },
          ]);

        case "m3.norms":
          return rng.weighted([
            { value: "frobenius_sq" as const, w: 6 },
            { value: "trace_ata" as const, w: 5 },
            { value: "norms_concept" as const, w: 2 },
          ]);

        case "m3.colspace":
          return rng.weighted([
            { value: "colspace_membership" as const, w: 7 },
            { value: "colspace_concept" as const, w: 2 },
          ]);

        case "m3.nullspace":
          return rng.weighted([
            { value: "nullity_from_matrix" as const, w: 6 },
            { value: "nullspace_concept" as const, w: 2 },
            { value: "rank_nullity_theorem" as const, w: 3 },
          ]);

        case "m3.rank":
          return rng.weighted([
            { value: "rank_compute" as const, w: 7 },
            { value: "rank_concept" as const, w: 3 },
          ]);

        case "m3.det":
          return rng.weighted([
            { value: "det_compute" as const, w: 7 },
            { value: "det_invertible" as const, w: 4 },
            { value: "det_concept" as const, w: 2 },
          ]);

        case "m3.charpoly":
          return rng.weighted([
            { value: "build_A_minus_lambdaI" as const, w: 5 },
            { value: "det_A_minus_lambdaI" as const, w: 5 },
            { value: "eigen_check" as const, w: 4 },
            { value: "charpoly_concept" as const, w: 2 },
          ]);

        default:
          return rng.weighted([{ value: "rank_compute" as const, w: 1 }]);
      }
    })();

    // ------------------------------------------------------------
    // m3.norms
    // ------------------------------------------------------------
    if (archetype === "frobenius_sq") {
      const { m, n } = pickShape(rng, 2, diff === "easy" ? 3 : 4);
      const A = ensureNonZeroMatrix(randMat(rng, m, n, range));
      const correct = frobSq(A);

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat(A)}.
$$

Compute the **squared Frobenius norm**:
$$
\|\mathbf{A}\|_F^2=\sum_{i,j} a_{i,j}^2.
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "Frobenius norm (squared)",
        prompt,
        hint: "Square every entry, then add them all.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "numeric", value: correct, tolerance: 0 },
      };
    }

    if (archetype === "trace_ata") {
      const { m, n } = pickShape(rng, 2, diff === "easy" ? 3 : 4);
      const A = ensureNonZeroMatrix(randMat(rng, m, n, range));
      const correct = frobSq(A);

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat(A)}.
$$

Use the identity
$$
\mathrm{trace}(\mathbf{A}^T\mathbf{A})=\|\mathbf{A}\|_F^2
$$
to compute
$$
\mathrm{trace}(\mathbf{A}^T\mathbf{A}).
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "trace(AᵀA)",
        prompt,
        hint: "trace(AᵀA) equals sum of squares of all entries of A.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "numeric", value: correct, tolerance: 0 },
      };
    }

    if (archetype === "norms_concept") {
      const prompt = String.raw`
Which statement is true?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Norm concept",
        prompt,
        options: [
          { id: "a", text: "A matrix norm can be negative." },
          { id: "b", text: "The Frobenius norm is 0 exactly when all entries are 0." },
          { id: "c", text: "‖A‖F equals trace(A)." },
        ],
        hint: "Norms are nonnegative; Frobenius is zero iff all entries are zero.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "b" },
      };
    }

    // ------------------------------------------------------------
    // m3.colspace
    // ------------------------------------------------------------
    if (archetype === "colspace_membership") {
      // Keep small to reduce “rank” work for students.
      const m = rng.int(2, diff === "easy" ? 2 : 3);
      const n = rng.int(2, diff === "easy" ? 2 : 3);

      // Build A with at least one nonzero entry
      const A = ensureNonZeroMatrix(randMat(rng, m, n, range));

      const wantYes = coinFlip(rng);

      let b: number[] = [];
      if (wantYes) {
        const x = ensureNonZeroVector(Array.from({ length: n }, () => rng.int(-2, 2)));
        b = matVec(A, x);
      } else {
        // pick b until it is NOT in col(A): rank([A|b]) > rank(A)
        const rA = rankOf(A);
        let tries = 0;
        while (true) {
          tries++;
          b = Array.from({ length: m }, () => rng.int(-range, range));
          if (b.every((v) => v === 0)) continue;
          const Ab = augmentWithVector(A, b);
          const rAb = rankOf(Ab);
          if (rAb > rA) break;
          if (tries > 40) break; // fallback to avoid infinite loops
        }
      }

      const isIn = rankOf(augmentWithVector(A, b)) === rankOf(A);

      const bLatex = String.raw`\begin{bmatrix}${b.join(String.raw`\\ `)}\end{bmatrix}`;

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat(A)},\qquad
\mathbf{b}=${bLatex}.
$$

Is
$$
\mathbf{b}\in \mathrm{Col}(\mathbf{A})?
$$

(You can use the test $\mathrm{rank}(\mathbf{A})=\mathrm{rank}([\mathbf{A}\mid \mathbf{b}])$.)
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Column space membership",
        prompt,
        options: [
          { id: "yes", text: "Yes" },
          { id: "no", text: "No" },
        ],
        hint: "Compute ranks: if adding b as a column increases rank, b is not in the column space.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: isIn ? "yes" : "no" },
      };
    }

    if (archetype === "colspace_concept") {
      const prompt = String.raw`
Which statement is true?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Column space concept",
        prompt,
        options: [
          { id: "a", text: "Col(A) is the set of all rows of A." },
          { id: "b", text: "Col(A) is the set of all linear combinations of columns of A." },
          { id: "c", text: "Col(A) always equals ℝⁿ where A is m×n." },
        ],
        hint: "Column space = all possible A x = combinations of columns.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "b" },
      };
    }

    // ------------------------------------------------------------
    // m3.nullspace
    // ------------------------------------------------------------
    if (archetype === "nullity_from_matrix") {
      const m = rng.int(2, diff === "easy" ? 3 : 4);
      const n = rng.int(2, diff === "easy" ? 3 : 4);
      const A = ensureNonZeroMatrix(randMat(rng, m, n, range));

      const r = rankOf(A);
      const nullity = n - r;

      const prompt = String.raw`
Let
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},\qquad
\mathbf{A}=${fmtMat(A)}.
$$

Compute the **nullity**:
$$
\mathrm{nullity}(\mathbf{A})=\dim(\mathrm{Null}(\mathbf{A})).
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "Nullity",
        prompt,
        hint: "Use rank–nullity: nullity(A) = n − rank(A), where A is m×n.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "numeric", value: nullity, tolerance: 0 },
      };
    }

    if (archetype === "nullspace_concept") {
      const prompt = String.raw`
True or false:
$$
\vec 0 \in \mathrm{Null}(\mathbf{A})
$$
for any matrix $\mathbf{A}$.
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Null space contains zero",
        prompt,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        hint: "A·0 = 0 always, so the zero vector is always in the null space.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "true" },
      };
    }

    if (archetype === "rank_nullity_theorem") {
      const m = rng.int(2, 5);
      const n = rng.int(2, 6);

      const prompt = String.raw`
For a matrix
$$
\mathbf{A}\in\mathbb{R}^{${shapeLatex(m, n)}},
$$
which identity is always true?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Rank–Nullity",
        prompt,
        options: [
          { id: "a", text: String.raw`$$\mathrm{rank}(\mathbf{A})+\mathrm{nullity}(\mathbf{A}) = ${m}$$` },
          { id: "b", text: String.raw`$$\mathrm{rank}(\mathbf{A})+\mathrm{nullity}(\mathbf{A}) = ${n}$$` },
          { id: "c", text: String.raw`$$\mathrm{rank}(\mathbf{A})\cdot\mathrm{nullity}(\mathbf{A}) = ${n}$$` },
        ],
        hint: "Rank–nullity uses the number of columns n.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "b" },
      };
    }

    // ------------------------------------------------------------
    // m3.rank
    // ------------------------------------------------------------
    if (archetype === "rank_compute") {
      const m = rng.int(2, diff === "easy" ? 3 : 4);
      const n = rng.int(2, diff === "easy" ? 3 : 4);
      const A = ensureNonZeroMatrix(randMat(rng, m, n, range));

      const r = rankOf(A);

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat(A)}.
$$

Compute:
$$
\mathrm{rank}(\mathbf{A}).
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "Rank",
        prompt,
        hint: "Row-reduce (or reason about independent rows/columns). Rank = # pivots.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "numeric", value: r, tolerance: 0 },
      };
    }

    if (archetype === "rank_concept") {
      const prompt = String.raw`
Which statement is true?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Rank concept",
        prompt,
        options: [
          { id: "a", text: "rank(A) can be larger than the number of columns." },
          { id: "b", text: "rank(A) equals the number of pivot columns in RREF(A)." },
          { id: "c", text: "rank(A) equals the determinant of A." },
        ],
        hint: "Rank is a dimension: number of pivots (independent columns/rows).",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "b" },
      };
    }

    // ------------------------------------------------------------
    // m3.det
    // ------------------------------------------------------------
    if (archetype === "det_compute") {
      const use3x3 = diff !== "easy" && coinFlip(rng);
      const Araw = use3x3 ? randMat(rng, 3, 3, range) : randMat(rng, 2, 2, range);
      const A = ensureNonZeroMatrix(Araw);

      const correct = use3x3 ? det3(A) : det2(A);

      const prompt = String.raw`
Compute the determinant:
$$
\det(\mathbf{A}),\qquad \mathbf{A}=${use3x3 ? fmtMat(A) : fmtMat2(A)}.
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "Determinant",
        prompt,
        hint: use3x3 ? "Use cofactor expansion or a known 3×3 method." : "For 2×2: det = ad − bc.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "numeric", value: correct, tolerance: 0 },
      };
    }

    if (archetype === "det_invertible") {
      const use3x3 = diff === "hard";
      const Araw = use3x3 ? randMat(rng, 3, 3, range) : randMat(rng, 2, 2, range);
      const A = ensureNonZeroMatrix(Araw);

      const d = use3x3 ? det3(A) : det2(A);
      const inv = d !== 0;

      const prompt = String.raw`
Let
$$
\mathbf{A}=${use3x3 ? fmtMat(A) : fmtMat2(A)}.
$$

Is $\mathbf{A}$ **invertible**?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Invertible?",
        prompt,
        options: [
          { id: "yes", text: "Yes" },
          { id: "no", text: "No" },
        ],
        hint: "A square matrix is invertible iff det(A) ≠ 0.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: inv ? "yes" : "no" },
      };
    }

    if (archetype === "det_concept") {
      const prompt = String.raw`
Which statement is true (for square matrices)?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Determinant concept",
        prompt,
        options: [
          { id: "a", text: "det(A)=0 means A is invertible." },
          { id: "b", text: "det(A) changes sign when you swap two rows." },
          { id: "c", text: "det(A) is the same as rank(A)." },
        ],
        hint: "Row swaps flip the determinant sign.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "b" },
      };
    }

    // ------------------------------------------------------------
    // m3.charpoly (2×2 friendly)
    // ------------------------------------------------------------
    if (archetype === "build_A_minus_lambdaI") {
      const A = ensureNonZeroMatrix(randMat(rng, 2, 2, range));

      const lam = rng.int(-4, 4);
      const M = buildAminusLambdaI_2x2(A, lam);

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat2(A)},\qquad \lambda=${lam}.
$$

Compute the matrix:
$$
\mathbf{A}-\lambda\mathbf{I}.
$$
`.trim();

      const exercise: MatrixInputExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "matrix_input",
        title: "Build A−λI",
        prompt,
        rows: 2,
        cols: 2,
        tolerance: 0,
        integerOnly: true,
        step: 1,
        hint: "Subtract λ from diagonal entries only.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "matrix_input", values: M, tolerance: 0 },
      };
    }

    if (archetype === "det_A_minus_lambdaI") {
      const a = rng.int(-range, range);
      const b = rng.int(-range, range);
      const off = diff === "easy" ? 0 : rng.int(-3, 3);
      const A = [
        [a, off],
        [0, b],
      ];
      const lam = rng.int(-4, 4);

      const M = buildAminusLambdaI_2x2(A, lam);
      const correct = det2(M);

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat2(A)},\qquad \lambda=${lam}.
$$

Compute:
$$
\det(\mathbf{A}-\lambda\mathbf{I}).
$$
`.trim();

      const exercise: NumericExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "numeric",
        title: "det(A−λI)",
        prompt,
        hint: "Form A−λI by subtracting λ from diagonal entries, then use 2×2 det.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "numeric", value: correct, tolerance: 0 },
      };
    }

    if (archetype === "eigen_check") {
      const a = randIntNonZero(rng, -5, 5);
      const b = randIntNonZero(rng, -5, 5);
      const off = diff === "easy" ? 0 : rng.int(-3, 3);
      const A = [
        [a, off],
        [0, b],
      ];

      const wantYes = coinFlip(rng);
      const lam = wantYes
        ? rng.pick([a, b] as const)
        : (() => {
            let t = rng.int(-6, 6);
            while (t === a || t === b) t = rng.int(-6, 6);
            return t;
          })();

      const detVal = det2(buildAminusLambdaI_2x2(A, lam));
      const isEigen = detVal === 0;

      const prompt = String.raw`
Let
$$
\mathbf{A}=${fmtMat2(A)}.
$$

Is
$$
\lambda=${lam}
$$
an eigenvalue of $\mathbf{A}$?

(Recall: $\lambda$ is an eigenvalue iff $\det(\mathbf{A}-\lambda\mathbf{I})=0$.)
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Eigenvalue check",
        prompt,
        options: [
          { id: "yes", text: "Yes" },
          { id: "no", text: "No" },
        ],
        hint: "Compute det(A−λI). If it’s 0 → eigenvalue.",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: isEigen ? "yes" : "no" },
      };
    }

    if (archetype === "charpoly_concept") {
      const prompt = String.raw`
Which statement is true?
`.trim();

      const exercise: SingleChoiceExercise = {
        id,
        topic: topicSlug,
        difficulty: diff,
        kind: "single_choice",
        title: "Characteristic idea",
        prompt,
        options: [
          { id: "a", text: String.raw`Eigenvalues satisfy $$\det(\mathbf{A}-\lambda\mathbf{I})=0.$$` },
          { id: "b", text: "Eigenvalues satisfy det(A)=1." },
          { id: "c", text: "Eigenvalues are always integers." },
        ],
        hint: "Eigenvalues are roots of det(A−λI).",
      };

      return {
        archetype,
        exercise,
        expected: { kind: "single_choice", optionId: "a" },
      };
    }

    // ------------------------------------------------------------
    // Fallback
    // ------------------------------------------------------------
    const fallback: SingleChoiceExercise = {
      id,
      topic: topicSlug,
      difficulty: diff,
      kind: "single_choice",
      title: "Matrices Part 2 (fallback)",
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
