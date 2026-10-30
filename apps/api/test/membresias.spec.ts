import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Membresia, Plan } from "@centris/shared";
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
  afiliacionAdminNorte: "b2000000-0000-4000-8000-000000000001",
  afiliacionRecepNorte: "b2000000-0000-4000-8000-000000000002",
  afiliacionAtletaNorte: "b2000000-0000-4000-8000-000000000003",
  afiliacionAdminSur: "b2000000-0000-4000-8000-000000000004",
  afiliacionAtletaSur: "b2000000-0000-4000-8000-000000000005"
} as const;

const PASSWORD = "PasswordSegura123!";

describe("Seam 2 — Membresías: Vigencia, permisos por rol y aislamiento RLS en API", () => {
  let api: ApiDePrueba;
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
});
