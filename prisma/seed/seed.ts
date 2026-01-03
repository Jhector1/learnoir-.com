// prisma/seed/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { MODULES, SECTIONS } from "./data";

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

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
    topics: [...s.topics],          // ✅ fix
        meta: s.meta as any,
        moduleId,
      },
      create: {
        slug: s.slug,
        order: s.order,
        title: s.title,
        description: s.description,
    topics: [...s.topics],          // ✅ fix
        meta: s.meta as any,
        moduleId,
      },
    });
  }
}

async function main() {
  await prisma.$transaction(async (tx) => {
    const moduleIdBySlug = await upsertModules(tx as any);
    await upsertSections(tx as any, moduleIdBySlug);
  });

  console.log("Seeded practice modules + sections.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
