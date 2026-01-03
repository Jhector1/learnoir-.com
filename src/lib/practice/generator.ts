import { getExerciseWithExpectedImpl } from "./generatorImpl";
import type { Difficulty, Exercise, Topic, Vec3 } from "./types";





/** ---------------- expected payload (server-side signing) ---------------- */

export type Expected =
  | { kind: "numeric"; value: number; tolerance: number }
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "vector_drag_target"; targetA: Vec3; tolerance: number; lockB: boolean }
  | { kind: "vector_drag_dot"; targetDot: number; tolerance: number };

/**
 * ✅ New function for API route:
 * returns { exercise, expected } so you can sign expected and keep frontend format unchanged.
 */
export async function getExerciseWithExpected(
  topic: Topic | "all",
  difficulty: Difficulty | "all"
): Promise<{ exercise: Exercise; expected: Expected }> {
return  await getExerciseWithExpectedImpl(topic, difficulty)
}

/**
 * ✅ Keep legacy signature: returns Exercise only.
 * (So any old imports won't break.)
 */
export async function getExercise(
  topic: Topic | "all",
  difficulty: Difficulty | "all"
): Promise<Exercise> {
  const { exercise } = await getExerciseWithExpected(topic, difficulty);
  return exercise;
}
