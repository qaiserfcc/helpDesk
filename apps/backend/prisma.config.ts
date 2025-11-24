import { defineConfig } from '@prisma/config';
import { config as loadEnv } from 'dotenv';

loadEnv();

const databaseUrl = process.env.DATABASE_URL ?? undefined;

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL ?? undefined
  }
});
