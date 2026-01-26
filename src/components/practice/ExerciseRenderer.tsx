"use client";

import React from "react";
import type { Exercise, Vec3, ValidateResponse } from "@/lib/practice/types";
import type { VectorPadState } from "@/components/vectorpad/types";

import NumericExerciseUI from "./kinds/NumericExerciseUI";
import SingleChoiceExerciseUI from "./kinds/SingleChoiceExerciseUI";
import MultiChoiceExerciseUI from "./kinds/MultiChoiceExerciseUI";
import MatrixInputExerciseUI from "./kinds/MatrixInputExerciseUI";
import VectorDragTargetExerciseUI from "./kinds/VectorDragTargetExerciseUI";
import VectorDragDotExerciseUI from "./kinds/VectorDragDotExerciseUI";

type QItem = {
  key: string;
  exercise: Exercise;

  single: string;
  multi: string[];
  num: string;

  dragA: Vec3;
  dragB: Vec3;

  matRows: number;
  matCols: number;
  mat: string[][];

  result: ValidateResponse | null;
  submitted: boolean;
  revealed?: boolean;
  attempts?: number;
};

export default function ExerciseRenderer({
  exercise,
  current,
  busy,
  isAssignmentRun,
  maxAttempts,
  padRef,
  updateCurrent,
}: {
  exercise: Exercise;
  current: QItem;
  busy: boolean;
  isAssignmentRun: boolean;
  maxAttempts: number;
  padRef: React.MutableRefObject<VectorPadState | null>;
  updateCurrent: (patch: Partial<QItem>) => void;
}) {
  const attempts = current.attempts ?? 0;
  const lockInputs =
    busy || current.submitted || (isAssignmentRun && attempts >= maxAttempts && !current.result?.ok);

  if (exercise.kind === "numeric") {
    return (
      <NumericExerciseUI
        exercise={exercise}
        value={current.num}
        onChange={(num) => updateCurrent({ num })}
        disabled={lockInputs}
      />
    );
  }

  if (exercise.kind === "single_choice") {
    return (
      <SingleChoiceExerciseUI
        exercise={exercise}
        value={current.single}
        onChange={(id) => updateCurrent({ single: id })}
        disabled={lockInputs}
      />
    );
  }

  if (exercise.kind === "multi_choice") {
    return (
      <MultiChoiceExerciseUI
        exercise={exercise}
        value={current.multi}
        onChange={(ids) => updateCurrent({ multi: ids })}
        disabled={lockInputs}
      />
    );
  }

  if (exercise.kind === "matrix_input") {
    return (
      <MatrixInputExerciseUI
        exercise={exercise}
        rows={current.matRows}
        cols={current.matCols}
        grid={current.mat}
        onChangeGrid={(mat) => updateCurrent({ mat })}
        onChangeDims={(rows, cols, mat) => updateCurrent({ matRows: rows, matCols: cols, mat })}
        disabled={lockInputs}
      />
    );
  }

  if (exercise.kind === "vector_drag_target") {
    return (
      <VectorDragTargetExerciseUI
        exercise={exercise}
        a={current.dragA}
        b={current.dragB}
        onChange={(a, b) => updateCurrent({ dragA: a, dragB: b })}
        padRef={padRef}
        disabled={lockInputs}
      />
    );
  }
  if (exercise.kind === "vector_drag_dot") {
    return (
      <VectorDragDotExerciseUI
        exercise={exercise}
        a={current.dragA}
        onChange={(a) => updateCurrent({ dragA: a })}
        padRef={padRef}
        disabled={lockInputs}
      />
    );
  }

  return assertNever(exercise);
}
function assertNever(x: never): never {
  throw new Error(`Unsupported exercise kind: ${JSON.stringify(x)}`);
}

