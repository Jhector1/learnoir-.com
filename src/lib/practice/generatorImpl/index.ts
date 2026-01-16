import type { Difficulty, Exercise, GenKey } from "../types";
import { RNG, type Seed } from "./rng";
import type { Expected } from "./expected";
import { normalizeDifficulty } from "./utils";
import { TOPIC_GENERATORS } from "./topicRegistry";
import { toDbTopicSlug } from "../topicSlugs";

function makeId(genKey: string, diff: string, rng: RNG) {
  const r = Math.floor(rng.float() * 1e9).toString(16);
  return `${genKey}-${diff}-${r}`;
}

function pickGenKey(rng: RNG): GenKey {
  const keys = Object.keys(TOPIC_GENERATORS) as GenKey[];
  return keys[rng.int(0, keys.length - 1)];
}

export async function getExerciseWithExpectedImpl(
  topic: GenKey | "all",
  difficulty: Difficulty | "all",
  opts?: { seed?: Seed; variant?: string }
): Promise<{ exercise: Exercise; expected: Expected }> {
  const rng = new RNG(opts?.seed);

  const genKey: GenKey = topic === "all" ? pickGenKey(rng) : topic;
  const diff = normalizeDifficulty(difficulty, rng);

  const gen = TOPIC_GENERATORS[genKey];
  if (!gen) {
    const known = Object.keys(TOPIC_GENERATORS).slice(0, 40);
    throw new Error(
      `Unknown generator key "${genKey}". Known: ${known.join(", ")}${known.length >= 40 ? "..." : ""}`
    );
  }

  const id = makeId(genKey, diff, rng);
  const { exercise, expected } = gen(rng, diff, id, opts);

  // ✅ guarantee canonical DB slug in Exercise.topic
  const exTopic = toDbTopicSlug(String((exercise as any).topic ?? genKey));
  const patched = { ...(exercise as any), topic: exTopic } as Exercise;

  return { exercise: patched, expected };
}
