// src/lib/practice/catalog.ts
import type { TopicSlug, Difficulty } from "@/lib/practice/types";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

export function asTopicOrAll(v: string | null): TopicSlug | "all" {
  if (!v || v === "all") return "all";
  return v; // ✅ DB slug string
}

export function asDifficultyOrAll(v: string | null): Difficulty | "all" {
  if (!v || v === "all") return "all";
  return (DIFFICULTIES as readonly string[]).includes(v) ? (v as Difficulty) : "all";
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
