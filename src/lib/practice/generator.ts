import { getExerciseWithExpectedImpl } from "./generatorImpl";
import type { Difficulty, Exercise, GenKey, TopicSlug } from "./types";
import type { Expected } from "./generatorImpl/expected";

export async function getExerciseWithExpected(
  topic: GenKey | "all",
  difficulty: Difficulty | "all",
  opts?: { variant?: string }
): Promise<{ exercise: Exercise; expected: Expected }> {
  return await getExerciseWithExpectedImpl(topic, difficulty, opts);
}

// Legacy
export async function getExercise(
  topic: TopicSlug | "all",
  difficulty: Difficulty | "all"
): Promise<Exercise> {
  // treat topic as "all" at this layer; API should call getExerciseWithExpected with GenKey
  const { exercise } = await getExerciseWithExpected("all", difficulty);
  return exercise;
}
