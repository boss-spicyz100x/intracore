import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations/pg",
  schema: "./src/db/schema.postgres.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
