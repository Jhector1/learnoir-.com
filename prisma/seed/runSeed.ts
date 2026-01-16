import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { MODULES, SECTIONS } from "./data";

function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });
}

function moduleSlugFromTopicSlug(topicSlug: string): string | null {
  const prefix = topicSlug.split(".")[0]; // "m0"
  if (prefix === "m0") return "module-0";
  if (prefix === "m1") return "module-1";
  if (prefix === "m2") return "module-2";
  return null;
}

function titleKeyFromTopicSlug(topicSlug: string) {
  return `topic.${topicSlug}`;
}

/**
 * ✅ Small set of generator engines
 * Topics can share engines via meta.variant.
 */
function genKeyFromTopicSlug(topicSlug: string): string | null {
  // Module 0
  if (topicSlug === "m0.dot") return "dot";
  if (topicSlug === "m0.projection") return "projection";
  if (topicSlug === "m0.angle") return "angle";
  if (topicSlug === "m0.vectors") return "vectors";
  if (topicSlug === "m0.vectors_part1") return "vectors_part1";
  if (topicSlug === "m0.vectors_part2") return "vectors_part2";

  // Module 1
  if (topicSlug === "m1.linear_systems") return "linear_systems";
  if (topicSlug === "m1.augmented") return "augmented";
  if (topicSlug === "m1.rref") return "rref";
  if (topicSlug === "m1.solution_types") return "solution_types";
  if (topicSlug === "m1.parametric") return "parametric";

  // Module 2 (core)
  if (topicSlug === "m2.matrix_ops") return "matrix_ops";
  if (topicSlug === "m2.matrix_inverse") return "matrix_inverse";
  if (topicSlug === "m2.matrix_properties") return "matrix_properties";

  // ✅ Matrices Part 1 (ALL of these share one engine)
  if (
    topicSlug === "m2.matrices_part1" ||
    [
      "m2.matrices_intro",
      "m2.index_slice",
      "m2.special",
      "m2.elementwise_shift",
      "m2.matmul",
      "m2.matvec",
      "m2.transpose_liveevil",
      "m2.symmetric",
    ].includes(topicSlug)
  ) {
    return "matrices_part1";
  }

  return null;
}

function variantForTopicSlug(topicSlug: string): string | null {
  // ✅ for subtopics, store suffix as variant
  if (topicSlug.startsWith("m2.")) {
    const suffix = topicSlug.split(".")[1];

    // “mix” topic has no variant
    if (suffix === "matrices_part1") return null;

    if (
      [
        "matrices_intro",
        "index_slice",
        "special",
        "elementwise_shift",
        "matmul",
        "matvec",
        "transpose_liveevil",
        "symmetric",
      ].includes(suffix)
    ) {
      return suffix;
    }
  }
  return null;
}


// function variantForTopicSlug(topicSlug: string): string | null {
//   // For matrices_part1, use the suffix as variant
//   if (topicSlug.startsWith("m2.")) {
//     const suffix = topicSlug.split(".")[1]; // "matmul"
//     if ([
//       "matrices_intro",
//       "index_slice",
//       "special",
//       "elementwise_shift",
//       "matmul",
//       "matvec",
//       "transpose_liveevil",
//       "symmetric",
//     ].includes(suffix)) return suffix;
//   }
//   return null;
// }

async function upsertModules(tx: PrismaClient) {
  const moduleIdBySlug = new Map<string, string>();
  for (const m of MODULES) {
    const row = await tx.practiceModule.upsert({
      where: { slug: m.slug },
      update: { ...m },
      create: { ...m },
    });
    moduleIdBySlug.set(m.slug, row.id);
  }
  return moduleIdBySlug;
}

async function upsertTopics(tx: PrismaClient, moduleIdBySlug: Map<string, string>) {
  const topicSlugs = new Set<string>();
  for (const s of SECTIONS) for (const t of s.topics) topicSlugs.add(t);

  const topicIdBySlug = new Map<string, string>();

  for (const slug of topicSlugs) {
    const moduleSlug = moduleSlugFromTopicSlug(slug);
    const moduleId = moduleSlug ? moduleIdBySlug.get(moduleSlug) ?? null : null;

    const genKey = genKeyFromTopicSlug(slug);
    const variant = variantForTopicSlug(slug);

    const row = await tx.practiceTopic.upsert({
      where: { slug },
      update: {
        moduleId,
        titleKey: titleKeyFromTopicSlug(slug),
        genKey,
        meta: variant ? { variant } : undefined,
      },
      create: {
        slug,
        moduleId,
        titleKey: titleKeyFromTopicSlug(slug),
        genKey,
        meta: variant ? { variant } : undefined,
      },
    });

    topicIdBySlug.set(slug, row.id);
  }

  return topicIdBySlug;
}

async function upsertSections(
  tx: PrismaClient,
  moduleIdBySlug: Map<string, string>,
  topicIdBySlug: Map<string, string>
) {
  for (const s of SECTIONS) {
    const moduleId = moduleIdBySlug.get(s.moduleSlug) ?? null;

    const section = await tx.practiceSection.upsert({
      where: { slug: s.slug },
      update: { order: s.order, title: s.title, description: s.description, meta: s.meta as any, moduleId },
      create: { slug: s.slug, order: s.order, title: s.title, description: s.description, meta: s.meta as any, moduleId },
    });

    await tx.practiceSectionTopic.deleteMany({ where: { sectionId: section.id } });

    if (s.topics.length) {
      await tx.practiceSectionTopic.createMany({
        data: s.topics.map((topicSlug, idx) => {
          const topicId = topicIdBySlug.get(topicSlug);
          if (!topicId) throw new Error(`Missing topicId for ${topicSlug}`);
          return { sectionId: section.id, topicId, order: idx };
        }),
      });
    }
  }
}

export async function runSeed() {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const moduleIdBySlug = await upsertModules(tx as any);
      const topicIdBySlug = await upsertTopics(tx as any, moduleIdBySlug);
      await upsertSections(tx as any, moduleIdBySlug, topicIdBySlug);
      return { ok: true as const, modules: MODULES.length, sections: SECTIONS.length, topics: topicIdBySlug.size };
    });
  } finally {
    await prisma.$disconnect();
  }
}
