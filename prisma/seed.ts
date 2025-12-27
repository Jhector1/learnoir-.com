// prisma/seed.ts
import "dotenv/config";
import { PrismaClient, PracticeTopic } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function main() {
  await prisma.practiceSection.upsert({
    where: { slug: "module-0-dot" },
    update: {},
    create: {
      slug: "module-0-dot",
      title: "Module 0 — Dot Product",
      description: "Dot product intuition + computation + drag practice.",
      order: 0,
      topics: [PracticeTopic.dot, PracticeTopic.vectors],
    },
  });

  await prisma.practiceSection.upsert({
    where: { slug: "module-0-angle" },
    update: {},
    create: {
      slug: "module-0-angle",
      title: "Module 0 — Angle & Cosine",
      description: "Angle between vectors and cosine relationship.",
      order: 1,
      topics: [PracticeTopic.angle],
    },
  });

  await prisma.practiceSection.upsert({
    where: { slug: "module-0-projection" },
    update: {},
    create: {
      slug: "module-0-projection",
      title: "Module 0 — Projection",
      description: "Projection basics (more templates coming).",
      order: 2,
      topics: [PracticeTopic.projection],
    },
  });

  console.log("Seeded practice sections.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
