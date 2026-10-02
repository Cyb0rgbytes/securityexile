import { defineConfig } from "drizzle-kit";

// Generates SQL only; migrations are applied with wrangler (`npm run db:migrate:local`).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  strict: true,
  verbose: true,
});
