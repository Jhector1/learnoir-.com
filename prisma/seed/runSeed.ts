// prisma/seed/runSeed.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { MODULES, SECTIONS } from "./data";

function getPrisma() {
  // On Vercel, DATABASE_URL will be set in env vars
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  return new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
  });
}

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

async function upsertSections(tx: PrismaClient, moduleIdBySlug: Map<string, string>) {
  for (const s of SECTIONS) {
    const moduleId = moduleIdBySlug.get(s.moduleSlug) ?? null;

    await tx.practiceSection.upsert({
      where: { slug: s.slug },
      update: {
        order: s.order,
        title: s.title,
        description: s.description,
        topics: [...s.topics],
        meta: s.meta as any,
        moduleId,
      },
      create: {
        slug: s.slug,
        order: s.order,
        title: s.title,
        description: s.description,
        topics: [...s.topics],
        meta: s.meta as any,
        moduleId,
      },
    });
  }
}

export async function runSeed() {
  const prisma = getPrisma();
  try {
    await prisma.$transaction(async (tx) => {
      const moduleIdBySlug = await upsertModules(tx as any);
      await upsertSections(tx as any, moduleIdBySlug);
    });
    return { ok: true, modules: MODULES.length, sections: SECTIONS.length };
  } finally {
    await prisma.$disconnect();
  }
}
