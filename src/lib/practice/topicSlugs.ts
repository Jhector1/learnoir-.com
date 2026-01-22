// src/lib/practice/topicSlugs.ts
import type { GenKey, TopicSlug } from "./types";

/**
 * Map generator keys (engine) -> DB slugs (PracticeTopic.slug)
 * Keep this aligned with prisma/seed/data.ts TOPICS values.
 */
export const GENKEY_TO_DB: Record<GenKey, TopicSlug> = {
  // Module 0
  dot: "m0.dot",
  projection: "m0.projection",
  angle: "m0.angle",
  vectors: "m0.vectors",
  vectors_part1: "m0.vectors_part1",
  vectors_part2: "m0.vectors_part2",

  // Module 1
  linear_systems: "m1.linear_systems",
  augmented: "m1.augmented",
  rref: "m1.rref",
  solution_types: "m1.solution_types",
  parametric: "m1.parametric",

  // Module 2
  matrix_ops: "m2.matrix_ops",
  matrix_inverse: "m2.matrix_inverse",
  matrix_properties: "m2.matrix_properties",

  // If you actually keep this generator key, you MUST seed this topic slug
  matrices_part1: "m2.matrices_part1",
  matrices_part2: "m2.matrices_part2"
};

/**
 * Extract GenKey from either:
 * - "vectors_part2"
 * - "m0.vectors_part2"
 */
export function genKeyFromAnySlug(s: string): GenKey | null {
  const raw = String(s || "").trim();
  if (!raw) return null;

  const maybe = (raw.includes(".") ? raw.split(".").pop() : raw) as GenKey;
  return (maybe in GENKEY_TO_DB ? maybe : null);
}

/**
 * Convert any incoming slug ("vectors", "m0.vectors") to the DB slug.
 * If it already looks namespaced (has '.'), we assume it's DB slug already.
 */
export function toDbTopicSlug(s: string): TopicSlug {
  const raw = String(s || "").trim();
  if (!raw) return raw;

  if (raw.includes(".")) return raw; // already DB-style

  const gk = genKeyFromAnySlug(raw);
  return gk ? GENKEY_TO_DB[gk] : raw; // unknown stays as-is
}
