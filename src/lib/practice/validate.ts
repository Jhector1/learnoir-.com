// src/lib/practice/validate.ts
import type { PracticeKind } from "@prisma/client";
import type { SubmitAnswer, Vec3, ValidateResponse } from "./serverTypes";

function dist2(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return dx * dx + dy * dy + dz * dz;
}
function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

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

  if (answer.kind !== kind) {
    return { ok: false, expected: null, explanation: "Answer type mismatch." };
  }

  switch (kind) {
    case "single_choice": {
      const ok = answer.optionId === secretPayload.correctOptionId;
      return {
        ok,
        expected: ok ? null : null,
        explanation: ok ? "Correct." : secretPayload?.explanation ?? "Incorrect.",
      };
    }
    case "multi_choice": {
      const expected = new Set<string>(secretPayload.correctOptionIds ?? []);
      const got = new Set<string>(answer.optionIds ?? []);
      const ok =
        expected.size === got.size &&
        [...expected].every((x) => got.has(x));
      return {
        ok,
        expected: ok ? null : null,
        explanation: ok ? "Correct." : secretPayload?.explanation ?? "Incorrect.",
      };
    }
    case "numeric": {
      const correct = Number(secretPayload.correct);
      const tol = Number(secretPayload.tolerance ?? 0);
      const v = Number(answer.value);
      const ok = Number.isFinite(v) && Math.abs(v - correct) <= tol;
      return {
        ok,
        expected: ok ? null : null,
        explanation: ok
          ? "Correct."
          : secretPayload?.explanation ??
            `Expected within ±${tol} of ${correct.toFixed(3)}.`,
      };
    }
    case "vector_drag_target": {
      const target = secretPayload.targetA as Vec3;
      const tol = Number(secretPayload.tolerance ?? 0.5);
      const ok = dist2(answer.a, target) <= tol * tol;
      return {
        ok,
        expected: ok ? null : null,
        explanation: ok
          ? "Correct."
          : secretPayload?.explanation ??
            `Move a closer to target within tolerance ${tol}.`,
      };
    }
    case "vector_drag_dot": {
      const b = secretPayload.b as Vec3;
      const targetDot = Number(secretPayload.targetDot);
      const tol = Number(secretPayload.tolerance ?? 1);
      const current = dot(answer.a, b);
      const ok = Math.abs(current - targetDot) <= tol;
      return {
        ok,
        expected: ok ? null : null,
        explanation: ok
          ? "Correct."
          : secretPayload?.explanation ??
            `Need |a·b - ${targetDot}| ≤ ${tol}.`,
      };
    }
    default:
      return { ok: false, expected: null, explanation: "Unknown kind." };
  }
}

export function revealExpected(kind: PracticeKind, secretPayload: any) {
  switch (kind) {
    case "single_choice":
      return { correctOptionId: secretPayload.correctOptionId };
    case "multi_choice":
      return { correctOptionIds: secretPayload.correctOptionIds ?? [] };
    case "numeric":
      return {
        correct: secretPayload.correct,
        tolerance: secretPayload.tolerance ?? 0,
      };
    case "vector_drag_target":
      return {
        targetA: secretPayload.targetA,
        tolerance: secretPayload.tolerance ?? 0.5,
      };
    case "vector_drag_dot":
      return {
        b: secretPayload.b,
        targetDot: secretPayload.targetDot,
        tolerance: secretPayload.tolerance ?? 1,
      };
    default:
      return null;
  }
}
