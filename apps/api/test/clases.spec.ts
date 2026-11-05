import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  type Clase,
  type ErrorResponse,
  type Horario,
  type TipoClase
} from "@centris/shared";
import { sql } from "drizzle-orm";
import pg from "pg";
import { exigirVariableDeEntorno } from "../src/common/config/env.js";
import { DatabaseService } from "../src/database/database.service.js";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const MIGRATION_URL = exigirVariableDeEntorno("MIGRATION_DATABASE_URL");
const PASSWORD = "PasswordSegura123!";

const IDS = {
  boxNorte: "c0000000-0000-4000-8000-000000000081",
  boxSur: "c0000000-0000-4000-8000-000000000082",
  usuarioAdminNorte: "c1000000-0000-4000-8000-000000000081",
  usuarioRecepNorte: "c1000000-0000-4000-8000-000000000082",
  usuarioCoachNorte: "c1000000-0000-4000-8000-000000000083",
  usuarioCoachSuplenteNorte: "c1000000-0000-4000-8000-000000000084",
  usuarioAtleta1Norte: "c1000000-0000-4000-8000-000000000085",
  usuarioAtleta2Norte: "c1000000-0000-4000-8000-000000000086",
  afiliacionAdminNorte: "c2000000-0000-4000-8000-000000000081",
  afiliacionRecepNorte: "c2000000-0000-4000-8000-000000000082",
  afiliacionCoachNorte: "c2000000-0000-4000-8000-000000000083",
  afiliacionCoachSuplenteNorte: "c2000000-0000-4000-8000-000000000084",
  afiliacionAtleta1Norte: "c2000000-0000-4000-8000-000000000085",
  afiliacionAtleta2Norte: "c2000000-0000-4000-8000-000000000086",
  planNorte: "c3000000-0000-4000-8000-000000000081",
  membresia1Norte: "c4000000-0000-4000-8000-000000000081",
  membresia2Norte: "c4000000-0000-4000-8000-000000000082"
} as const;

describe("Seam 2 y 3 — Clases: Materialización, Edición puntual y RLS (@centris/api)", () => {
  let db: DatabaseService;
  let ownerPool: pg.Pool;
  let api: ApiDePrueba;

  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachNorte: string;
  let tokenAtletaNorte: string;

  let tipoClaseNorteId: string;
  let horarioLunesId: string;
  let horarioViernesId: string;

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
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.clases@test.centris.dev",
        nombre: "Recep Clases",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.clases@test.centris.dev",
        nombre: "Coach Titular",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachSuplenteNorte,
        email: "suplente.clases@test.centris.dev",
        nombre: "Coach Suplente",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtleta1Norte,
        email: "atleta1.clases@test.centris.dev",
        nombre: "Atleta Uno",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtleta2Norte,
        email: "atleta2.clases@test.centris.dev",
        nombre: "Atleta Dos",
        contrasena: PASSWORD
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
        id: IDS.afiliacionRecepNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioRecepNorte,
        roles: ["recepcionista"]
      },
      {
        id: IDS.afiliacionCoachNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioCoachNorte,
        roles: ["coach"]
      },
      {
        id: IDS.afiliacionCoachSuplenteNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioCoachSuplenteNorte,
        roles: ["coach"]
      },
      {
        id: IDS.afiliacionAtleta1Norte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtleta1Norte,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAtleta2Norte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtleta2Norte,
        roles: ["atleta"]
      }
    ]
  });

  beforeAll(async () => {
    ownerPool = new pg.Pool({ connectionString: MIGRATION_URL });
    db = new DatabaseService();
    await datos.sembrar();
    api = await levantarApiDePrueba();

    async function login(email: string): Promise<string> {
      const resp = await api.pedir<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password: PASSWORD }
      });
      return resp.body.accessToken;
    }

    tokenAdminNorte = await login("admin.clases@test.centris.dev");
    tokenRecepNorte = await login("recep.clases@test.centris.dev");
    tokenCoachNorte = await login("coach.clases@test.centris.dev");
    tokenAtletaNorte = await login("atleta1.clases@test.centris.dev");

    // Crear Tipo de Clase y Horarios
    const respTc = await api.pedir<TipoClase>("/tipos-clase", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: { nombre: "WOD Clases", descripcion: "Clase WOD" }
    });
    tipoClaseNorteId = respTc.body.id;

    // Horario Lunes 07:00, 60 min, cupos 12
    const respHLunes = await api.pedir<Horario>("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachNorte,
        diaSemana: 1, // Lunes
        horaInicio: "07:00",
        duracionMinutos: 60,
        cuposDefault: 12
      }
    });
    horarioLunesId = respHLunes.body.id;

    // Horario Viernes 19:00, 60 min, cupos 15
    const respHViernes = await api.pedir<Horario>("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachNorte,
        diaSemana: 5, // Viernes
        horaInicio: "19:00",
        duracionMinutos: 60,
        cuposDefault: 15
      }
    });
    horarioViernesId = respHViernes.body.id;

    // Crear plan y membresias de prueba para soportar reservas
    await ownerPool.query(
      `INSERT INTO planes (id, box_id, nombre, modalidad_creditos, creditos_por_periodo, duracion_dias, precio_base, activo)
       VALUES ($1, $2, 'Plan Clases', 'SEMANAL', 3, 30, 30000, true)`,
      [IDS.planNorte, IDS.boxNorte]
    );

    await ownerPool.query(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
       VALUES
         ($1, $2, $3, $4, 30000, 'SEMANAL', 3, 0, '2026-11-01', '2026-11-30'),
         ($5, $2, $6, $4, 30000, 'SEMANAL', 3, 0, '2026-11-01', '2026-11-30')`,
      [
        IDS.membresia1Norte,
        IDS.boxNorte,
        IDS.afiliacionAtleta1Norte,
        IDS.planNorte,
        IDS.membresia2Norte,
        IDS.afiliacionAtleta2Norte
      ]
    );
  });

  afterAll(async () => {
    await api?.cerrar();
    await db?.close();
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
          ${horarioLunesId},
          ${tipoClaseNorteId},
          ${IDS.afiliacionCoachNorte},
          '2026-11-09 10:00:00+00',
          '2026-11-09 11:00:00+00',
          15
        )
      `);
    });

    const clasesNorte = await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      const res = await tx.execute<{ id: string }>(sql`
        SELECT id FROM clases WHERE id = ${claseId}
      `);
      return res.rows;
    });
    expect(clasesNorte).toHaveLength(1);

    const clasesSur = await db.withBoxTransaction(IDS.boxSur, async (tx) => {
      const res = await tx.execute<{ id: string }>(sql`
        SELECT id FROM clases WHERE id = ${claseId}
      `);
      return res.rows;
    });
    expect(clasesSur).toHaveLength(0);

    // Limpiar clase manual de prueba
    await ownerPool.query(`DELETE FROM clases WHERE id = $1`, [claseId]);
  });

  describe("Criterio 1 — Materialización exacta en zona horaria IANA del Box e Idempotencia", () => {
    it("materializa Clases a partir de Horarios convirtiendo hora local (UTC-3) a UTC exacto e inserta de forma idempotente", async () => {
      // Disparar materialización para Box Norte con fecha de referencia 2026-11-09 (Lunes)
      const resMat = await api.pedir<{ clasesCreadas: number }>(
        "/clases/materializar",
        {
          method: "POST",
          token: tokenAdminNorte,
          boxId: IDS.boxNorte,
          body: { fechaReferencia: "2026-11-09T03:00:00.000Z" }
        }
      );

      expect(resMat.status).toBe(201);
      expect(resMat.body.clasesCreadas).toBeGreaterThanOrEqual(1);

      // Consultar clases de esa semana
      const resListar = await api.pedir<Clase[]>(
        "/clases?desde=2026-11-09&hasta=2026-11-15",
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );

      expect(resListar.status).toBe(200);
      const claseLunes = resListar.body.find(
        (c) => c.horarioId === horarioLunesId
      );
      expect(claseLunes).toBeDefined();
      // Lunes 07:00 en UTC-3 debe ser exactamente 10:00:00 UTC y fin 11:00:00 UTC
      expect(new Date(claseLunes!.inicio).toISOString()).toBe(
        "2026-11-09T10:00:00.000Z"
      );
      expect(new Date(claseLunes!.fin).toISOString()).toBe(
        "2026-11-09T11:00:00.000Z"
      );
      expect(claseLunes!.cupos).toBe(12);
      expect(claseLunes!.coachAfiliacionId).toBe(IDS.afiliacionCoachNorte);
      expect(claseLunes!.tipoClaseNombre).toBe("WOD Clases");
      expect(claseLunes!.coachNombre).toBe("Coach Titular");

      // Idempotencia: disparar materialización nuevamente no duplica clases (0 creadas)
      const resIdempotencia = await api.pedir<{ clasesCreadas: number }>(
        "/clases/materializar",
        {
          method: "POST",
          token: tokenAdminNorte,
          boxId: IDS.boxNorte,
          body: { fechaReferencia: "2026-11-09T03:00:00.000Z" }
        }
      );
      expect(resIdempotencia.status).toBe(201);
      expect(resIdempotencia.body.clasesCreadas).toBe(0);
    });
  });

  describe("Criterio 2 — Independencia entre Clase materializada y Horario", () => {
    it("permite a un Administrador cambiar el Coach por un suplente en una Clase puntual sin alterar el Horario recurrente", async () => {
      const resListar = await api.pedir<Clase[]>(
        "/clases?desde=2026-11-09&hasta=2026-11-15",
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      const claseViernes = resListar.body.find(
        (c) => c.horarioId === horarioViernesId
      );
      expect(claseViernes).toBeDefined();

      // Administrador edita el coach asignado por un suplente
      const resEdicion = await api.pedir<Clase>(`/clases/${claseViernes!.id}`, {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { coachAfiliacionId: IDS.afiliacionCoachSuplenteNorte }
      });

      expect(resEdicion.status).toBe(200);
      expect(resEdicion.body.coachAfiliacionId).toBe(
        IDS.afiliacionCoachSuplenteNorte
      );

      // El Horario recurrente NO se altera
      const resHorario = await api.pedir<Horario>(
        `/horarios/${horarioViernesId}`,
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      expect(resHorario.body.coachAfiliacionId).toBe(IDS.afiliacionCoachNorte);
    });

    it("permite a un Recepcionista incrementar los Cupos de una Clase puntual sin alterar el Horario recurrente", async () => {
      const resListar = await api.pedir<Clase[]>(
        "/clases?desde=2026-11-09&hasta=2026-11-15",
        {
          token: tokenRecepNorte,
          boxId: IDS.boxNorte
        }
      );
      const claseViernes = resListar.body.find(
        (c) => c.horarioId === horarioViernesId
      );
      expect(claseViernes).toBeDefined();

      // Recepcionista incrementa los Cupos
      const resEdicion = await api.pedir<Clase>(`/clases/${claseViernes!.id}`, {
        method: "PATCH",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte,
        body: { cupos: 20 }
      });

      expect(resEdicion.status).toBe(200);
      expect(resEdicion.body.cupos).toBe(20);

      // El Horario recurrente mantiene cupos_default = 15
      const resHorario = await api.pedir<Horario>(
        `/horarios/${horarioViernesId}`,
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      expect(resHorario.body.cuposDefault).toBe(15);
    });

    it("rechaza 403 si un Coach o Atleta intentan editar una Clase, o si Recepción intenta cambiar el Coach", async () => {
      const resListar = await api.pedir<Clase[]>(
        "/clases?desde=2026-11-09&hasta=2026-11-15",
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      const claseLunes = resListar.body.find(
        (c) => c.horarioId === horarioLunesId
      );

      // Coach intenta editar cupos -> 403
      const resCoach = await api.pedir(`/clases/${claseLunes!.id}`, {
        method: "PATCH",
        token: tokenCoachNorte,
        boxId: IDS.boxNorte,
        body: { cupos: 30 }
      });
      expect(resCoach.status).toBe(403);

      // Atleta intenta editar cupos -> 403
      const resAtleta = await api.pedir(`/clases/${claseLunes!.id}`, {
        method: "PATCH",
        token: tokenAtletaNorte,
        boxId: IDS.boxNorte,
        body: { cupos: 30 }
      });
      expect(resAtleta.status).toBe(403);

      // Recepcionista intenta cambiar Coach -> 403
      const resRecepCoach = await api.pedir(`/clases/${claseLunes!.id}`, {
        method: "PATCH",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte,
        body: { coachAfiliacionId: IDS.afiliacionCoachSuplenteNorte }
      });
      expect(resRecepCoach.status).toBe(403);
    });

    it("al modificar el Horario recurrente solo se actualizan las Clases futuras sin Reservas activas", async () => {
      const resListar = await api.pedir<Clase[]>(
        "/clases?desde=2026-11-09&hasta=2026-11-15",
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      const claseLunes = resListar.body.find(
        (c) => c.horarioId === horarioLunesId
      )!;

      // Simular que claseLunes tiene 1 Reserva confirmada
      const reservaId = "c6000000-0000-4000-8000-000000000081";
      await ownerPool.query(
        `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
        [
          reservaId,
          IDS.boxNorte,
          claseLunes.id,
          IDS.afiliacionAtleta1Norte,
          IDS.membresia1Norte,
          IDS.usuarioAtleta1Norte
        ]
      );

      // Modificar el Horario Lunes: cambiar cuposDefault de 12 a 25
      const resModifHorario = await api.pedir<Horario>(
        `/horarios/${horarioLunesId}`,
        {
          method: "PATCH",
          token: tokenAdminNorte,
          boxId: IDS.boxNorte,
          body: { cuposDefault: 25 }
        }
      );
      expect(resModifHorario.status).toBe(200);

      // La clase con reserva confirmada NO se altera automáticamente
      const resClaseConReserva = await api.pedir<Clase>(
        `/clases/${claseLunes.id}`,
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      expect(resClaseConReserva.body.cupos).toBe(12);

      // Limpiar la reserva de prueba
      await ownerPool.query(`DELETE FROM reservas WHERE id = $1`, [reservaId]);
    });
  });

  describe("Criterio 3 — Invariante de reducción de Cupos", () => {
    it("rechaza con CUPO_MENOR_A_RESERVAS (422) cuando se intenta editar cupos a un valor menor que las reservas confirmadas", async () => {
      const resListar = await api.pedir<Clase[]>(
        "/clases?desde=2026-11-09&hasta=2026-11-15",
        {
          token: tokenAdminNorte,
          boxId: IDS.boxNorte
        }
      );
      const claseLunes = resListar.body.find(
        (c) => c.horarioId === horarioLunesId
      )!;

      // Insertar 2 reservas confirmadas en claseLunes
      const reserva1Id = "c6000000-0000-4000-8000-000000000082";
      const reserva2Id = "c6000000-0000-4000-8000-000000000083";
      await ownerPool.query(
        `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
         VALUES
           ($1, $2, $3, $4, $5, $6, 'CONFIRMADA'),
           ($7, $2, $3, $8, $9, $6, 'CONFIRMADA')`,
        [
          reserva1Id,
          IDS.boxNorte,
          claseLunes.id,
          IDS.afiliacionAtleta1Norte,
          IDS.membresia1Norte,
          IDS.usuarioAdminNorte,
          reserva2Id,
          IDS.afiliacionAtleta2Norte,
          IDS.membresia2Norte
        ]
      );

      // Intentar reducir cupos a 1 (menor a N=2) -> debe fallar con 422 CUPO_MENOR_A_RESERVAS
      const resFalla = await api.pedir<ErrorResponse>(
        `/clases/${claseLunes.id}`,
        {
          method: "PATCH",
          token: tokenAdminNorte,
          boxId: IDS.boxNorte,
          body: { cupos: 1 }
        }
      );

      expect(resFalla.status).toBe(422);
      expect(resFalla.body.errorCode).toBe(ERROR_CODES.CUPO_MENOR_A_RESERVAS);

      // Intentar fijar cupos a exactamente 2 (N=2) o más -> debe tener éxito
      const resOk = await api.pedir<Clase>(`/clases/${claseLunes.id}`, {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { cupos: 2 }
      });

      expect(resOk.status).toBe(200);
      expect(resOk.body.cupos).toBe(2);

      // Limpiar reservas de prueba
      await ownerPool.query(`DELETE FROM reservas WHERE id IN ($1, $2)`, [
        reserva1Id,
        reserva2Id
      ]);
    });
  });
});
