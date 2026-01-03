// src/lib/practice/validate.ts
import type { PracticeKind } from "@prisma/client";
import type { SubmitAnswer, Vec3, ValidateResponse } from "./serverTypes";

/** ---------------- math helpers ---------------- */

function dist2(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return dx * dx + dy * dy + dz * dz;
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** ---------------- answer type guards ---------------- */

type NumericAnswer = Extract<SubmitAnswer, { kind: "numeric" }>;
type SingleChoiceAnswer = Extract<SubmitAnswer, { kind: "single_choice" }>;
type MultiChoiceAnswer = Extract<SubmitAnswer, { kind: "multi_choice" }>;
type VectorDragTargetAnswer = Extract<SubmitAnswer, { kind: "vector_drag_target" }>;
type VectorDragDotAnswer = Extract<SubmitAnswer, { kind: "vector_drag_dot" }>;

const isNumeric = (a: SubmitAnswer | null | undefined): a is NumericAnswer =>
  !!a && a.kind === "numeric";

const isSingleChoice = (a: SubmitAnswer | null | undefined): a is SingleChoiceAnswer =>
  !!a && a.kind === "single_choice";

const isMultiChoice = (a: SubmitAnswer | null | undefined): a is MultiChoiceAnswer =>
  !!a && a.kind === "multi_choice";

const isVectorDragTarget = (a: SubmitAnswer | null | undefined): a is VectorDragTargetAnswer =>
  !!a && a.kind === "vector_drag_target";

const isVectorDragDot = (a: SubmitAnswer | null | undefined): a is VectorDragDotAnswer =>
  !!a && a.kind === "vector_drag_dot";

/** ---------------- small utils ---------------- */

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

/**
 * If your generators sometimes store numeric as { value } and sometimes as { correct },
 * this supports both, so you don't get "undefined" math.
 */
function readNumericSecret(secretPayload: any) {
  const value =
    secretPayload?.value ??
    secretPayload?.correct ??
    secretPayload?.expected ??
    secretPayload?.correctValue;

  const tol = secretPayload?.tolerance ?? 0;

  return { correct: Number(value), tol: Number(tol) };
}

/** ---------------- main validator ---------------- */

export function validateAttempt(args: {
  kind: PracticeKind;
  secretPayload: any;
  answer: SubmitAnswer | undefined;
  reveal?: boolean;
}): ValidateResponse {
  const { kind, secretPayload, answer, reveal } = args;

  // reveal-only request (no answer)
  if (reveal) {
    return {
      ok: true,
      expected: revealExpected(kind, secretPayload),
      explanation: secretPayload?.explanation ?? "Revealed.",
    };
  }

  if (!answer) {
    return { ok: false, expected: null, explanation: "No answer submitted." };
  }

  // runtime safety: kind must match
  if (answer.kind !== kind) {
    return { ok: false, expected: null, explanation: "Answer type mismatch." };
  }

  // ✅ Switch on the discriminant TypeScript understands
  switch (answer.kind) {
    case "single_choice": {
      if (!isSingleChoice(answer)) {
        return { ok: false, expected: null, explanation: "Please choose one option." };
      }

      const correctOptionId = String(secretPayload?.correctOptionId ?? "");
      const ok = answer.optionId === correctOptionId;

      return {
        ok,
        expected: null,
        explanation: ok ? "Correct." : "Incorrect.",
      };
    }

    case "multi_choice": {
      if (!isMultiChoice(answer)) {
        return { ok: false, expected: null, explanation: "Please select one or more options." };
      }

      const correct = Array.isArray(secretPayload?.correctOptionIds)
        ? secretPayload.correctOptionIds.map(String)
        : [];

      const chosen = (answer.optionIds ?? []).map(String);

      const ok = sameSet(chosen, correct);

      return {
        ok,
        expected: null,
        explanation: ok ? "Correct." : "Incorrect.",
      };
    }

    case "numeric": {
      if (!isNumeric(answer)) {
        return { ok: false, expected: null, explanation: "Please enter a number." };
      }

      const { correct, tol } = readNumericSecret(secretPayload);
      const v = Number(answer.value);

      const ok =
        Number.isFinite(v) &&
        Number.isFinite(correct) &&
        Math.abs(v - correct) <= (Number.isFinite(tol) ? tol : 0);

      return {
        ok,
        expected: null,
        explanation: ok ? "Correct." : `Expected ${correct}${tol ? ` ± ${tol}` : ""}.`,
      };
    }

    case "vector_drag_target": {
      if (!isVectorDragTarget(answer)) {
        return { ok: false, expected: null, explanation: "Drag answer missing point data." };
      }

      const target = secretPayload?.targetA as Vec3;
      const tol = Number(secretPayload?.tolerance ?? 0.5);

      const ok = !!target && dist2(answer.a, target) <= tol * tol;

      return {
        ok,
        expected: null,
        explanation: ok
          ? "Correct."
          : secretPayload?.explanation ?? `Move a closer to target within tolerance ${tol}.`,
      };
    }

    case "vector_drag_dot": {
      if (!isVectorDragDot(answer)) {
        return { ok: false, expected: null, explanation: "Drag answer missing point data." };
      }

      const b = secretPayload?.b as Vec3;
      const targetDot = Number(secretPayload?.targetDot);
      const tol = Number(secretPayload?.tolerance ?? 1);

      if (!b || !Number.isFinite(targetDot)) {
        return { ok: false, expected: null, explanation: "Invalid server target." };
      }

      const current = dot(answer.a, b);
      const ok = Number.isFinite(current) && Math.abs(current - targetDot) <= tol;

      return {
        ok,
        expected: null,
        explanation: ok
          ? "Correct."
          : secretPayload?.explanation ?? `Need |a·b - ${targetDot}| ≤ ${tol}.`,
      };
    }

    default:
      return { ok: false, expected: null, explanation: "Unknown kind." };
  }
}

/** ---------------- reveal helper ---------------- */

export function revealExpected(kind: PracticeKind, secretPayload: any) {
  switch (kind) {
    case "single_choice":
      return { correctOptionId: secretPayload?.correctOptionId };
    case "multi_choice":
      return { correctOptionIds: secretPayload?.correctOptionIds ?? [] };
    case "numeric":
      return {
        // supports both conventions
        correct: secretPayload?.correct ?? secretPayload?.value,
        value: secretPayload?.value ?? secretPayload?.correct,
        tolerance: secretPayload?.tolerance ?? 0,
      };
    case "vector_drag_target":
      return {
        targetA: secretPayload?.targetA,
        tolerance: secretPayload?.tolerance ?? 0.5,
      };
    case "vector_drag_dot":
      return {
        b: secretPayload?.b,
        targetDot: secretPayload?.targetDot,
        tolerance: secretPayload?.tolerance ?? 1,
      };
    default:
      return null;
  }
}
