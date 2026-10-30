import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import {
  cargarVariablesDeEntorno,
  exigirVariableDeEntorno
} from "../common/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ejecutarMigraciones(connectionString?: string): Promise<void> {
  cargarVariablesDeEntorno();
  const url =
    connectionString ??
    process.env.MIGRATION_DATABASE_URL ??
    exigirVariableDeEntorno("DATABASE_URL");

  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1");
  const useSsl =
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
    (isRemote && process.env.NODE_ENV === "production");

  const pool = new pg.Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });
  try {
    const db = drizzle(pool);
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarMigraciones()
    .then(() => {
      console.log("Migraciones aplicadas correctamente.");
    })
    .catch((err) => {
      console.error("Error aplicando migraciones:", err);
      process.exit(1);
    });
}
