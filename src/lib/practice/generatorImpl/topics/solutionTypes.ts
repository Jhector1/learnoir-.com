// src/lib/practice/generator/topics/solutionTypes.ts
import type { Difficulty, Exercise } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { randNonZeroInt } from "../utils";

export function genSolutionTypes(rng: RNG, diff: Difficulty, id: string): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "from_rref" as const, w: 5 },
    { value: "from_equations" as const, w: 5 },
  ]);

  if (archetype === "from_rref") {
    const cases = [
      { matrix: `[[1, 0 | 2], [0, 1 | -1]]`, ans: "unique" as const },
      { matrix: `[[1, 2 | 3], [0, 0 | 0]]`, ans: "infinite" as const },
      { matrix: `[[1, 2 | 3], [0, 0 | 5]]`, ans: "none" as const },
    ];
    const picked = rng.pick(cases);

    const exercise: Exercise = {
      id,
      topic: "solution_types",
      difficulty: diff,
      kind: "single_choice",
      title: "Classify by RREF",
      prompt: `Given the RREF augmented matrix:\n${picked.matrix}\nHow many solutions does the system have?`,
      options: [
        { id: "unique", text: "Unique solution" },
        { id: "infinite", text: "Infinitely many solutions" },
        { id: "none", text: "No solution" },
      ],
    } as any;

    return { archetype, exercise, expected: { kind: "single_choice", optionId: picked.ans } };
  }

  // from_equations (parallel / same line / intersect)
  // Build by controlling proportionality:
  const kind = rng.pick(["unique", "infinite", "none"] as const);

  const a = randNonZeroInt(rng, -5, 5);
  const b = randNonZeroInt(rng, -5, 5);
  const c = rng.int(-8, 8);

  // second equation is k*(a,b) and either k*c (infinite) or k*c + delta (none)
  const k = rng.pick([2, -2, 3, -3] as const);

  const d = k * a;
  const e = k * b;

  let f = k * c;
  if (kind === "none") {
    const delta = rng.pick([1, 2, -1, -2] as const);
    f = k * c + delta; // parallel distinct lines -> no solution
  }
  if (kind === "unique") {
    // make it NOT proportional => unique
    // tweak e slightly so det != 0
    const tweak = rng.pick([1, -1, 2, -2] as const);
    // ensure not breaking too hard:
    const e2 = e + tweak;
    const exercise: Exercise = {
      id,
      topic: "solution_types",
      difficulty: diff,
      kind: "single_choice",
      title: "Solution type from equations",
      prompt: `Classify the system:\n${a}x + ${b}y = ${c}\n${d}x + ${e2}y = ${f}`,
      options: [
        { id: "unique", text: "Unique solution" },
        { id: "infinite", text: "Infinitely many solutions" },
        { id: "none", text: "No solution" },
      ],
    } as any;
    return { archetype, exercise, expected: { kind: "single_choice", optionId: "unique" } };
  }

  // infinite or none using proportional coefficients
  const exercise: Exercise = {
    id,
    topic: "solution_types",
    difficulty: diff,
    kind: "single_choice",
    title: "Solution type from equations",
    prompt: `Classify the system:\n${a}x + ${b}y = ${c}\n${d}x + ${e}y = ${f}`,
    options: [
      { id: "unique", text: "Unique solution" },
      { id: "infinite", text: "Infinitely many solutions" },
      { id: "none", text: "No solution" },
    ],
  } as any;

  return { archetype, exercise, expected: { kind: "single_choice", optionId: kind } };
}
