import { Inject, Injectable } from "@nestjs/common";
import type { EstadoSalud } from "@centris/shared";
import { sql } from "drizzle-orm";
import {
  DatabaseService,
  UUID_REGEX
} from "../../database/database.service.js";
import { afiliaciones } from "../../database/schema/index.js";

@Injectable()
export class SaludService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async obtenerDiagnosticoSalud(boxId?: string): Promise<EstadoSalud> {
    const metaResult = await this.db.client.execute<{
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
      const rows = await this.db.withBoxTransaction(boxId, async (tx) => {
        return tx.select().from(afiliaciones);
      });
      afiliacionesVisiblesEnContexto = rows.length;
    } else {
      const rows = await this.db.client.select().from(afiliaciones);
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
}
