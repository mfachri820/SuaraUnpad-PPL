import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// buat pool postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// tipe global agar TS tidak error
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// singleton prisma client
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

// simpan di global saat development (hindari multiple connection saat hot reload)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}