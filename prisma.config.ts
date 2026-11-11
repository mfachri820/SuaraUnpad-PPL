// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DB_URL = nama env di cluster Unpad (dari Secret postgresql-creds), DATABASE_URL = lokal/CI.
    url: process.env["DATABASE_URL"]?.trim() || process.env["DB_URL"]?.trim(),
  },
});
