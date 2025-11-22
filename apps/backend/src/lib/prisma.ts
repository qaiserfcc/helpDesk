import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env.js";

type GlobalPrisma = {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaAdapter?: PrismaPg;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

const pool =
  globalForPrisma.prismaPool ||
  new Pool({
    connectionString: env.DATABASE_URL,
  });

const adapter = globalForPrisma.prismaAdapter || new PrismaPg(pool);

const prismaOptions = {
  log: ["error", "warn"],
  adapter,
} as ConstructorParameters<typeof PrismaClient>[0];

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prismaAdapter = adapter;
}
