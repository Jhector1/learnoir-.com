// src/lib/practice/generator/index.ts
import type { Difficulty, Exercise, Topic } from "../types";
import { RNG, type Seed } from "./rng";
import type { Expected } from "./expected";
import { normalizeDifficulty, normalizeTopic } from "./utils";

import { genDot } from "./topics/dot";
import { genProjection } from "./topics/projection";
import { genAngle } from "./topics/angle";
import { genVectors } from "./topics/vectors";
import { genLinearSystems } from "./topics/linearSystems";
import { genAugmented } from "./topics/augmented";
import { genRref } from "./topics/rref";
import { genSolutionTypes } from "./topics/solutionTypes";
import { genParametric } from "./topics/parametric";
import { genMatrixOps } from "./topics/matrixOps";
import { genMatrixInverse } from "./topics/matrixInverse";
import { genMatrixProperties } from "./topics/matrixProperties";

function makeId(topic: string, diff: string, rng: RNG) {
  // No Date.now here => stable in assignment mode if seed is stable
  const r = Math.floor(rng.float() * 1e9).toString(16);
  return `${topic}-${diff}-${r}`;
}

export async function getExerciseWithExpectedImpl(
  topic: Topic | "all",
  difficulty: Difficulty | "all",
  opts?: { seed?: Seed }
): Promise<{ exercise: Exercise; expected: Expected }> {
  const rng = new RNG(opts?.seed);

  const finalTopic = normalizeTopic(topic, rng);
  const diff = normalizeDifficulty(difficulty, rng);
  const id = makeId(finalTopic, diff, rng);

  switch (finalTopic) {
    case "dot": {
      const { exercise, expected } = genDot(rng, diff, id);
      return { exercise, expected };
    }
    case "projection": {
      const { exercise, expected } = genProjection(rng, diff, id);
      return { exercise, expected };
    }
    case "angle": {
      const { exercise, expected } = genAngle(rng, diff, id);
      return { exercise, expected };
    }
    case "vectors": {
      const { exercise, expected } = genVectors(rng, diff, id);
      return { exercise, expected };
    }
    case "linear_systems": {
      const { exercise, expected } = genLinearSystems(rng, diff, id);
      return { exercise, expected };
    }
    case "augmented": {
      const { exercise, expected } = genAugmented(rng, diff, id);
      return { exercise, expected };
    }
    case "rref": {
      const { exercise, expected } = genRref(rng, diff, id);
      return { exercise, expected };
    }
    case "solution_types": {
      const { exercise, expected } = genSolutionTypes(rng, diff, id);
      return { exercise, expected };
    }
    case "parametric": {
      const { exercise, expected } = genParametric(rng, diff, id);
      return { exercise, expected };
    }
    case "matrix_ops": {
      const { exercise, expected } = genMatrixOps(rng, diff, id);
      return { exercise, expected };
    }
    case "matrix_inverse": {
      const { exercise, expected } = genMatrixInverse(rng, diff, id);
      return { exercise, expected };
    }
    case "matrix_properties": {
      const { exercise, expected } = genMatrixProperties(rng, diff, id);
      return { exercise, expected };
    }
    default: {
      // Exhaustive guard
      const _never: never = finalTopic;
      throw new Error(`Unknown topic: ${_never}`);
    }
  }
}

// Legacy compat
export async function getExerciseImpl(topic: Topic | "all", difficulty: Difficulty | "all"): Promise<Exercise> {
  const { exercise } = await getExerciseWithExpectedImpl(topic, difficulty);
  return exercise;
}
