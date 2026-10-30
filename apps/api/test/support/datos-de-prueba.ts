import pg from "pg";
import type { RolAfiliacion } from "@centris/shared";
import { exigirVariableDeEntorno } from "../../src/common/config/env.js";
import { hashearContrasena } from "../../src/modules/auth/contrasenas.js";

const MIGRATION_URL = exigirVariableDeEntorno("MIGRATION_DATABASE_URL");

interface BoxDePrueba {
  id: string;
  nombre: string;
}

interface UsuarioDePrueba {
  id: string;
  email: string;
  nombre: string;
  contrasena: string | null;
}

interface AfiliacionDePrueba {
  id: string;
  boxId: string;
  usuarioId: string;
  roles: RolAfiliacion[];
  activo?: boolean;
}

/**
 * Siembra un set de datos aislado (IDs propios por archivo de test) usando el rol
 * propietario, y lo elimina al finalizar. Nunca toca el dataset de seed oficial.
 */
export class DatosDePrueba {
  private readonly pool = new pg.Pool({ connectionString: MIGRATION_URL });

  constructor(
    private readonly datos: {
      boxes: BoxDePrueba[];
      usuarios: UsuarioDePrueba[];
      afiliaciones: AfiliacionDePrueba[];
    }
  ) {}

  async sembrar(): Promise<void> {
    await this.limpiar();
    for (const box of this.datos.boxes) {
      await this.pool.query(
        `INSERT INTO boxes (id, nombre, slug, timezone, moneda, anticipacion_reserva_dias, ventana_cancelacion_minutos)
         VALUES ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'ARS', 7, 120)`,
        [box.id, box.nombre, `test-${box.id}`]
      );
    }
    for (const usuario of this.datos.usuarios) {
      const hash = usuario.contrasena
        ? await hashearContrasena(usuario.contrasena)
        : null;
      await this.pool.query(
        `INSERT INTO usuarios (id, email, nombre, password_hash) VALUES ($1, $2, $3, $4)`,
        [usuario.id, usuario.email, usuario.nombre, hash]
      );
    }
    for (const afiliacion of this.datos.afiliaciones) {
      await this.pool.query(
        `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo) VALUES ($1, $2, $3, $4, $5)`,
        [
          afiliacion.id,
          afiliacion.boxId,
          afiliacion.usuarioId,
          afiliacion.roles,
          afiliacion.activo ?? true
        ]
      );
    }
  }

  async consultar<T extends pg.QueryResultRow>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  async limpiar(): Promise<void> {
    const boxIds = this.datos.boxes.map((b) => b.id);
    const usuarioIds = this.datos.usuarios.map((u) => u.id);
    await this.pool.query(
      `DELETE FROM afiliaciones WHERE box_id = ANY($1::uuid[]) OR usuario_id = ANY($2::uuid[])`,
      [boxIds, usuarioIds]
    );
    await this.pool.query(
      `DELETE FROM planes WHERE box_id = ANY($1::uuid[])`,
      [boxIds]
    );
    await this.pool.query(`DELETE FROM usuarios WHERE id = ANY($1::uuid[])`, [
      usuarioIds
    ]);
    await this.pool.query(`DELETE FROM boxes WHERE id = ANY($1::uuid[])`, [
      boxIds
    ]);
  }

  async cerrar(): Promise<void> {
    await this.limpiar();
    await this.pool.end();
  }
}
