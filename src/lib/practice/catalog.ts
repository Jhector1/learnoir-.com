// src/lib/practice/catalog.ts
import type { Topic, Difficulty } from "@/lib/practice/types";

export const TOPICS = [
  "dot",
  "projection",
  "angle",
  "vectors",
  "linear_systems",
  "rref",
  "solution_types",
  "parametric",
  "matrix_ops",
  "matrix_inverse",
  "matrix_properties",
  "vectors_part2",
  "vectors_part1",
] as const satisfies readonly Topic[];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

export function asTopicOrAll(v: string | null): Topic | "all" {
  if (!v || v === "all") return "all";
  return (TOPICS as readonly string[]).includes(v) ? (v as Topic) : "all";
}

export function asDifficultyOrAll(v: string | null): Difficulty | "all" {
  if (!v || v === "all") return "all";
  return (DIFFICULTIES as readonly string[]).includes(v) ? (v as Difficulty) : "all";
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
