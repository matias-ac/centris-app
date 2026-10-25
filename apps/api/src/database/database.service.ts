import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { EstadoSalud } from "@centris/shared";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export type DrizzleTx = NodePgDatabase<typeof schema>;

const UUID_REGEX =
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

  /**
   * Verifica la conexión activa, el rol operativo sin BYPASSRLS, el estado de FORCE RLS
   * sobre la tabla afiliaciones y cuántas afiliaciones son visibles en el contexto provisto.
   */
  async obtenerDiagnosticoSalud(boxId?: string): Promise<EstadoSalud> {
    const metaResult = await this.db.execute<{
      rol_conexion: string;
      bypass_rls: boolean;
      rls_activo: boolean;
    }>(sql`
      SELECT
        current_user AS rol_conexion,
        r.rolbypassrls AS bypass_rls,
        (c.relrowsecurity AND c.relforcerowsecurity) AS rls_activo
      FROM pg_roles r
      CROSS JOIN pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE r.rolname = current_user
        AND n.nspname = 'public'
        AND c.relname = 'afiliaciones'
    `);

    const meta = metaResult.rows[0];
    if (!meta) {
      throw new Error(
        "No se encontró la metadata de RLS para la tabla afiliaciones."
      );
    }

    let afiliacionesVisiblesEnContexto = 0;
    if (boxId && UUID_REGEX.test(boxId)) {
      const rows = await this.withBoxTransaction(boxId, async (tx) => {
        return tx.select().from(schema.afiliaciones);
      });
      afiliacionesVisiblesEnContexto = rows.length;
    } else {
      const rows = await this.db.select().from(schema.afiliaciones);
      afiliacionesVisiblesEnContexto = rows.length;
    }

    return {
      estado: "ok",
      baseDeDatos: "conectada",
      rolConexion: meta.rol_conexion,
      rlsActivo: Boolean(meta.rls_activo),
      bypassRls: Boolean(meta.bypass_rls),
      afiliacionesVisiblesEnContexto
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
