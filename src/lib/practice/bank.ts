// // src/lib/practice/bank.ts
// import {
//   PracticeDifficulty,
//   PracticeKind,
//   PracticeTopic,
// } from "@/generated/prisma";

// export type GeneratedExercise = {
//   topic: PracticeTopic;
//   kind: PracticeKind;
//   difficulty: PracticeDifficulty;
//   title: string;
//   prompt: string;
//   publicPayload: any;
//   secretPayload: any;
// };

// function randInt(min: number, max: number) {
//   return Math.floor(Math.random() * (max - min + 1)) + min;
// }
// function choice<T>(arr: T[]): T {
//   return arr[Math.floor(Math.random() * arr.length)];
// }
// function shuffle<T>(arr: T[]) {
//   const a = arr.slice();
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a;
// }
// function rangeFor(d: PracticeDifficulty) {
//   if (d === "easy") return 4;
//   if (d === "medium") return 7;
//   return 12;
// }
// function tolForDrag(d: PracticeDifficulty) {
//   if (d === "easy") return 0.25;
//   if (d === "medium") return 0.15;
//   return 0.08;
// }

// function build4Options(
//   correctText: string,
//   wrongTexts: string[]
// ): { options: { id: string; text: string }[]; correctOptionId: string } {
//   const pool = [correctText, ...wrongTexts];
//   const uniq: string[] = [];
//   const seen = new Set<string>();

//   for (const t of pool) {
//     const s = String(t);
//     if (seen.has(s)) continue;
//     seen.add(s);
//     uniq.push(s);
//     if (uniq.length >= 4) break;
//   }
//   while (uniq.length < 4) {
//     const filler = `(${uniq.length + 1}) ${correctText}`;
//     if (!seen.has(filler)) {
//       seen.add(filler);
//       uniq.push(filler);
//     }
//   }

//   const letters = ["a", "b", "c", "d"];
//   const mixed = shuffle(uniq).slice(0, 4);
//   const options = mixed.map((text, i) => ({ id: letters[i], text }));
//   const correctOptionId =
//     options.find((o) => o.text === correctText)?.id ?? "a";

//   return { options, correctOptionId };
// }

// /* ----------------- TOPIC: DOT (numeric only, but diverse) ----------------- */

// function genDotNumericWordy(difficulty: PracticeDifficulty): GeneratedExercise {
//   const r = rangeFor(difficulty);

//   const ax = randInt(-r, r);
//   const ay = randInt(-r, r);
//   const bx = randInt(-r, r);
//   const by = randInt(-r, r);

//   const expected = ax * bx + ay * by;

//   const templates = [
//     `Compute a · b for a=(${ax}, ${ay}) and b=(${bx}, ${by}).`,
//     `A=(${ax}, ${ay}), B=(${bx}, ${by}). Find A·B (watch the signs).`,
//     `Two vectors a and b are given. a=(${ax}, ${ay}), b=(${bx}, ${by}). What is a·b?`,
//     `Mind game: many people do ax·by by mistake. Correctly compute a·b for a=(${ax}, ${ay}), b=(${bx}, ${by}).`,
//     `Work model: Force F=(${ax}, ${ay}) and displacement d=(${bx}, ${by}). Compute W=F·d.`,
//   ];

//   return {
//     topic: "dot",
//     difficulty,
//     kind: "numeric",
//     title: `Dot product (${difficulty})`,
//     prompt: choice(templates),
//     publicPayload: {
//       kind: "numeric",
//       hint: difficulty === "easy" ? "a·b = ax·bx + ay·by" : undefined,
//     },
//     secretPayload: { expected, tolerance: 0 },
//   };
// }

// /* ----------------- TOPIC: PROJECTION (single_choice only, but tricky) ----------------- */

// function genProjectionSingleChoice(difficulty: PracticeDifficulty): GeneratedExercise {
//   // Hard = more “near-true” distractors
//   const items = [
//     {
//       prompt: "Which statement is always true?",
//       correct: "proj_b(a) is parallel to b",
//       wrong: [
//         "proj_b(a) is always perpendicular to b",
//         "proj_b(a) always has length |a|",
//         "proj_b(a) is undefined if b ≠ 0",
//         "proj_b(a) is always parallel to a",
//       ],
//     },
//     {
//       prompt: "Pick the statement that must be true (for b ≠ 0).",
//       correct: "a − proj_b(a) is perpendicular to b",
//       wrong: [
//         "a − proj_b(a) is parallel to b",
//         "proj_b(a) is perpendicular to b",
//         "proj_b(a) always equals a",
//         "proj_b(a) always equals b",
//       ],
//     },
//     {
//       prompt: "Which is the correct scalar projection formula?",
//       correct: "comp_b(a) = (a·b)/|b|",
//       wrong: [
//         "comp_b(a) = (a·b)/|a|",
//         "comp_b(a) = |a||b|",
//         "comp_b(a) = (a·b)/(|a||b|)",
//         "comp_b(a) = |b|/(a·b)",
//       ],
//     },
//     {
//       prompt: "Which is the correct vector projection formula?",
//       correct: "proj_b(a) = ((a·b)/(b·b)) b",
//       wrong: [
//         "proj_b(a) = ((a·b)/(a·a)) a",
//         "proj_b(a) = ((b·b)/(a·b)) b",
//         "proj_b(a) = (a·b) b",
//         "proj_b(a) = ((a·b)/|b|) b",
//       ],
//     },
//   ];

//   const picked = choice(items);

//   // make hard questions more “trap-like”
//   const wrong = difficulty === "hard"
//     ? picked.wrong
//     : picked.wrong.slice(0, 3);

//   const { options, correctOptionId } = build4Options(picked.correct, wrong);

//   return {
//     topic: "projection",
//     difficulty,
//     kind: "single_choice",
//     title: `Projection concept (${difficulty})`,
//     prompt: picked.prompt,
//     publicPayload: { kind: "single_choice", options },
//     secretPayload: { correctOptionId },
//   };
// }

// /* ----------------- TOPIC: ANGLE (numeric only, more variety) ----------------- */

// function genAngleNumeric(difficulty: PracticeDifficulty): GeneratedExercise {
//   if (difficulty === "easy") {
//     return {
//       topic: "angle",
//       difficulty,
//       kind: "numeric",
//       title: `Angle basics (${difficulty})`,
//       prompt: choice([
//         "What is the angle (in degrees) between perpendicular vectors?",
//         "Two vectors are perpendicular. What is the angle between them?",
//       ]),
//       publicPayload: {
//         kind: "numeric",
//         hint: "Perpendicular = right angle.",
//       },
//       secretPayload: { expected: 90, tolerance: 0 },
//     };
//   }

//   if (difficulty === "medium") {
//     const pick = choice([
//       { prompt: "What is cos(60°)?", expected: 0.5 },
//       { prompt: "What is cos(45°)? (decimal ok)", expected: Math.SQRT1_2 },
//       { prompt: "What is cos(30°)? (decimal ok)", expected: Math.sqrt(3) / 2 },
//     ]);

//     return {
//       topic: "angle",
//       difficulty,
//       kind: "numeric",
//       title: `Cosine values (${difficulty})`,
//       prompt: pick.prompt,
//       publicPayload: {
//         kind: "numeric",
//         hint: "Special angles: 30°, 45°, 60°.",
//       },
//       secretPayload: { expected: pick.expected, tolerance: 0.02 },
//     };
//   }

//   // hard: “mind game” numeric with signs
//   // Ask for sign of cos(theta) given dot product sign idea
//   const cases = [
//     { prompt: "If a·b < 0, is the angle between a and b acute (<90) or obtuse (>90)? Use 1 for acute, 2 for obtuse.", expected: 2 },
//     { prompt: "If a·b = 0, what is the angle between a and b (degrees)?", expected: 90 },
//   ];
//   const c = choice(cases);

//   return {
//     topic: "angle",
//     difficulty,
//     kind: "numeric",
//     title: `Angle logic (${difficulty})`,
//     prompt: c.prompt,
//     publicPayload: { kind: "numeric", hint: "Dot sign tells acute/obtuse." },
//     secretPayload: { expected: c.expected, tolerance: 0 },
//   };
// }

// /* ----------------- TOPIC: VECTORS (vector_drag_target only) ----------------- */

// function genVectorsDragTarget(difficulty: PracticeDifficulty): GeneratedExercise {
//   const r = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 7;
//   const targetA = { x: randInt(-r, r), y: randInt(-r, r), z: 0 };

//   return {
//     topic: "vectors",
//     difficulty,
//     kind: "vector_drag_target",
//     title: `Drag vector (${difficulty})`,
//     prompt: choice([
//       "Drag vector a to match the target coordinates.",
//       "Precision challenge: place vector a exactly on the target (watch tolerance).",
//       "Mind game: small mistakes fail on hard — match the target coordinates.",
//     ]),
//     publicPayload: {
//       kind: "vector_drag_target",
//       initialA: { x: 0, y: 0, z: 0 },
//       initialB: { x: 2, y: 1, z: 0 },
//       lockB: true,
//       targetA,
//       tolerance: tolForDrag(difficulty),
//     },
//     secretPayload: { targetA },
//   };
// }

// /* ----------------- DISPATCH (legacy-safe topic->kind) ----------------- */

// export function generateExercise(args: {
//   topic: PracticeTopic;
//   difficulty: PracticeDifficulty;
// }): GeneratedExercise {
//   const { topic, difficulty } = args;

//   if (topic === "dot") return genDotNumericWordy(difficulty);

//   if (topic === "projection") return genProjectionSingleChoice(difficulty);

//   if (topic === "angle") return genAngleNumeric(difficulty);

//   if (topic === "vectors") return genVectorsDragTarget(difficulty);

//   // fallback
//   return genDotNumericWordy(difficulty);
// }
