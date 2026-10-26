import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      "postgresql://centris_owner:centris_owner_pass@localhost:5432/centris_db"
  }
});
