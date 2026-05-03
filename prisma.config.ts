// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // CLI butuh koneksi direct ke Supabase buat nge-push skema
    url: process.env["DIRECT_URL"], 
  },
});