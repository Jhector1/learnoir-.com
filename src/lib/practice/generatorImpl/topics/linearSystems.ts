// src/lib/practice/generator/topics/linearSystems.ts
import type { Difficulty, Exercise, Vec3 } from "../../types";
import type { GenOut } from "../expected";
import { RNG } from "../rng";
import { randNonZeroInt, uniq } from "../utils";

// ---------- LaTeX helpers ----------
function fmtSystemLatex(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number
) {
  // Writes:
  // a1 x + b1 y = c1
  // a2 x + b2 y = c2
  // with clean sign formatting for b terms.
  const line = (a: number, b: number, c: number) => {
    const sign = b < 0 ? "-" : "+";
    const bb = Math.abs(b);
    return String.raw`${a}x ${sign} ${bb}y = ${c}`;
  };

  return String.raw`
$$
\begin{aligned}
${line(a1, b1, c1)}\\
${line(a2, b2, c2)}
\end{aligned}
$$
`.trim();
}

export function genLinearSystems(
  rng: RNG,
  diff: Difficulty,
  id: string
): GenOut<Exercise> {
  const archetype = rng.weighted([
    { value: "drag_solve" as const, w: 5 },
    { value: "which_point" as const, w: 3 },
    { value: "check_candidate" as const, w: 2 },
    { value: "word_problem" as const, w: diff === "hard" ? 3 : 2 },
  ]);

  // Loop until a decent det (avoids recursion bug)
  let x = 0,
    y = 0,
    a1 = 0,
    b1 = 0,
    a2 = 0,
    b2 = 0,
    det = 0;

  for (let tries = 0; tries < 200; tries++) {
    x = rng.int(-4, 4);
    y = rng.int(-4, 4);

    a1 = randNonZeroInt(rng, -6, 6);
    b1 = randNonZeroInt(rng, -6, 6);
    a2 = randNonZeroInt(rng, -6, 6);
    b2 = randNonZeroInt(rng, -6, 6);

    det = a1 * b2 - a2 * b1;
    if (Math.abs(det) >= 2) break;
  }

  if (Math.abs(det) < 2) {
    // fallback deterministic safe
    a1 = 1;
    b1 = 0;
    a2 = 0;
    b2 = 1;
    det = 1;
    x = rng.int(-4, 4);
    y = rng.int(-4, 4);
  }

  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;

  const sysLatex = fmtSystemLatex(a1, b1, c1, a2, b2, c2);

  // -------------------- drag_solve (vector_drag_target) --------------------
  if (archetype === "drag_solve") {
    const tol = diff === "easy" ? 0.5 : diff === "medium" ? 0.35 : 0.25;

    const prompt = String.raw`
Find \((x, y)\) that satisfies the system:

${sysLatex}

Drag point \(a\) to the solution.
`.trim();

    const exercise: Exercise = {
      id,
      topic: "linear_systems",
      difficulty: diff,
      kind: "vector_drag_target",
      title: "Solve the system (drag)",
      prompt,
      initialA: { x: 0, y: 0, z: 0 },
      initialB: { x: 0, y: 0, z: 0 },
      targetA: { x, y, z: 0 },
      lockB: true,
      tolerance: tol,
    } as any;

    return {
      archetype,
      exercise,
      expected: {
        kind: "vector_drag_target",
        targetA: { x, y, z: 0 },
        tolerance: tol,
        lockB: true,
      },
    };
  }

  // Build decoys
  const decoys: Vec3[] = uniq([
    `${x + 1},${y}`,
    `${x - 1},${y}`,
    `${x},${y + 1}`,
    `${x},${y - 1}`,
    `${x + 2},${y - 1}`,
    `${x - 2},${y + 1}`,
  ])
    .map((s) => {
      const [xx, yy] = s.split(",").map(Number);
      return { x: xx, y: yy, z: 0 };
    })
    .filter((p) => !(p.x === x && p.y === y))
    .slice(0, 3);

  // -------------------- which_point (single_choice) --------------------
  if (archetype === "which_point") {
    const choices = rng.shuffle([
      { id: "A", p: { x, y, z: 0 } },
      { id: "B", p: decoys[0] },
      { id: "C", p: decoys[1] },
      { id: "D", p: decoys[2] },
    ]);

    const prompt = String.raw`
Which point satisfies **both** equations?

${sysLatex}
`.trim();

    const exercise: Exercise = {
      id,
      topic: "linear_systems",
      difficulty: diff,
      kind: "single_choice",
      title: "Which point solves the system?",
      prompt,
      options: choices.map((c) => ({
        id: c.id,
        // ✅ make the point render in KaTeX (same approach as matrixOps options)
text: String.raw`$(${c.p.x}, ${c.p.y})$`,
      })),
    } as any;

    const correctId = choices.find((c) => c.p.x === x && c.p.y === y)!.id;

    return {
      archetype,
      exercise,
      expected: { kind: "single_choice", optionId: correctId },
    };
  }

  // -------------------- check_candidate (single_choice) --------------------
  if (archetype === "check_candidate") {
    const isTrue = rng.float() < 0.5;
    const cand = isTrue ? { x, y } : (rng.pick(decoys) as any);

    const prompt = String.raw`
Does \((x, y) = (${cand.x},\,${cand.y})\) satisfy the system?

${sysLatex}
`.trim();

    const exercise: Exercise = {
      id,
      topic: "linear_systems",
      difficulty: diff,
      kind: "single_choice",
      title: "Check a candidate solution",
      prompt,
      options: [
        { id: "true", text: "Yes" },
        { id: "false", text: "No" },
      ],
    } as any;

    return {
      archetype,
      exercise,
      expected: { kind: "single_choice", optionId: isTrue ? "true" : "false" },
    };
  }

  // -------------------- word_problem (numeric) --------------------
  const adult = Math.max(1, Math.abs(a1));
  const child = Math.max(1, Math.abs(b1));
  const Aqty = Math.max(1, Math.abs(x) + 1);
  const Cqty = Math.max(1, Math.abs(y) + 1);
  const total = adult * Aqty + child * Cqty;

  const exercise: Exercise = {
    id,
    topic: "linear_systems",
    difficulty: diff,
    kind: "numeric",
    title: "Word problem (system)",
    prompt:
      `At an event, adult tickets cost \\$${adult} and child tickets cost \\$${child}.\n` +
      `A group buys ${Aqty + Cqty} tickets total for \\$${total}.\n` +
      `How many adult tickets did they buy?`,
    hint: "Let a = adults, c = children. Use a + c = total tickets and adult*a + child*c = total cost.",
    correctValue: Aqty,
    tolerance: 0,
  } as any;

  return {
    archetype,
    exercise,
    expected: { kind: "numeric", value: Aqty, tolerance: 0 },
  };
}
