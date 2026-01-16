// src/lib/practice/generator/topics/vectorsPart1.ts
import type {
  Difficulty,
  Exercise,
  ExerciseKind,
  NumericExercise,
  SingleChoiceExercise,
  MatrixInputExercise,
} from "../../types";
import type { GenOut } from "../expected";
import type { RNG } from "../rng";

// ---------------- LaTeX helpers ----------------
function fmtCol(v: number[]) {
  return String.raw`\begin{bmatrix}${v.map((x) => `${x}`).join(`\\ `)}\end{bmatrix}`;
}
function fmtRow(v: number[]) {
  return String.raw`\begin{bmatrix}${v.map((x) => `${x}`).join(` & `)}\end{bmatrix}`;
}
function fmtVec2(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}
function fmtVecN(v: number[]) {
  return fmtCol(v); // math convention
}
function fmtShape(r: number, c?: number) {
  return c === undefined ? `(${r},)` : `(${r}, ${c})`;
}

// ---------------- matrix-input helpers ----------------
function vecToColMatrix(v: number[]) {
  return v.map((x) => [x]); // n×1
}
function addVec(a: number[], b: number[]) {
  return a.map((x, i) => x + b[i]);
}
function subVec(a: number[], b: number[]) {
  return a.map((x, i) => x - b[i]);
}
function mulScalar(s: number, v: number[]) {
  return v.map((x) => s * x);
}

// ---------------- math helpers ----------------
function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]) {
  return Math.sqrt(dot(a, a));
}
function roundTo(x: number, d: number) {
  const p = 10 ** d;
  return Math.round(x * p) / p;
}
function randNonZeroInt(rng: RNG, lo: number, hi: number) {
  let v = 0;
  while (v === 0) v = rng.int(lo, hi);
  return v;
}
function coinFlip(rng: RNG) {
  return rng.int(0, 1) === 1;
}
function pickLen(rng: RNG, diff: Difficulty) {
  return diff === "easy" ? 3 : diff === "medium" ? 4 : 5;
}
function vecInts(rng: RNG, n: number, range: number, allowZero = true) {
  let v: number[] = Array.from({ length: n }, () => rng.int(-range, range));

  if (!allowZero) {
    while (v.every((x) => x === 0)) {
      v = Array.from({ length: n }, () => rng.int(-range, range));
    }
  }

  return v;
}

export function genVectorsPart1(
  rng: RNG,
  diff: Difficulty,
  id: string
): GenOut<ExerciseKind> {
  const range = diff === "easy" ? 5 : diff === "medium" ? 8 : 12;

  const archetype = rng.weighted([
    { value: "dim_and_orientation" as const, w: 4 },
    { value: "R_n_membership" as const, w: 3 },
    { value: "numpy_shapes" as const, w: 5 },
    { value: "add_defined_math" as const, w: 4 },
    { value: "add_broadcasting_python" as const, w: 3 },
    { value: "scalar_mult_list_vs_array" as const, w: 4 },
    { value: "magnitude_numeric" as const, w: 4 },
    { value: "unit_vector_numeric" as const, w: diff === "hard" ? 4 : 2 },
    { value: "dot_numeric" as const, w: 5 },
    { value: "dot_sign_angle" as const, w: 3 },
    { value: "hadamard_bug" as const, w: 3 },
    { value: "outer_product_entry" as const, w: diff === "hard" ? 4 : 2 },
    { value: "orth_proj_beta" as const, w: diff === "hard" ? 4 : 2 },

    // ✅ NEW: vector input (as n×1 matrix_input)
    { value: "vector_input_add" as const, w: diff === "easy" ? 3 : 4 },
    { value: "vector_input_sub" as const, w: diff === "easy" ? 2 : 3 },
    { value: "vector_input_scalar_mult" as const, w: diff === "easy" ? 3 : 4 },
  ]);

  const TOPIC = "vectors" as const;

  // ------------------------------------------------------------
  // ✅ NEW) Vector input: a + b (enter as column vector)
  // ------------------------------------------------------------
  if (archetype === "vector_input_add") {
    const n = pickLen(rng, diff);
    const a = vecInts(rng, n, range, false);
    const b = vecInts(rng, n, range, false);
    const out = addVec(a, b);

    const prompt = String.raw`
Let

$$
a=${fmtVecN(a)},\qquad b=${fmtVecN(b)}.
$$

Compute

$$
a+b
$$

and enter your answer as a **column vector** (shape $${n}\times 1$).
`.trim();

    const exercise: MatrixInputExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "matrix_input",
      title: "Vector input: a + b",
      prompt,
      rows: n,
      cols: 1,
      tolerance: 0,
      integerOnly: true,
      step: 1,
      hint: "Add component-wise. Enter as an n×1 column vector.",
    };

    return {
      archetype,
      exercise,
      expected: { kind: "matrix_input", values: vecToColMatrix(out), tolerance: 0 },
    };
  }

  // ------------------------------------------------------------
  // ✅ NEW) Vector input: a - b (enter as column vector)
  // ------------------------------------------------------------
  if (archetype === "vector_input_sub") {
    const n = pickLen(rng, diff);
    const a = vecInts(rng, n, range, false);
    const b = vecInts(rng, n, range, false);
    const out = subVec(a, b);

    const prompt = String.raw`
Let

$$
a=${fmtVecN(a)},\qquad b=${fmtVecN(b)}.
$$

Compute

$$
a-b
$$

and enter your answer as a **column vector** (shape $${n}\times1$$).
`.trim();

    const exercise: MatrixInputExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "matrix_input",
      title: "Vector input: a − b",
      prompt,
      rows: n,
      cols: 1,
      tolerance: 0,
      integerOnly: true,
      step: 1,
      hint: "Subtract component-wise. Enter as an n×1 column vector.",
    };

    return {
      archetype,
      exercise,
      expected: { kind: "matrix_input", values: vecToColMatrix(out), tolerance: 0 },
    };
  }

  // ------------------------------------------------------------
  // ✅ NEW) Vector input: γv (enter as column vector)
  // ------------------------------------------------------------
  if (archetype === "vector_input_scalar_mult") {
    const n = pickLen(rng, diff);
    const v = vecInts(rng, n, range, false);

    const gamma =
      diff === "easy"
        ? rng.pick([-3, -2, -1, 2, 3] as const)
        : rng.pick([-4, -3, -2, -1, 2, 3, 4] as const);

    const out = mulScalar(gamma, v);

    const prompt = String.raw`
Let

$$
v=${fmtVecN(v)}.
$$

Compute the scalar multiple

$$
${gamma}\,v
$$

and enter your answer as a **column vector** (shape $${n}\times1$$).
`.trim();

    const exercise: MatrixInputExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "matrix_input",
      title: "Vector input: scalar multiple",
      prompt,
      rows: n,
      cols: 1,
      tolerance: 0,
      integerOnly: true,
      step: 1,
      hint: "Multiply every component by the scalar. Enter as an n×1 column vector.",
    };

    return {
      archetype,
      exercise,
      expected: { kind: "matrix_input", values: vecToColMatrix(out), tolerance: 0 },
    };
  }

  // ------------------------------------------------------------
  // 1) Dimensionality + orientation (math)
  // ------------------------------------------------------------
  if (archetype === "dim_and_orientation") {
    const n = pickLen(rng, diff);
    const v = vecInts(rng, n, range, false);
    const isRow = coinFlip(rng);

    const display = isRow ? fmtRow(v) : fmtCol(v);
    const correctOri = isRow ? "row" : "col";
    const key = `${n}D_${correctOri}` as const;

    const prompt = String.raw`
Consider the vector

$$
v=${display}.
$$

1) What is the **mathematical dimensionality** of $$v$$?  
2) Is $$v$$ written as a **row** vector or a **column** vector?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Dimensionality and orientation",
      prompt,
      options: [
        { id: "A", text: "2D, row" },
        { id: "B", text: "2D, column" },
        { id: "C", text: "3D, row" },
        { id: "D", text: "3D, column" },
        { id: "E", text: "4D, row" },
        { id: "F", text: "4D, column" },
        { id: "G", text: "5D, row" },
        { id: "H", text: "5D, column" },
      ],
      hint: "Math dimensionality = number of elements. Orientation = row vs column layout.",
    };

    const idMap: Record<
      "2D_row" | "2D_col" | "3D_row" | "3D_col" | "4D_row" | "4D_col" | "5D_row" | "5D_col",
      string
    > = {
      "2D_row": "A",
      "2D_col": "B",
      "3D_row": "C",
      "3D_col": "D",
      "4D_row": "E",
      "4D_col": "F",
      "5D_row": "G",
      "5D_col": "H",
    };

    const optionId = idMap[key as keyof typeof idMap];
    return { archetype, exercise, expected: { kind: "single_choice", optionId } };
  }

  // ------------------------------------------------------------
  // 2) Membership in R^n
  // ------------------------------------------------------------
  if (archetype === "R_n_membership") {
    const n = pickLen(rng, diff);
    const v = vecInts(rng, n, range, false);

    const prompt = String.raw`
Let

$$
v=${fmtVecN(v)}.
$$

Which statement is correct?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Vector in ℝⁿ",
      prompt,
      options: [
        { id: "A", text: String.raw`$$v\in\mathbb{R}^{${n}}$$` },
        { id: "B", text: String.raw`$$v\in\mathbb{R}^{${n - 1}}$$` },
        { id: "C", text: String.raw`$$v\in\mathbb{R}^{${n + 1}}$$` },
        { id: "D", text: "Cannot be determined" },
      ],
      hint: "If a vector has n elements, it lives in ℝⁿ.",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "A" } };
  }

  // ------------------------------------------------------------
  // 3) NumPy shapes (asList/asArray/rowVec/colVec)
  // ------------------------------------------------------------
  if (archetype === "numpy_shapes") {
    const n = 3;

    const prompt = String.raw`
In Python/NumPy, consider:

~~~python
asList  = [1,2,3]
asArray = np.array([1,2,3])
rowVec  = np.array([[1,2,3]])
colVec  = np.array([[1],[2],[3]])
~~~

Which set of shapes is correct for \`asList\`, \`asArray\`, \`rowVec\`, \`colVec\`?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Vector shapes in NumPy",
      prompt,
      options: [
        { id: "A", text: `${fmtShape(n)} , ${fmtShape(n)} , ${fmtShape(1, n)} , ${fmtShape(n, 1)}` },
        { id: "B", text: `${fmtShape(1, n)} , ${fmtShape(n, 1)} , ${fmtShape(n)} , ${fmtShape(n)}` },
        { id: "C", text: `${fmtShape(n, 1)} , ${fmtShape(1, n)} , ${fmtShape(n)} , ${fmtShape(n)}` },
        { id: "D", text: `${fmtShape(n)} , ${fmtShape(1, n)} , ${fmtShape(n, 1)} , ${fmtShape(n)}` },
      ],
      hint: "1D arrays have shape (n,). Row vector is (1,n). Column vector is (n,1).",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "A" } };
  }

  // ------------------------------------------------------------
  // 4) Vector addition defined in math?
  // ------------------------------------------------------------
  if (archetype === "add_defined_math") {
    const n1 = pickLen(rng, diff);
    const n2 = rng.pick([n1, Math.max(2, n1 - 1), n1 + 1] as const);

    const a = vecInts(rng, n1, range, false);
    const b = vecInts(rng, n2, range, false);

    const same = n1 === n2;

    const prompt = String.raw`
Let

$$
a=${fmtVecN(a)},
\qquad
b=${fmtVecN(b)}.
$$

Is the sum $$a+b$$ **defined** in linear algebra?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "When is addition defined?",
      prompt,
      options: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
      hint: "Vector addition requires the same number of elements (same ℝⁿ).",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: same ? "yes" : "no" } };
  }

  // ------------------------------------------------------------
  // 5) Broadcasting result shape (row + column)
  // ------------------------------------------------------------
  if (archetype === "add_broadcasting_python") {
    const n = 3;
    const m = 2;

    const prompt = String.raw`
In NumPy:

~~~python
v = np.array([[1,2,3]])     # shape (1,3)
w = np.array([[10,20]]).T   # shape (2,1)
v + w
~~~

What is the **shape** of the result?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Broadcasting shape",
      prompt,
      options: [
        { id: "A", text: fmtShape(1, 3) },
        { id: "B", text: fmtShape(2, 1) },
        { id: "C", text: fmtShape(m, n) }, // (2,3)
        { id: "D", text: fmtShape(n, m) }, // (3,2)
      ],
      hint: "Broadcasting expands (2,1) across columns and (1,3) across rows → (2,3).",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "C" } };
  }

  // ------------------------------------------------------------
  // 6) Scalar * list vs scalar * np.array
  // ------------------------------------------------------------
  if (archetype === "scalar_mult_list_vs_array") {
    const s = rng.pick([2, 3, 4] as const);

    const prompt = String.raw`
In Python:

~~~python
s = ${s}
a = [3,4,5]            # list
b = np.array([3,4,5])  # NumPy array

a*s
b*s
~~~

Which statement is correct?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Scalar multiplication in Python",
      prompt,
      options: [
        { id: "A", text: "Both a*s and b*s do element-wise multiplication." },
        { id: "B", text: "a*s repeats the list; b*s does element-wise multiplication." },
        { id: "C", text: "a*s errors; b*s repeats the array." },
        { id: "D", text: "Both repeat their contents." },
      ],
      hint: "In Python, list * integer repeats the list.",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "B" } };
  }

  // ------------------------------------------------------------
  // 7) Magnitude (norm) numeric
  // ------------------------------------------------------------
  if (archetype === "magnitude_numeric") {
    const v = [randNonZeroInt(rng, -range, range), rng.int(-range, range)];
    const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1]);

    const decimals = diff === "easy" ? 1 : 2;
    const value = roundTo(mag, decimals);
    const tol = diff === "easy" ? 0.2 : 0.05;

    const prompt = String.raw`
Compute the magnitude (Euclidean norm) of

$$
v=${fmtVec2(v[0], v[1])}.
$$

That is, compute

$$
\lVert v\rVert=\sqrt{v_x^2+v_y^2}.
$$

Round to ${decimals} decimal place(s).
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Vector magnitude",
      prompt,
      hint: String.raw`
$$
\lVert v\rVert=\sqrt{v_x^2+v_y^2}
$$
`.trim(),
    };

    return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
  }

  // ------------------------------------------------------------
  // 8) Unit vector numeric (one component)
  // ------------------------------------------------------------
  if (archetype === "unit_vector_numeric") {
    const v = [randNonZeroInt(rng, -range, range), randNonZeroInt(rng, -range, range)];
    const mag = norm(v);
    const u = [v[0] / mag, v[1] / mag];

    const askX = coinFlip(rng);
    const decimals = 2;
    const value = roundTo(askX ? u[0] : u[1], decimals);
    const tol = 0.03;

    const prompt = String.raw`
Let

$$
v=${fmtVec2(v[0], v[1])}.
$$

Compute the associated unit vector

$$
\hat v=\frac{1}{\lVert v\rVert}v.
$$

What is ${askX ? "the x-component" : "the y-component"} of $$\hat v$$?
Round to ${decimals} decimal place(s).
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Unit vector component",
      prompt,
      hint: String.raw`
$$
\hat v=\frac{v}{\lVert v\rVert}
$$
`.trim(),
    };

    return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
  }

  // ------------------------------------------------------------
  // 9) Dot product numeric
  // ------------------------------------------------------------
  if (archetype === "dot_numeric") {
    const n = pickLen(rng, diff);
    const a = vecInts(rng, n, range, false);
    const b = vecInts(rng, n, range, false);
    const val = dot(a, b);

    const prompt = String.raw`
Let

$$
a=${fmtVecN(a)},
\qquad
b=${fmtVecN(b)}.
$$

Compute the dot product

$$
a\cdot b.
$$
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Dot product",
      prompt,
      hint: String.raw`
$$
a\cdot b=\sum_{i=1}^{n} a_i b_i
$$
`.trim(),
    };

    return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
  }

  // ------------------------------------------------------------
  // 10) Dot sign ↔ angle type
  // ------------------------------------------------------------
  if (archetype === "dot_sign_angle") {
    const a = [randNonZeroInt(rng, -range, range), randNonZeroInt(rng, -range, range)];
    const kind = rng.pick(["positive", "negative", "zero"] as const);

    let b: number[] = [0, 0];
    if (kind === "positive") {
      const k = rng.pick([1, 2, 3] as const);
      b = [k * a[0], k * a[1]];
    } else if (kind === "negative") {
      const k = rng.pick([-1, -2, -3] as const);
      b = [k * a[0], k * a[1]];
    } else {
      b = [-a[1], a[0]]; // perpendicular
    }

    const prompt = String.raw`
Let

$$
a=${fmtVec2(a[0], a[1])},
\qquad
b=${fmtVec2(b[0], b[1])}.
$$

Classify the angle $$\theta$$ between $$a$$ and $$b$$ as **acute**, **right**, or **obtuse**.
`.trim();

    const correct = kind === "zero" ? "right" : kind === "positive" ? "acute" : "obtuse";

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Dot sign ↔ angle",
      prompt,
      options: [
        { id: "acute", text: "Acute" },
        { id: "right", text: "Right" },
        { id: "obtuse", text: "Obtuse" },
      ],
      hint: "If a·b > 0 → acute; a·b = 0 → right; a·b < 0 → obtuse.",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: correct } };
  }

  // ------------------------------------------------------------
  // 11) Hadamard multiplication bug (dimension mismatch)
  // ------------------------------------------------------------
  if (archetype === "hadamard_bug") {
    const prompt = String.raw`
Hadamard (element-wise) multiplication requires equal-length vectors.

~~~python
a = np.array([5,4,8,2])
b = np.array([1,0,0.5])
a*b
~~~

Why does this error?
`.trim();

    const exercise: SingleChoiceExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Hadamard multiplication",
      prompt,
      options: [
        { id: "A", text: "Because Hadamard multiplication is not defined in NumPy." },
        { id: "B", text: "Because the vectors have different numbers of elements." },
        { id: "C", text: "Because arrays must be column vectors for multiplication." },
        { id: "D", text: "Because a*b computes a dot product, not Hadamard." },
      ],
      hint: "Element-wise operations pair up entries. If lengths differ, entries can’t pair up.",
    };

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "B" } };
  }

  // ------------------------------------------------------------
  // 12) Outer product: compute one entry
  // ------------------------------------------------------------
  if (archetype === "outer_product_entry") {
    const m = diff === "hard" ? 3 : 2;
    const n = diff === "hard" ? 4 : 3;

    const v = vecInts(rng, m, range, false); // column
    const w = vecInts(rng, n, range, false); // row
    const i = rng.int(1, m); // 1-indexed for prompt
    const j = rng.int(1, n);
    const val = v[i - 1] * w[j - 1];

    const prompt = String.raw`
Let

$$
v=${fmtCol(v)},
\qquad
w^T=${fmtRow(w)}.
$$

Consider the outer product

$$
vw^T.
$$

Compute the entry $$(vw^T)_{${i}${j}}$$.
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Outer product entry",
      prompt,
      hint: String.raw`
$$
(vw^T)_{ij}=v_i w_j
$$
`.trim(),
    };

    return { archetype, exercise, expected: { kind: "numeric", value: val, tolerance: 0 } };
  }

  // ------------------------------------------------------------
  // 13) Orthogonal projection scalar β
  // β = (a·b)/(a·a)
  // ------------------------------------------------------------
  if (archetype === "orth_proj_beta") {
    const a = [randNonZeroInt(rng, -6, 6), randNonZeroInt(rng, -6, 6)];
    const betaExact = randNonZeroInt(rng, -3, 3);
    const p = [-a[1], a[0]]; // perpendicular
    const t = rng.int(-2, 2);

    const b = [betaExact * a[0] + t * p[0], betaExact * a[1] + t * p[1]];

    const decimals = 2;
    const value = roundTo(betaExact, decimals);
    const tol = 0.01;

    const prompt = String.raw`
Let

$$
a=${fmtVec2(a[0], a[1])},
\qquad
b=${fmtVec2(b[0], b[1])}.
$$

Compute the scalar $$\beta$$ such that the point $$\beta a$$ is the orthogonal projection of $$b$$ onto the line spanned by $$a$$:

$$
\beta=\frac{a\cdot b}{a\cdot a}.
$$

Round to ${decimals} decimal place(s).
`.trim();

    const exercise: NumericExercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Orthogonal projection (β)",
      prompt,
      hint: String.raw`
$$
\beta=\frac{a\cdot b}{a\cdot a}
$$
`.trim(),
    };

    return { archetype, exercise, expected: { kind: "numeric", value, tolerance: tol } };
  }

  // Should never hit (weighted list covers all), but keep TS happy
  const fallback: SingleChoiceExercise = {
    id,
    topic: TOPIC,
    difficulty: diff,
    kind: "single_choice",
    title: "Vectors (fallback)",
    prompt: "Fallback exercise.",
    options: [{ id: "ok", text: "OK" }],
  };
  return {
    archetype: "fallback",
    exercise: fallback,
    expected: { kind: "single_choice", optionId: "ok" },
  };
}
