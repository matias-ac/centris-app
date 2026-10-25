import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { DatabaseService } from "../src/database/database.service.js";
import { afiliaciones } from "../src/database/schema/index.js";

const MIGRATION_URL =
  process.env.MIGRATION_DATABASE_URL ??
  "postgresql://centris_owner:centris_owner_pass@localhost:5432/centris_db";

describe("Seam 2 — Aislamiento PostgreSQL con FORCE ROW LEVEL SECURITY (DatabaseService)", () => {
  let db: DatabaseService;
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

    // Limpiar y sembrar escenario de aislamiento usando el rol propietario
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

    // UsuarioX sin password_hash (alta en mostrador) y UsuarioY con password_hash
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
    const diag = await db.obtenerDiagnosticoSalud(boxAId);

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

  it("con SET LOCAL app.box_id = BoxA devuelve exclusivamente filas de Box A y rechaza escrituras hacia Box B", async () => {
    const filasBoxA = await db.withBoxTransaction(boxAId, async (tx) => {
      return tx.select().from(afiliaciones);
    });

    expect(filasBoxA.length).toBeGreaterThanOrEqual(1);
    expect(filasBoxA.every((fila) => fila.boxId === boxAId)).toBe(true);
    expect(filasBoxA.some((fila) => fila.boxId === boxBId)).toBe(false);

    // Intentar insertar una afiliación para Box B dentro del contexto de Box A debe fallar por RLS
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

  it("con SET LOCAL app.usuario_id = UsuarioX devuelve exclusivamente las afiliaciones de UsuarioX y bloquea escrituras sin app.box_id", async () => {
    const filasUsuarioX = await db.withUsuarioTransaction(
      usuarioXId,
      async (tx) => {
        return tx.select().from(afiliaciones);
      }
    );

    expect(filasUsuarioX).toHaveLength(1);
    expect(filasUsuarioX[0]?.usuarioId).toBe(usuarioXId);
    expect(filasUsuarioX[0]?.boxId).toBe(boxAId);

    // Intentar modificar una afiliación teniendo solo app.usuario_id (sin app.box_id) debe ser bloqueado por RLS
    await expect(
      db.withUsuarioTransaction(usuarioXId, async (tx) => {
        await tx
          .update(afiliaciones)
          .set({ activo: false })
          .where(eq(afiliaciones.id, afiliacionAId));
        // Si la política USING de escritura filtra la fila o rechaza WITH CHECK, verificamos también INSERT
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
    // Ejecutamos primero una transacción válida con Box A
    await db.withBoxTransaction(boxAId, async (tx) => {
      const rows = await tx.select().from(afiliaciones);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    // Inmediatamente consultamos fuera de transacción sobre el mismo pool: debe devolver 0 filas (fail-closed)
    const filasSinContexto = await db.client.select().from(afiliaciones);
    expect(filasSinContexto).toEqual([]);
  });
});
