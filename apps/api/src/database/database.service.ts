import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export type DrizzleTx = NodePgDatabase<typeof schema>;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidUuid(value: string, label: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`${label} inválido: se esperaba un UUID válido.`);
  }
}

/**
 * Módulo profundo de persistencia e infraestructura RLS (ADR 0004).
 * Conecta con el rol de aplicación sin BYPASSRLS y encapsula la apertura
 * de transacciones con SET LOCAL app.box_id / SET LOCAL app.usuario_id.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: pg.Pool;
  private readonly db: DrizzleTx;

  constructor(connectionString?: string) {
    const url =
      connectionString ??
      process.env.DATABASE_URL ??
      "postgresql://centris_app_user:centris_app_pass@localhost:5432/centris_db";

    this.pool = new pg.Pool({ connectionString: url });
    this.db = drizzle(this.pool, { schema });
  }

  get client(): DrizzleTx {
    return this.db;
  }

  /**
   * Abre una transacción fijando SET LOCAL app.box_id = '<boxId>' y limpiando app.usuario_id.
   * Al ser SET LOCAL, el contexto desaparece automáticamente al cerrar la transacción.
   */
  async withBoxTransaction<T>(
    boxId: string,
    fn: (tx: DrizzleTx) => Promise<T>
  ): Promise<T> {
    assertValidUuid(boxId, "boxId");
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.usuario_id', '', true)`);
      await tx.execute(sql`SELECT set_config('app.box_id', ${boxId}, true)`);
      return fn(tx);
    });
  }

  /**
   * Abre una transacción fijando SET LOCAL app.usuario_id = '<usuarioId>' y limpiando app.box_id.
   * Usado exclusivamente en la lectura pre-Box de afiliaciones (Selector de Box).
   */
  async withUsuarioTransaction<T>(
    usuarioId: string,
    fn: (tx: DrizzleTx) => Promise<T>
  ): Promise<T> {
    assertValidUuid(usuarioId, "usuarioId");
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.box_id', '', true)`);
      await tx.execute(
        sql`SELECT set_config('app.usuario_id', ${usuarioId}, true)`
      );
      return fn(tx);
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
