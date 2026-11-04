import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import pg from "pg";
import { exigirVariableDeEntorno } from "../src/common/config/env.js";
import { DatabaseService } from "../src/database/database.service.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const MIGRATION_URL = exigirVariableDeEntorno("MIGRATION_DATABASE_URL");

const IDS = {
  boxNorte: "c0000000-0000-4000-8000-000000000081",
  boxSur: "c0000000-0000-4000-8000-000000000082",
  usuarioAdminNorte: "c1000000-0000-4000-8000-000000000081",
  usuarioCoachNorte: "c1000000-0000-4000-8000-000000000082",
  usuarioAtletaNorte: "c1000000-0000-4000-8000-000000000083",
  afiliacionAdminNorte: "c2000000-0000-4000-8000-000000000081",
  afiliacionCoachNorte: "c2000000-0000-4000-8000-000000000082",
  afiliacionAtletaNorte: "c2000000-0000-4000-8000-000000000083",
  tipoClaseNorte: "c3000000-0000-4000-8000-000000000081",
  horarioNorte: "c4000000-0000-4000-8000-000000000081"
} as const;

describe("Seam 2 — Clases: Esquema en PostgreSQL y RLS Forzado (@centris/api)", () => {
  let db: DatabaseService;
  let ownerPool: pg.Pool;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Clases" },
      { id: IDS.boxSur, nombre: "Box Sur Clases" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.clases@test.centris.dev",
        nombre: "Admin Clases",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.clases@test.centris.dev",
        nombre: "Coach Clases",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.clases@test.centris.dev",
        nombre: "Atleta Clases",
        contrasena: "PasswordSegura123!"
      }
    ],
    afiliaciones: [
      {
        id: IDS.afiliacionAdminNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAdminNorte,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionCoachNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioCoachNorte,
        roles: ["coach"]
      },
      {
        id: IDS.afiliacionAtletaNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtletaNorte,
        roles: ["atleta"]
      }
    ]
  });

  beforeAll(async () => {
    ownerPool = new pg.Pool({ connectionString: MIGRATION_URL });
    db = new DatabaseService();
    await datos.sembrar();

    await ownerPool.query(
      `INSERT INTO tipos_clase (id, box_id, nombre, descripcion, activo)
       VALUES ($1, $2, 'CrossFit', 'Clase funcional', true)`,
      [IDS.tipoClaseNorte, IDS.boxNorte]
    );

    await ownerPool.query(
      `INSERT INTO horarios (id, box_id, tipo_clase_id, coach_afiliacion_id, dia_semana, hora_inicio, duracion_minutos, cupos_default, activo)
       VALUES ($1, $2, $3, $4, 1, '07:00', 60, 15, true)`,
      [
        IDS.horarioNorte,
        IDS.boxNorte,
        IDS.tipoClaseNorte,
        IDS.afiliacionCoachNorte
      ]
    );
  });

  afterAll(async () => {
    await db.close();
    await datos.cerrar();
    await ownerPool.end();
  });

  it("verifica FORCE ROW LEVEL SECURITY en las tablas operativas 'clases' y 'reservas'", async () => {
    const rlsResult = await ownerPool.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('clases', 'reservas')
      ORDER BY c.relname
    `);

    expect(rlsResult.rows).toHaveLength(2);
    for (const fila of rlsResult.rows) {
      expect(fila.relrowsecurity).toBe(true);
      expect(fila.relforcerowsecurity).toBe(true);
    }
  });

  it("garantiza aislamiento RLS: Box A no puede ver ni modificar Clases de Box B", async () => {
    const claseId = "c5000000-0000-4000-8000-000000000081";

    await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      await tx.execute(sql`
        INSERT INTO clases (id, box_id, horario_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
        VALUES (
          ${claseId},
          ${IDS.boxNorte},
          ${IDS.horarioNorte},
          ${IDS.tipoClaseNorte},
          ${IDS.afiliacionCoachNorte},
          '2026-11-09 10:00:00+00',
          '2026-11-09 11:00:00+00',
          15
        )
      `);
    });

    // Desde Box Norte la clase es visible
    const clasesNorte = await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      const res = await tx.execute<{ id: string }>(sql`
        SELECT id FROM clases WHERE id = ${claseId}
      `);
      return res.rows;
    });
    expect(clasesNorte).toHaveLength(1);
    expect(clasesNorte[0]?.id).toBe(claseId);

    // Desde Box Sur la clase de Box Norte es completamente invisible (0 filas)
    const clasesSur = await db.withBoxTransaction(IDS.boxSur, async (tx) => {
      const res = await tx.execute<{ id: string }>(sql`
        SELECT id FROM clases WHERE id = ${claseId}
      `);
      return res.rows;
    });
    expect(clasesSur).toHaveLength(0);

    // Intentar insertar una clase de Box Sur estando en el contexto de Box Norte viola RLS WITH CHECK
    await expect(
      db.withBoxTransaction(IDS.boxNorte, async (tx) => {
        await tx.execute(sql`
          INSERT INTO clases (box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
          VALUES (
            ${IDS.boxSur},
            ${IDS.tipoClaseNorte},
            ${IDS.afiliacionCoachNorte},
            '2026-11-09 10:00:00+00',
            '2026-11-09 11:00:00+00',
            15
          )
        `);
      })
    ).rejects.toThrow(/row-level security policy/i);
  });
});
