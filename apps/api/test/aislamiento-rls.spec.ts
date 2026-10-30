import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { exigirVariableDeEntorno } from "../src/common/config/env.js";
import { DatabaseService } from "../src/database/database.service.js";
import { afiliaciones } from "../src/database/schema/index.js";
import { SaludService } from "../src/modules/salud/salud.service.js";

const MIGRATION_URL = exigirVariableDeEntorno("MIGRATION_DATABASE_URL");

describe("Seam 2 — Aislamiento PostgreSQL con FORCE ROW LEVEL SECURITY (DatabaseService)", () => {
  let db: DatabaseService;
  let saludService: SaludService;
  let ownerPool: pg.Pool;

  const boxAId = "11111111-1111-4111-8111-111111111101";
  const boxBId = "11111111-1111-4111-8111-111111111102";
  const usuarioXId = "22222222-2222-4222-8222-222222222201";
  const usuarioYId = "22222222-2222-4222-8222-222222222202";
  const afiliacionAId = "33333333-3333-4333-8333-333333333301";
  const afiliacionBId = "33333333-3333-4333-8333-333333333302";

  beforeAll(async () => {
    ownerPool = new pg.Pool({ connectionString: MIGRATION_URL });
    db = new DatabaseService();
    saludService = new SaludService(db);

    await ownerPool.query(
      `DELETE FROM afiliaciones WHERE id IN ($1, $2)`,
      [afiliacionAId, afiliacionBId]
    );
    await ownerPool.query(
      `DELETE FROM usuarios WHERE id IN ($1, $2)`,
      [usuarioXId, usuarioYId]
    );
    await ownerPool.query(
      `DELETE FROM boxes WHERE id IN ($1, $2)`,
      [boxAId, boxBId]
    );

    await ownerPool.query(
      `INSERT INTO boxes (id, nombre, slug, timezone, moneda, anticipacion_reserva_dias, ventana_cancelacion_minutos)
       VALUES
         ($1, 'Box A Test', 'box-a-test', 'America/Argentina/Buenos_Aires', 'ARS', 7, 120),
         ($2, 'Box B Test', 'box-b-test', 'America/Argentina/Buenos_Aires', 'ARS', 5, 60)`,
      [boxAId, boxBId]
    );

    await ownerPool.query(
      `INSERT INTO usuarios (id, email, nombre, password_hash)
       VALUES
         ($1, 'usuario.x@test.centris.dev', 'Usuario X', NULL),
         ($2, 'usuario.y@test.centris.dev', 'Usuario Y', 'hash_demo')`,
      [usuarioXId, usuarioYId]
    );

    await ownerPool.query(
      `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
       VALUES
         ($1, $2, $3, ARRAY['atleta', 'coach'], true),
         ($4, $5, $6, ARRAY['administrador'], true)`,
      [afiliacionAId, boxAId, usuarioXId, afiliacionBId, boxBId, usuarioYId]
    );
  });

  afterAll(async () => {
    await ownerPool
      .query(`DELETE FROM afiliaciones WHERE id IN ($1, $2)`, [
        afiliacionAId,
        afiliacionBId
      ])
      .catch(() => undefined);
    await ownerPool
      .query(`DELETE FROM usuarios WHERE id IN ($1, $2)`, [
        usuarioXId,
        usuarioYId
      ])
      .catch(() => undefined);
    await ownerPool
      .query(`DELETE FROM boxes WHERE id IN ($1, $2)`, [boxAId, boxBId])
      .catch(() => undefined);
    await db.close();
    await ownerPool.end();
  });

  it("conecta con el rol centris_app_user (NOSUPERUSER, NOBYPASSRLS) y verifica extensiones y FORCE RLS en afiliaciones", async () => {
    const diag = await saludService.obtenerDiagnosticoSalud(boxAId);

    expect(diag.rolConexion).toBe("centris_app_user");
    expect(diag.bypassRls).toBe(false);
    expect(diag.rlsActivo).toBe(true);

    const extResult = await db.client.execute<{ extname: string }>(
      sql`SELECT extname FROM pg_extension WHERE extname IN ('btree_gist', 'pgcrypto', 'uuid-ossp') ORDER BY extname`
    );
    expect(extResult.rows.map((r) => r.extname)).toEqual([
      "btree_gist",
      "pgcrypto",
      "uuid-ossp"
    ]);
  });

  it("con SET LOCAL app.box_id = BoxA devuelve exclusivamente filas de Box A y rechaza INSERT/UPDATE hacia Box B", async () => {
    const filasBoxA = await db.withBoxTransaction(boxAId, async (tx) => {
      return tx.select().from(afiliaciones);
    });

    expect(filasBoxA.length).toBeGreaterThanOrEqual(1);
    expect(filasBoxA.every((fila) => fila.boxId === boxAId)).toBe(true);
    expect(filasBoxA.some((fila) => fila.boxId === boxBId)).toBe(false);

    // Intentar reasignar una afiliación de Box A hacia Box B mediante UPDATE falla por WITH CHECK de RLS
    await expect(
      db.withBoxTransaction(boxAId, async (tx) => {
        await tx
          .update(afiliaciones)
          .set({ boxId: boxBId })
          .where(eq(afiliaciones.id, afiliacionAId));
      })
    ).rejects.toThrow(/row-level security policy/i);

    // Intentar insertar una afiliación para Box B dentro del contexto de Box A falla por RLS
    await expect(
      db.withBoxTransaction(boxAId, async (tx) => {
        await tx.insert(afiliaciones).values({
          boxId: boxBId,
          usuarioId: usuarioXId,
          roles: ["atleta"],
          activo: true
        });
      })
    ).rejects.toThrow(/row-level security policy/i);
  });

  it("con SET LOCAL app.usuario_id = UsuarioX devuelve exclusivamente las afiliaciones de UsuarioX y bloquea INSERT, UPDATE y DELETE sin app.box_id", async () => {
    const filasUsuarioX = await db.withUsuarioTransaction(
      usuarioXId,
      async (tx) => {
        return tx.select().from(afiliaciones);
      }
    );

    expect(filasUsuarioX).toHaveLength(1);
    expect(filasUsuarioX[0]?.usuarioId).toBe(usuarioXId);
    expect(filasUsuarioX[0]?.boxId).toBe(boxAId);

    // UPDATE y DELETE sin app.box_id afectan 0 filas por la política USING, e INSERT lanza error de WITH CHECK
    await expect(
      db.withUsuarioTransaction(usuarioXId, async (tx) => {
        const actualizadas = await tx
          .update(afiliaciones)
          .set({ activo: false })
          .where(eq(afiliaciones.id, afiliacionAId))
          .returning();
        expect(actualizadas).toHaveLength(0);

        const eliminadas = await tx
          .delete(afiliaciones)
          .where(eq(afiliaciones.id, afiliacionAId))
          .returning();
        expect(eliminadas).toHaveLength(0);

        await tx.insert(afiliaciones).values({
          boxId: boxAId,
          usuarioId: usuarioYId,
          roles: ["atleta"],
          activo: true
        });
      })
    ).rejects.toThrow(/row-level security policy/i);
  });

  it("opera en modo fail-closed (0 filas) fuera de una transacción con contexto y no filtra contexto entre conexiones del pool", async () => {
    await db.withBoxTransaction(boxAId, async (tx) => {
      const rows = await tx.select().from(afiliaciones);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    const filasSinContexto = await db.client.select().from(afiliaciones);
    expect(filasSinContexto).toEqual([]);
  });
});
