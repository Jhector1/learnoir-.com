// prisma.config.ts
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load the same env files Next uses (order matters)
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
   migrations: {
    seed: "tsx prisma/seed/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
