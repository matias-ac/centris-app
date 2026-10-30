import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, type Membresia, type Plan } from "@centris/shared";
import { DatabaseService } from "../src/database/database.service.js";
import { membresias, planes } from "../src/database/schema/index.js";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "b0000000-0000-4000-8000-000000000001",
  boxSur: "b0000000-0000-4000-8000-000000000002",
  usuarioAdminNorte: "b1000000-0000-4000-8000-000000000001",
  usuarioRecepNorte: "b1000000-0000-4000-8000-000000000002",
  usuarioAtletaNorte: "b1000000-0000-4000-8000-000000000003",
  usuarioAdminSur: "b1000000-0000-4000-8000-000000000004",
  usuarioAtletaSur: "b1000000-0000-4000-8000-000000000005",
  usuarioAtletaSolapamiento: "b1000000-0000-4000-8000-000000000006",
  usuarioAtletaAjustes: "b1000000-0000-4000-8000-000000000007",
  usuarioAtletaBaja: "b1000000-0000-4000-8000-000000000008",
  afiliacionAdminNorte: "b2000000-0000-4000-8000-000000000001",
  afiliacionRecepNorte: "b2000000-0000-4000-8000-000000000002",
  afiliacionAtletaNorte: "b2000000-0000-4000-8000-000000000003",
  afiliacionAdminSur: "b2000000-0000-4000-8000-000000000004",
  afiliacionAtletaSur: "b2000000-0000-4000-8000-000000000005",
  afiliacionAtletaSolapamiento: "b2000000-0000-4000-8000-000000000006",
  afiliacionAtletaAjustes: "b2000000-0000-4000-8000-000000000007",
  afiliacionAtletaBaja: "b2000000-0000-4000-8000-000000000008"
} as const;

const PASSWORD = "PasswordSegura123!";

describe("Seam 2 — Membresías: Vigencia, permisos por rol y aislamiento RLS en API", () => {
  let api: ApiDePrueba;
  let db: DatabaseService;
  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenAtletaNorte: string;
  let tokenAdminSur: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Membresías" },
      { id: IDS.boxSur, nombre: "Box Sur Membresías" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.norte@membresias.centris.dev",
        nombre: "Admin Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.norte@membresias.centris.dev",
        nombre: "Recep Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.norte@membresias.centris.dev",
        nombre: "Atleta Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.sur@membresias.centris.dev",
        nombre: "Admin Sur",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaSur,
        email: "atleta.sur@membresias.centris.dev",
        nombre: "Atleta Sur",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaSolapamiento,
        email: "atleta.solapamiento@membresias.centris.dev",
        nombre: "Atleta Solapamiento",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaAjustes,
        email: "atleta.ajustes@membresias.centris.dev",
        nombre: "Atleta Ajustes",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaBaja,
        email: "atleta.baja@membresias.centris.dev",
        nombre: "Atleta Baja",
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
        id: IDS.afiliacionAtletaNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtletaNorte,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAdminSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioAdminSur,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionAtletaSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioAtletaSur,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAtletaSolapamiento,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtletaSolapamiento,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAtletaAjustes,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtletaAjustes,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAtletaBaja,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtletaBaja,
        roles: ["atleta"]
      }
    ]
  });

  async function login(email: string): Promise<string> {
    const resp = await api.pedir<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: { email, password: PASSWORD }
    });
    return resp.body.accessToken;
  }

  async function crearPlan(
    token: string,
    boxId: string,
    plan: Record<string, unknown>
  ): Promise<Plan> {
    const resp = await api.pedir<Plan>("/planes", {
      method: "POST",
      token,
      boxId,
      body: plan
    });
    expect(resp.status).toBe(201);
    return resp.body;
  }

  beforeAll(async () => {
    db = new DatabaseService();
    await datos.sembrar();
    api = await levantarApiDePrueba();
    tokenAdminNorte = await login("admin.norte@membresias.centris.dev");
    tokenRecepNorte = await login("recep.norte@membresias.centris.dev");
    tokenAtletaNorte = await login("atleta.norte@membresias.centris.dev");
    tokenAdminSur = await login("admin.sur@membresias.centris.dev");
  });

  afterAll(async () => {
    await api?.cerrar();
    await datos.cerrar();
    await db?.close();
  });

  it("Criterio 1: la Membresía copia precio y condiciones del Plan, calcula fecha_fin y no cambia si el Plan se edita luego", async () => {
    const plan = await crearPlan(tokenAdminNorte, IDS.boxNorte, {
      nombre: "Pase 3 veces por semana",
      precioBase: 35000,
      duracionDias: 30,
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 3
    });

    const alta = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: IDS.afiliacionAtletaNorte,
        planId: plan.id,
        fechaInicio: "2026-11-01"
      }
    });

    expect(alta.status).toBe(201);
    expect(alta.body).toMatchObject({
      afiliacionId: IDS.afiliacionAtletaNorte,
      planId: plan.id,
      precio: 35000,
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 3,
      creditosExtra: 0,
      fechaInicio: "2026-11-01",
      fechaFin: "2026-11-30",
      bajaAnticipadaEn: null,
      bajaPorUsuarioId: null
    });

    // El Administrador modifica el Plan del catálogo después del alta.
    const edicion = await api.pedir<Plan>(`/planes/${plan.id}`, {
      method: "PATCH",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        precioBase: 99000,
        duracionDias: 60,
        modalidadCreditos: "VIGENCIA_TOTAL",
        creditosPorPeriodo: 10
      }
    });
    expect(edicion.status).toBe(200);

    const consulta = await api.pedir<Membresia[]>(
      `/membresias?afiliacionId=${IDS.afiliacionAtletaNorte}`,
      { token: tokenRecepNorte, boxId: IDS.boxNorte }
    );
    expect(consulta.status).toBe(200);
    expect(consulta.body).toHaveLength(1);
    expect(consulta.body[0]).toMatchObject({
      id: alta.body.id,
      precio: 35000,
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 3,
      fechaInicio: "2026-11-01",
      fechaFin: "2026-11-30"
    });
  });

  it("Criterio 2: rechaza Membresías con Vigencia solapada y acepta una Renovación futura contigua", async () => {
    const plan = await crearPlan(tokenAdminNorte, IDS.boxNorte, {
      nombre: "Pack mensual ilimitado",
      precioBase: 50000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO"
    });
    const asignar = (fechaInicio: string) =>
      api.pedir<Membresia & { errorCode?: string }>("/membresias", {
        method: "POST",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte,
        body: {
          afiliacionId: IDS.afiliacionAtletaSolapamiento,
          planId: plan.id,
          fechaInicio
        }
      });

    // Vigencia 01/11 al 30/11
    const vigente = await asignar("2026-11-01");
    expect(vigente.status).toBe(201);
    expect(vigente.body.fechaFin).toBe("2026-11-30");

    // 15/11 al 14/12 se solapa con la Vigencia anterior
    const solapada = await asignar("2026-11-15");
    expect(solapada.status).toBe(409);
    expect(solapada.body.errorCode).toBe(ERROR_CODES.MEMBRESIA_SUPERPUESTA);

    // Renovación con inicio el 01/12: Membresía futura sin solapamiento
    const renovacion = await asignar("2026-12-01");
    expect(renovacion.status).toBe(201);
    expect(renovacion.body).toMatchObject({
      fechaInicio: "2026-12-01",
      fechaFin: "2026-12-30"
    });

    const todas = await api.pedir<Membresia[]>(
      `/membresias?afiliacionId=${IDS.afiliacionAtletaSolapamiento}`,
      { token: tokenRecepNorte, boxId: IDS.boxNorte }
    );
    expect(todas.body.map((m) => m.fechaInicio)).toEqual([
      "2026-11-01",
      "2026-12-01"
    ]);
  });

  it("Criterio 3: Recepción y Administración ajustan creditos_extra; solo el Administrador ajusta el Precio o ejecuta la Baja Anticipada", async () => {
    const plan = await crearPlan(tokenAdminNorte, IDS.boxNorte, {
      nombre: "Pase 2 veces por semana",
      precioBase: 28000,
      duracionDias: 30,
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 2
    });
    const alta = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: IDS.afiliacionAtletaAjustes,
        planId: plan.id,
        fechaInicio: "2026-11-01"
      }
    });
    expect(alta.status).toBe(201);
    const ruta = `/membresias/${alta.body.id}`;
    const ajustar = (
      token: string,
      sufijo: string,
      body: unknown,
      method = "PATCH"
    ) =>
      api.pedir<Membresia>(`${ruta}${sufijo}`, {
        method,
        token,
        boxId: IDS.boxNorte,
        body
      });

    // creditos_extra: bolsa para toda la Vigencia, permitida a Recepción y Administración
    const porRecepcion = await ajustar(tokenRecepNorte, "/creditos-extra", {
      creditosExtra: 2
    });
    expect(porRecepcion.status).toBe(200);
    expect(porRecepcion.body.creditosExtra).toBe(2);
    expect(porRecepcion.body.creditosPorPeriodo).toBe(2);

    const porAdministrador = await ajustar(tokenAdminNorte, "/creditos-extra", {
      creditosExtra: 5
    });
    expect(porAdministrador.status).toBe(200);
    expect(porAdministrador.body.creditosExtra).toBe(5);

    const porAtleta = await ajustar(tokenAtletaNorte, "/creditos-extra", {
      creditosExtra: 10
    });
    expect(porAtleta.status).toBe(403);

    // Precio y Baja Anticipada: exclusivos del Administrador
    const precioPorRecepcion = await ajustar(tokenRecepNorte, "/precio", {
      precio: 0
    });
    expect(precioPorRecepcion.status).toBe(403);

    const bajaPorRecepcion = await ajustar(
      tokenRecepNorte,
      "/baja-anticipada",
      { fechaFin: "2026-11-15" },
      "POST"
    );
    expect(bajaPorRecepcion.status).toBe(403);

    const becaPorAdministrador = await ajustar(tokenAdminNorte, "/precio", {
      precio: 0
    });
    expect(becaPorAdministrador.status).toBe(200);
    expect(becaPorAdministrador.body.precio).toBe(0);

    // Sin alteraciones indebidas: la Vigencia no cambió por los intentos denegados
    const final = await api.pedir<Membresia[]>(
      `/membresias?afiliacionId=${IDS.afiliacionAtletaAjustes}`,
      { token: tokenAdminNorte, boxId: IDS.boxNorte }
    );
    expect(final.body[0]).toMatchObject({
      creditosExtra: 5,
      precio: 0,
      fechaFin: "2026-11-30",
      bajaAnticipadaEn: null
    });
  });

  it("Criterio 4: la Baja Anticipada del Administrador acorta la Vigencia y registra quién y cuándo", async () => {
    const plan = await crearPlan(tokenAdminNorte, IDS.boxNorte, {
      nombre: "Pase libre mensual",
      precioBase: 40000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO"
    });
    const alta = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: IDS.afiliacionAtletaBaja,
        planId: plan.id,
        fechaInicio: "2026-11-01"
      }
    });
    expect(alta.status).toBe(201);
    expect(alta.body.fechaFin).toBe("2026-11-30");

    const darDeBaja = (fechaFin: string) =>
      api.pedir<Membresia>(`/membresias/${alta.body.id}/baja-anticipada`, {
        method: "POST",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { fechaFin }
      });

    // La Baja solo puede acortar la Vigencia, sin quedar antes del inicio
    expect((await darDeBaja("2026-12-10")).status).toBe(400);
    expect((await darDeBaja("2026-10-31")).status).toBe(400);

    const baja = await darDeBaja("2026-11-15");
    expect(baja.status).toBe(200);
    expect(baja.body).toMatchObject({
      id: alta.body.id,
      fechaInicio: "2026-11-01",
      fechaFin: "2026-11-15",
      bajaPorUsuarioId: IDS.usuarioAdminNorte
    });
    expect(baja.body.bajaAnticipadaEn).not.toBeNull();

    // La Vigencia liberada admite una nueva Membresía desde el día siguiente
    const nueva = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: IDS.afiliacionAtletaBaja,
        planId: plan.id,
        fechaInicio: "2026-11-16"
      }
    });
    expect(nueva.status).toBe(201);
  });

  it("Aislamiento RLS: el Box Sur no ve, edita ni asigna Membresías del Box Norte y PostgreSQL lo garantiza", async () => {
    const planNorte = await crearPlan(tokenAdminNorte, IDS.boxNorte, {
      nombre: "Plan Norte aislamiento",
      precioBase: 30000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO"
    });
    const planSur = await crearPlan(tokenAdminSur, IDS.boxSur, {
      nombre: "Plan Sur aislamiento",
      precioBase: 31000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO"
    });
    const altaNorte = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: IDS.afiliacionAtletaNorte,
        planId: planNorte.id,
        fechaInicio: "2027-03-01"
      }
    });
    expect(altaNorte.status).toBe(201);
    const altaSur = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminSur,
      boxId: IDS.boxSur,
      body: {
        afiliacionId: IDS.afiliacionAtletaSur,
        planId: planSur.id,
        fechaInicio: "2027-03-01"
      }
    });
    expect(altaSur.status).toBe(201);

    // API: el Administrador del Box Sur no ve ni modifica la Membresía del Norte
    const listadoSur = await api.pedir<Membresia[]>("/membresias", {
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });
    expect(listadoSur.body.every((m) => m.boxId === IDS.boxSur)).toBe(true);
    expect(listadoSur.body.some((m) => m.id === altaNorte.body.id)).toBe(false);

    const edicionCruzada = await api.pedir(
      `/membresias/${altaNorte.body.id}/precio`,
      {
        method: "PATCH",
        token: tokenAdminSur,
        boxId: IDS.boxSur,
        body: { precio: 0 }
      }
    );
    expect(edicionCruzada.status).toBe(404);

    const asignacionCruzada = await api.pedir("/membresias", {
      method: "POST",
      token: tokenAdminSur,
      boxId: IDS.boxSur,
      body: {
        afiliacionId: IDS.afiliacionAtletaNorte,
        planId: planSur.id,
        fechaInicio: "2027-06-01"
      }
    });
    expect(asignacionCruzada.status).toBe(404);

    // PostgreSQL: RLS filtra por Box y falla cerrado fuera de una transacción con contexto
    const filasSur = await db.withBoxTransaction(IDS.boxSur, (tx) =>
      tx.select().from(membresias)
    );
    expect(filasSur.some((m) => m.id === altaNorte.body.id)).toBe(false);
    expect(filasSur.every((m) => m.boxId === IDS.boxSur)).toBe(true);
    expect(await db.client.select().from(membresias)).toEqual([]);

    // PostgreSQL: WITH CHECK de RLS impide insertar en otro Box
    await expect(
      db.withBoxTransaction(IDS.boxNorte, (tx) =>
        tx.insert(membresias).values({
          boxId: IDS.boxSur,
          afiliacionId: IDS.afiliacionAtletaSur,
          planId: planSur.id,
          precio: 1000,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null,
          fechaInicio: "2028-01-01",
          fechaFin: "2028-01-30"
        })
      )
    ).rejects.toThrow();

    // PostgreSQL: la FK compuesta (box_id, afiliacion_id) impide mezclar Boxes
    await expect(
      db.withBoxTransaction(IDS.boxSur, (tx) =>
        tx.insert(membresias).values({
          boxId: IDS.boxSur,
          afiliacionId: IDS.afiliacionAtletaNorte,
          planId: planSur.id,
          precio: 1000,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null,
          fechaInicio: "2028-01-01",
          fechaFin: "2028-01-30"
        })
      )
    ).rejects.toThrow();

    // PostgreSQL: la FK compuesta (box_id, plan_id) impide usar Planes de otro Box
    await expect(
      db.withBoxTransaction(IDS.boxSur, (tx) =>
        tx.insert(membresias).values({
          boxId: IDS.boxSur,
          afiliacionId: IDS.afiliacionAtletaSur,
          planId: planNorte.id,
          precio: 1000,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null,
          fechaInicio: "2028-02-01",
          fechaFin: "2028-02-28"
        })
      )
    ).rejects.toThrow();

    // Sanidad: el Plan del Norte sigue visible solo desde el Norte
    const planesSur = await db.withBoxTransaction(IDS.boxSur, (tx) =>
      tx.select().from(planes)
    );
    expect(planesSur.some((p) => p.id === planNorte.id)).toBe(false);
  });
});
