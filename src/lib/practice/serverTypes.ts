// src/lib/practice/serverTypes.ts
import type { PracticeDifficulty, PracticeKind, PracticeTopic } from "@prisma/client";

export type Vec3 = { x: number; y: number; z: number };

export type ExercisePublic =
  | {
      topic: PracticeTopic;
      kind: "single_choice";
      title: string;
      prompt: string;
      options: { id: string; text: string }[];
    }
  | {
      topic: PracticeTopic;
      kind: "multi_choice";
      title: string;
      prompt: string;
      options: { id: string; text: string }[];
    }
  | {
      topic: PracticeTopic;
      kind: "numeric";
      title: string;
      prompt: string;
      hint?: string;
      // show expected formatting if you want
      unit?: string;
    }
  | {
      topic: PracticeTopic;
      kind: "vector_drag_target";
      title: string;
      prompt: string;
      initialA: Vec3;
      initialB?: Vec3;
      lockB: boolean;
      targetA: Vec3;
      tolerance: number;
    }
  | {
      topic: PracticeTopic;
      kind: "vector_drag_dot";
      title: string;
      prompt: string;
      initialA: Vec3;
      b: Vec3;
      targetDot: number;
      tolerance: number;
    };

export type SubmitAnswer =
  | { kind: "single_choice"; optionId: string }
  | { kind: "multi_choice"; optionIds: string[] }
  | { kind: "numeric"; value: number }
  | { kind: "vector_drag_target"; a: Vec3; b: Vec3 }
  | { kind: "vector_drag_dot"; a: Vec3 };

export type ValidateResponse = {
  ok: boolean;
  expected: any; // only included when reveal or review endpoint
  explanation?: string;
};

export type GenerateParams = {
  topic?: PracticeTopic;
  difficulty: PracticeDifficulty;
  sectionSlug?: string;
};
