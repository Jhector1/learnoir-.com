// src/lib/practice/generator/topics/solutionTypes.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

// ---------- LaTeX helpers ----------

// "a x + b y = c" with clean sign formatting for b-term
function lineEqLatex(a: number, b: number, c: number) {
  const sign = b < 0 ? "-" : "+";
  const bb = Math.abs(b);
  return String.raw`${a}x ${sign} ${bb}y = ${c}`;
}

function systemLatex(a: number, b: number, c: number, d: number, e: number, f: number) {
  return String.raw`
$$
\begin{aligned}
${lineEqLatex(a, b, c)}\\
${lineEqLatex(d, e, f)}
\end{aligned}
$$
`.trim();
}

type Rref2x2 = [[number, number, number], [number, number, number]];

function fmtAug2x2Latex(M: Rref2x2) {
  // [[a b | c], [d e | f]] as augmented matrix
  return String.raw`
$$
\left[\begin{array}{cc|c}
${M[0][0]} & ${M[0][1]} & ${M[0][2]}\\
${M[1][0]} & ${M[1][1]} & ${M[1][2]}
\end{array}\right]
$$
`.trim();
}

export function genSolutionTypes(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "from_rref" as const, w: 5 },
    { value: "from_equations" as const, w: 5 },
  ]);

  // -------------------- from_rref (single_choice) --------------------
  if (archetype === "from_rref") {
    const cases: Array<{ M: Rref2x2; ans: "unique" | "infinite" | "none" }> = [
      { M: [[1, 0, 2], [0, 1, -1]], ans: "unique" },
      { M: [[1, 2, 3], [0, 0, 0]], ans: "infinite" },
      { M: [[1, 2, 3], [0, 0, 5]], ans: "none" },
    ];

    const picked = rng.pick(cases);

    const prompt = String.raw`
Given the RREF augmented matrix:

${fmtAug2x2Latex(picked.M)}

How many solutions does the system have?
`.trim();

    const exercise: Exercise = {
      id,
      topic: "solution_types",
      difficulty: diff,
      kind: "single_choice",
      title: "Classify by RREF",
      prompt,
      options: [
        { id: "unique", text: "Unique solution" },
        { id: "infinite", text: "Infinitely many solutions" },
        { id: "none", text: "No solution" },
      ],
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "single_choice", optionId: picked.ans },
    };
  }

  // -------------------- from_equations (single_choice) --------------------
  // parallel / same line / intersect
  const kind = rng.pick(["unique", "infinite", "none"] as const);

  const a = randNonZeroInt(rng, -5, 5);
  const b = randNonZeroInt(rng, -5, 5);
  const c = rng.int(-8, 8);

  const k = rng.pick([2, -2, 3, -3] as const);

  const d = k * a;
  const e = k * b;

  let f = k * c;

  if (kind === "none") {
    const delta = rng.pick([1, 2, -1, -2] as const);
    f = k * c + delta; // parallel distinct
  }

  if (kind === "unique") {
    // Break proportionality: tweak one coefficient so det != 0
    const tweak = rng.pick([1, -1, 2, -2] as const);
    const e2 = e + tweak;

    const prompt = String.raw`
Classify the system:

${systemLatex(a, b, c, d, e2, f)}
`.trim();

    const exercise: Exercise = {
      id,
      topic: "solution_types",
      difficulty: diff,
      kind: "single_choice",
      title: "Solution type from equations",
      prompt,
      options: [
        { id: "unique", text: "Unique solution" },
        { id: "infinite", text: "Infinitely many solutions" },
        { id: "none", text: "No solution" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: "unique" } };
  }

  // infinite or none using proportional coefficients
  const prompt = String.raw`
Classify the system:

${systemLatex(a, b, c, d, e, f)}
`.trim();

  const exercise: Exercise = {
    id,
    topic: "solution_types",
    difficulty: diff,
    kind: "single_choice",
    title: "Solution type from equations",
    prompt,
    options: [
      { id: "unique", text: "Unique solution" },
      { id: "infinite", text: "Infinitely many solutions" },
      { id: "none", text: "No solution" },
    ],
  } as any;

  return { archetype, exercise, expected: { kind: "single_choice", optionId: kind } };
}
