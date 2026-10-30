import { defineConfig } from "drizzle-kit";
import {
  cargarVariablesDeEntorno,
  exigirVariableDeEntorno
} from "./src/common/config/env.js";

cargarVariablesDeEntorno();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      exigirVariableDeEntorno("DATABASE_URL")
  }
});
