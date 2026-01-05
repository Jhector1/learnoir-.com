// src/lib/practice/generator/topics/rref.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";

// ---------- LaTeX helpers ----------

function fmtAugLatex(M: number[][], b: number[]) {
  const m = M.length;
  const n = M[0]?.length ?? 0;

  // e.g. n=3 -> "ccc|c"
  const colSpec = `${"c".repeat(n)}|c`;

  const rows = Array.from({ length: m }, (_, i) => {
    const left = M[i].map((v) => `${v}`).join(" & ");
    return `${left} & ${b[i]}`;
  }).join(String.raw`\\ `);

  // Augmented matrix as an array with a vertical bar
  return String.raw`\left[\begin{array}{${colSpec}} ${rows} \end{array}\right]`;
}

function clone2D(A: number[][]) {
  return A.map((r) => r.slice());
}

export function genRref(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "is_rref" as const, w: 4 },
    { value: "valid_ops" as const, w: 3 },
  ]);

  // -------------------- valid_ops (multi_choice) --------------------
  if (archetype === "valid_ops") {
    const exercise: Exercise = {
      id,
      topic: "rref",
      difficulty: diff,
      kind: "multi_choice",
      title: "Elementary row operations",
      prompt: "Select ALL operations that are valid elementary row operations.",
      options: [
        { id: "swap", text: "Swap two rows" },
        { id: "scale", text: "Multiply a row by a nonzero constant" },
        { id: "add", text: "Replace a row by (row + k·another row)" },
        { id: "square", text: "Square every entry in a row" },
      ],
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "multi_choice", optionIds: ["swap", "scale", "add"] },
    };
  }

  // -------------------- is_rref (single_choice) --------------------
  const hard = diff === "hard";
  const rows = hard ? 3 : 2;
  const n = 3; // variables (keep consistent & readable)

  // Build a correct RREF augmented matrix
  let R: number[][] = [];
  let rhs: number[] = [];

  if (rows === 2) {
    const a = rng.int(-3, 3);
    const c = rng.int(-3, 3);
    const b1 = rng.int(-6, 6);
    const b2 = rng.int(-6, 6);

    R = [
      [1, 0, a],
      [0, 1, c],
    ];
    rhs = [b1, b2];
  } else {
    const b1 = rng.int(-6, 6);
    const b2 = rng.int(-6, 6);
    const b3 = rng.int(-6, 6);

    R = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    rhs = [b1, b2, b3];
  }

  const correctLatex = fmtAugLatex(R, rhs);

  // Distractor 1: pivot column not clean (nonzero in a pivot column elsewhere)
  const bad1R = clone2D(R);
  const bad1rhs = rhs.slice();
  if (rows === 2) {
    // make column 2 (pivot col) have a nonzero in row 1
    bad1R[0][1] = rng.pick([1, -1, 2]);
  } else {
    bad1R[0][1] = rng.pick([1, -1, 2]);
  }
  const notCleanPivot = fmtAugLatex(bad1R, bad1rhs);

  // Distractor 2: pivot not 1 (scaled pivot row)
  const bad2R = clone2D(R);
  const bad2rhs = rhs.slice();
  if (rows === 2) {
    // scale row 2 by 2 but only partially (still breaks RREF pivot=1 rule)
    bad2R[1][1] = 2;
    bad2R[1][2] *= 2;
    bad2rhs[1] *= 2;
  } else {
    bad2R[2][2] = 2;
    bad2rhs[2] *= 2;
  }
  const pivotNotOne = fmtAugLatex(bad2R, bad2rhs);

  // Distractor 3: wrong row order (pivots not moving right as you go down)
  const bad3R = clone2D(R);
  const bad3rhs = rhs.slice();
  if (rows === 2) {
    [bad3R[0], bad3R[1]] = [bad3R[1], bad3R[0]];
    [bad3rhs[0], bad3rhs[1]] = [bad3rhs[1], bad3rhs[0]];
  } else {
    [bad3R[0], bad3R[2]] = [bad3R[2], bad3R[0]];
    [bad3rhs[0], bad3rhs[2]] = [bad3rhs[2], bad3rhs[0]];
  }
  const wrongOrder = fmtAugLatex(bad3R, bad3rhs);

  const pool = [
    { id: "A", M: correctLatex, correct: true },
    { id: "B", M: notCleanPivot, correct: false },
    { id: "C", M: pivotNotOne, correct: false },
    { id: "D", M: wrongOrder, correct: false },
  ];

  const shuffled = rng.shuffle(pool);
  const correctId = shuffled.find((c) => c.correct)!.id;

  const prompt = String.raw`
Which augmented matrix is in RREF?

(Choose one.)
`.trim();

  const exercise: Exercise = {
    id,
    topic: "rref",
    difficulty: diff,
    kind: "single_choice",
    title: "Recognize RREF",
    prompt,
    options: shuffled.map((c) => ({
      id: c.id,
      // ✅ same style as matrixOps options: KaTeX inline wrapper
      text: String.raw`$${c.M}$`,
    })),
  } as any;

  return {
    archetype: "is_rref",
    exercise,
    expected: { kind: "single_choice", optionId: correctId },
  };
}
