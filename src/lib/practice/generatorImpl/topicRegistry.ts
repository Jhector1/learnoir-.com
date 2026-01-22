import type { Difficulty, Exercise, GenKey } from "../types";
import type { RNG } from "./rng";
import type { Expected } from "./expected";

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
import { genVectorsPart2 } from "./topics/vectorsPart2";
import { genVectorsPart1 } from "./topics/vectorsPart1";

import { makeGenMatricesPart1 } from "./topics/matricesPart1";
import { makeGenMatricesPart2 } from "./topics/matricesPart2";

export type GenFn = (
  rng: RNG,
  diff: Difficulty,
  id: string,
  opts?: { variant?: string }
) => { exercise: Exercise; expected: Expected };

const MATRIX_PART1_VARIANTS = [
  "m2.matrices_intro",
  "m2.index_slice",
  "m2.special",
  "m2.elementwise_shift",
  "m2.matmul",
  "m2.matvec",
  "m2.transpose_liveevil",
  "m2.symmetric",
] as const;
const MATRIX_PART2_VARIANTS = [
 "m3.norms",
   "m3.colspace",
  "m3.nullspace",
 "m3.rank",
 "m3.det",
  "m3.charpoly",

] as const;


export const TOPIC_GENERATORS: Record<GenKey, GenFn> = {
  dot: genDot as GenFn,
  projection: genProjection as GenFn,
  angle: genAngle as GenFn,
  vectors: genVectors as GenFn,
  vectors_part1: genVectorsPart1 as GenFn,
  vectors_part2: genVectorsPart2 as GenFn,

  linear_systems: genLinearSystems as GenFn,
  augmented: genAugmented as GenFn,
  rref: genRref as GenFn,
  solution_types: genSolutionTypes as GenFn,
  parametric: genParametric as GenFn,

  matrix_ops: genMatrixOps as GenFn,
  matrix_inverse: genMatrixInverse as GenFn,
  matrix_properties: genMatrixProperties as GenFn,

  matrices_part1: (rng, diff, id, opts) => {
    const v = opts?.variant;
    const slug =
      v && v.startsWith("m2.")
        ? v
        : v
        ? `m2.${v}`
        : rng.pick(MATRIX_PART1_VARIANTS as any);

    return makeGenMatricesPart1(slug as string)(rng, diff, id);
  },
    // ✅ NEW
  matrices_part2: (rng, diff, id, opts) => {
    const v = opts?.variant;
    const slug =
      v && v.startsWith("m3.")
        ? v
        : v
        ? `m3.${v}`
        : rng.pick(MATRIX_PART2_VARIANTS as any);

    return makeGenMatricesPart2(slug as string)(rng, diff, id);
  },
};
