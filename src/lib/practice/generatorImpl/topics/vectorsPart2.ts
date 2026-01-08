// src/lib/practice/generator/topics/vectorsPart2.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import type { RNG } from "../rng";

// ---------------- LaTeX helpers ----------------
function fmtVec2(x: number, y: number) {
  return String.raw`\begin{bmatrix}${x}\\ ${y}\end{bmatrix}`;
}

function fmtSetVec2(vs: Array<{ x: number; y: number }>) {
  // \left\{ v1, v2, ... \right\}
  return String.raw`\left\{${vs.map((v) => fmtVec2(v.x, v.y)).join(", ")}\right\}`;
}

function fmtSpan2(vs: Array<{ x: number; y: number }>) {
  // span{ v1, v2 }
  return String.raw`\operatorname{span}\!\left\{${vs
    .map((v) => fmtVec2(v.x, v.y))
    .join(", ")}\right\}`;
}

// ---------------- math helpers ----------------
function det2(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x;
}

function randNonZeroInt(rng: RNG, lo: number, hi: number) {
  let v = 0;
  while (v === 0) v = rng.int(lo, hi);
  return v;
}

function coinFlip(rng: RNG) {
  return rng.int(0, 1) === 1;
}

function pickNonCollinearPair(rng: RNG, range: number) {
  // ensure det != 0
  while (true) {
    const a = {
      x: randNonZeroInt(rng, -range, range),
      y: rng.int(-range, range),
    };
    const b = {
      x: rng.int(-range, range),
      y: randNonZeroInt(rng, -range, range),
    };
    if (det2(a, b) !== 0) return { a, b };
  }
}

export function genVectorsPart2(
  rng: RNG,
  diff: Difficulty,
  id: string
): GenOut<Exercise> {
  const range = diff === "easy" ? 4 : diff === "medium" ? 7 : 10;

  const archetype = rng.weighted([
    { value: "set_finite_infinite_empty" as const, w: 4 },
    { value: "combo_component" as const, w: 4 },
    { value: "independent_or_dependent_easy" as const, w: diff === "easy" ? 5 : 3 },
    { value: "independence_zero_vector" as const, w: 3 },
    { value: "span_dimension" as const, w: diff === "easy" ? 2 : 4 },
    { value: "subspace_rules" as const, w: 3 },
    { value: "basis_check_det" as const, w: 4 },
    { value: "basis_coordinates_one" as const, w: diff === "easy" ? 1 : 4 },
  ]);

  // IMPORTANT:
  // Prisma expects topic to be a valid PracticeTopic enum value.
  // Using "vectors" here prevents: "Invalid value for argument `topic`"
  const TOPIC: any = "vectors";

  // ------------------------------------------------------------
  // 1) Vector set: finite/infinite/empty
  // ------------------------------------------------------------
  if (archetype === "set_finite_infinite_empty") {
    const kind = rng.pick(["finite", "infinite", "empty"] as const);

    let prompt = "";
    let answerId: "finite" | "infinite" | "empty" = "finite";

    if (kind === "finite") {
      const v1 = { x: rng.int(-range, range), y: rng.int(-range, range) };
      const v2 = { x: rng.int(-range, range), y: rng.int(-range, range) };

      prompt = String.raw`
Is the vector set below **finite**, **infinite**, or **empty**?

$$
V = ${fmtSetVec2([v1, v2])}
$$
`.trim();

      answerId = "finite";
    } else if (kind === "empty") {
      prompt = String.raw`
Is the vector set below **finite**, **infinite**, or **empty**?

$$
V=\varnothing
$$
`.trim();

      answerId = "empty";
    } else {
      const v = {
        x: randNonZeroInt(rng, -range, range),
        y: randNonZeroInt(rng, -range, range),
      };

      prompt = String.raw`
Is the vector set below **finite**, **infinite**, or **empty**?

$$
V=\left\{ \lambda\,${fmtVec2(v.x, v.y)} \;\middle|\; \lambda\in\mathbb{R}\right\}
$$
`.trim();

      answerId = "infinite";
    }

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Vector sets",
      prompt,
      options: [
        { id: "finite", text: "Finite" },
        { id: "infinite", text: "Infinite" },
        { id: "empty", text: "Empty" },
      ],
      hint: "If it contains “all real scalars λ”, that’s infinitely many vectors.",
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: answerId } };
  }

  // ------------------------------------------------------------
  // 2) Linear combination: compute one component (numeric)
  // ------------------------------------------------------------
  if (archetype === "combo_component") {
    const v1 = { x: rng.int(-range, range), y: rng.int(-range, range) };
    const v2 = { x: rng.int(-range, range), y: rng.int(-range, range) };
    const v3 = { x: rng.int(-range, range), y: rng.int(-range, range) };

    // avoid all zero coefficients without recursion
    let l1 = 0, l2 = 0, l3 = 0;
    while (l1 === 0 && l2 === 0 && l3 === 0) {
      l1 = rng.int(-3, 3);
      l2 = rng.int(-3, 3);
      l3 = rng.int(-3, 3);
    }

    const w = {
      x: l1 * v1.x + l2 * v2.x + l3 * v3.x,
      y: l1 * v1.y + l2 * v2.y + l3 * v3.y,
    };

    const askX = coinFlip(rng);
const asked = askX ? String.raw`$w_x$` : String.raw`$w_y$`;
    const correctValue = askX ? w.x : w.y;

    const prompt = String.raw`
Let
$$
\vec w = ${l1}\vec v_1 + ${l2}\vec v_2 + ${l3}\vec v_3
$$
with
$$
\vec v_1=${fmtVec2(v1.x, v1.y)},\quad
\vec v_2=${fmtVec2(v2.x, v2.y)},\quad
\vec v_3=${fmtVec2(v3.x, v3.y)}.
$$

Compute ${asked}`.trim();

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Linear weighted combination",
      prompt,
      hint: "Compute component-wise: add the x’s together, add the y’s together.",
      correctValue,
      tolerance: 0,
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "numeric", value: correctValue, tolerance: 0 },
    };
  }

  // ------------------------------------------------------------
  // 3) Independence: easy (2 vectors in R2: collinear or not)
  // ------------------------------------------------------------
  if (archetype === "independent_or_dependent_easy") {
    const isDependent = coinFlip(rng);

    const v1 = {
      x: randNonZeroInt(rng, -range, range),
      y: rng.int(-range, range),
    };

    let v2: { x: number; y: number };

    if (isDependent) {
      const k = randNonZeroInt(rng, -3, 3);
      v2 = { x: k * v1.x, y: k * v1.y };
    } else {
      while (true) {
        const cand = { x: rng.int(-range, range), y: rng.int(-range, range) };
        if (cand.x === 0 && cand.y === 0) continue;
        if (det2(v1, cand) !== 0) {
          v2 = cand;
          break;
        }
      }
    }

    const prompt = String.raw`
Consider the set
$$
S=${fmtSetVec2([v1, v2!])}.
$$

Is $S$ **linearly independent** or **linearly dependent**?
`.trim();

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Independent or dependent?",
      prompt,
      options: [
        { id: "ind", text: "Independent" },
        { id: "dep", text: "Dependent" },
      ],
      hint: "In ℝ²: two vectors are dependent iff one is a scalar multiple of the other.",
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "single_choice", optionId: isDependent ? "dep" : "ind" },
    };
  }

  // ------------------------------------------------------------
  // 4) Independence: zero vector rule (always dependent)
  // ------------------------------------------------------------
  if (archetype === "independence_zero_vector") {
    const v = { x: rng.int(-range, range), y: rng.int(-range, range) };

    const prompt = String.raw`
True or false:

Any set that contains the zero vector $\vec 0$ is **linearly dependent**.

Example:
$$
S=\left\{\vec 0,\;${fmtVec2(v.x, v.y)}\right\}.
$$
`.trim();

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Zero vector and independence",
      prompt,
      options: [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ],
      hint: "If 0 is in the set, you can make 0 using a non-trivial combination.",
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "true" } };
  }

  // ------------------------------------------------------------
  // 5) Span dimension in R2 (1D line vs all of ℝ²)
  // ------------------------------------------------------------
  if (archetype === "span_dimension") {
    const kind = rng.pick(["oneVector", "twoCollinear", "twoIndependent"] as const);

    let vs: Array<{ x: number; y: number }> = [];
    let dim = 1;

    if (kind === "oneVector") {
      const v = { x: randNonZeroInt(rng, -range, range), y: rng.int(-range, range) };
      vs = [v];
      dim = 1;
    } else if (kind === "twoCollinear") {
      const v1 = { x: randNonZeroInt(rng, -range, range), y: rng.int(-range, range) };
      const k = randNonZeroInt(rng, -4, 4);
      const v2 = { x: k * v1.x, y: k * v1.y };
      vs = [v1, v2];
      dim = 1;
    } else {
      const pair = pickNonCollinearPair(rng, range);
      vs = [pair.a, pair.b];
      dim = 2;
    }

    const prompt = String.raw`
Let
$$
W = ${fmtSpan2(vs)}.
$$

What is the **dimension** of $W$ as a subspace of $\mathbb{R}^2$?
`.trim();

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Span → subspace dimension",
      prompt,
      options: [
        { id: "1", text: "1 (a line through the origin)" },
        { id: "2", text: "2 (all of ℝ²)" },
      ],
      hint: "Dependent vectors span the same subspace as one of them.",
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: String(dim) } };
  }

  // ------------------------------------------------------------
  // 6) Subspace rules
  // ------------------------------------------------------------
  if (archetype === "subspace_rules") {
    const cand = rng.pick(["lineThroughOrigin", "shiftedLine", "unitCircle"] as const);

    let prompt = "";
    let ok = false;

    if (cand === "lineThroughOrigin") {
      prompt = String.raw`
Let
$$
S=\left\{(x,y)\in\mathbb{R}^2 \mid y=2x\right\}.
$$
Is $S$ a **subspace** of $\mathbb{R}^2$?
`.trim();
      ok = true;
    } else if (cand === "shiftedLine") {
      prompt = String.raw`
Let
$$
S=\left\{(x,y)\in\mathbb{R}^2 \mid y=2x+1\right\}.
$$
Is $S$ a **subspace** of $\mathbb{R}^2$?
`.trim();
      ok = false;
    } else {
      prompt = String.raw`
Let
$$
S=\left\{(x,y)\in\mathbb{R}^2 \mid x^2+y^2=1\right\}.
$$
Is $S$ a **subspace** of $\mathbb{R}^2$?
`.trim();
      ok = false;
    }

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Is it a subspace?",
      prompt,
      options: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
      hint: "Subspace must contain (0,0) and be closed under + and scalar multiplication.",
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: ok ? "yes" : "no" } };
  }

  // ------------------------------------------------------------
  // 7) Basis check via determinant
  // ------------------------------------------------------------
  if (archetype === "basis_check_det") {
    const dependent = coinFlip(rng);

    const b1 = { x: randNonZeroInt(rng, -range, range), y: rng.int(-range, range) };
    const b2 = dependent
      ? (() => {
          const k = randNonZeroInt(rng, -4, 4);
          return { x: k * b1.x, y: k * b1.y };
        })()
      : (() => {
          while (true) {
            const c = { x: rng.int(-range, range), y: rng.int(-range, range) };
            if (c.x === 0 && c.y === 0) continue;
            if (det2(b1, c) !== 0) return c;
          }
        })();

    const prompt = String.raw`
Consider the set
$$
B=${fmtSetVec2([b1, b2])}.
$$

Is $B$ a **basis for $\mathbb{R}^2$**?
`.trim();

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "single_choice",
      title: "Is it a basis?",
      prompt,
      options: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
      hint: "In ℝ², two vectors form a basis iff det ≠ 0 (i.e., not collinear).",
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "single_choice", optionId: dependent ? "no" : "yes" },
    };
  }

  // ------------------------------------------------------------
  // 8) Basis coordinates: ask for one coordinate
  // ------------------------------------------------------------
  {
    const { a: b1, b: b2 } = pickNonCollinearPair(rng, Math.max(3, Math.floor(range / 2)));

    const c1 = randNonZeroInt(rng, -3, 3);
    const c2 = randNonZeroInt(rng, -3, 3);

    const p = { x: c1 * b1.x + c2 * b2.x, y: c1 * b1.y + c2 * b2.y };
    const ask = rng.pick(["c1", "c2"] as const);
    const correctValue = ask === "c1" ? c1 : c2;

    const prompt = String.raw`
Let the basis vectors be
$$
\vec b_1=${fmtVec2(b1.x, b1.y)},\qquad
\vec b_2=${fmtVec2(b2.x, b2.y)}.
$$

A point is given by
$$
\vec p=${fmtVec2(p.x, p.y)}.
$$

Find ${ask === "c1" ? "$c_1$" : "$c_2$"} such that
$$
\vec p=c_1\vec b_1+c_2\vec b_2.
$$
`.trim();

    const exercise: Exercise = {
      id,
      topic: TOPIC,
      difficulty: diff,
      kind: "numeric",
      title: "Coordinates in a basis",
      prompt,
      hint: "This one is designed to come out clean (integer coordinates).",
      correctValue,
      tolerance: 0,
    } as any;

    return {
      archetype: "basis_coordinates_one",
      exercise,
      expected: { kind: "numeric", value: correctValue, tolerance: 0 },
    };
  }
}
