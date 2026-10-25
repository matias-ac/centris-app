import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ejecutarMigraciones(connectionString?: string): Promise<void> {
  const url =
    connectionString ??
    process.env.MIGRATION_DATABASE_URL ??
    "postgresql://centris_owner:centris_owner_pass@localhost:5432/centris_db";

  const pool = new pg.Pool({ connectionString: url });
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
