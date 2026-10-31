import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, type Horario, type TipoClase } from "@centris/shared";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "e0000000-0000-4000-8000-000000000081",
  boxSur: "e0000000-0000-4000-8000-000000000082",
  usuarioAdminNorte: "e1000000-0000-4000-8000-000000000081",
  usuarioRecepNorte: "e1000000-0000-4000-8000-000000000082",
  usuarioCoachNorte: "e1000000-0000-4000-8000-000000000083",
  usuarioAtletaNorte: "e1000000-0000-4000-8000-000000000084",
  usuarioAdminSur: "e1000000-0000-4000-8000-000000000085",
  usuarioCoachSur: "e1000000-0000-4000-8000-000000000086",
  afiliacionAdminNorte: "e2000000-0000-4000-8000-000000000081",
  afiliacionRecepNorte: "e2000000-0000-4000-8000-000000000082",
  afiliacionCoachNorte: "e2000000-0000-4000-8000-000000000083",
  afiliacionAtletaNorte: "e2000000-0000-4000-8000-000000000084",
  afiliacionAdminSur: "e2000000-0000-4000-8000-000000000085",
  afiliacionCoachSur: "e2000000-0000-4000-8000-000000000086"
} as const;

describe("Seam 2 — Horarios Recurrentes: CRUD, Validación de Coach y RLS en API (@centris/api)", () => {
  let api: ApiDePrueba;
  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachNorte: string;
  let tokenAtletaNorte: string;
  let tokenAdminSur: string;
  let tipoClaseNorteId: string;
  let tipoClaseSurId: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Horarios" },
      { id: IDS.boxSur, nombre: "Box Sur Horarios" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.horarios.norte@test.centris.dev",
        nombre: "Admin Horarios Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.horarios.norte@test.centris.dev",
        nombre: "Recep Horarios Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.horarios.norte@test.centris.dev",
        nombre: "Coach Horarios Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.horarios.norte@test.centris.dev",
        nombre: "Atleta Horarios Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.horarios.sur@test.centris.dev",
        nombre: "Admin Horarios Sur",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioCoachSur,
        email: "coach.horarios.sur@test.centris.dev",
        nombre: "Coach Horarios Sur",
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
        id: IDS.afiliacionCoachSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioCoachSur,
        roles: ["coach"]
      }
    ]
  });

  beforeAll(async () => {
    await datos.sembrar();
    api = await levantarApiDePrueba();

    async function login(email: string): Promise<string> {
      const resp = await api.pedir<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password: "PasswordSegura123!" }
      });
      return resp.body.accessToken;
    }

    tokenAdminNorte = await login("admin.horarios.norte@test.centris.dev");
    tokenRecepNorte = await login("recep.horarios.norte@test.centris.dev");
    tokenCoachNorte = await login("coach.horarios.norte@test.centris.dev");
    tokenAtletaNorte = await login("atleta.horarios.norte@test.centris.dev");
    tokenAdminSur = await login("admin.horarios.sur@test.centris.dev");

    // Crear tipos de clase base
    const tcNorte = await api.pedir<TipoClase>("/tipos-clase", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: { nombre: "WOD Norte", descripcion: "Clase WOD" }
    });
    tipoClaseNorteId = tcNorte.body.id;

    const tcSur = await api.pedir<TipoClase>("/tipos-clase", {
      method: "POST",
      token: tokenAdminSur,
      boxId: IDS.boxSur,
      body: { nombre: "WOD Sur", descripcion: "Clase Sur" }
    });
    tipoClaseSurId = tcSur.body.id;
  });

  afterAll(async () => {
    await api?.cerrar();
    await datos.cerrar();
  });

  it("permite al Administrador crear un Horario en hora local con coach del Box", async () => {
    const res = await api.pedir<Horario>("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachNorte,
        diaSemana: 1,
        horaInicio: "07:00",
        duracionMinutos: 60,
        cuposDefault: 16
      }
    });

    expect(res.status).toBe(201);
    expect(res.body.boxId).toBe(IDS.boxNorte);
    expect(res.body.tipoClaseId).toBe(tipoClaseNorteId);
    expect(res.body.coachAfiliacionId).toBe(IDS.afiliacionCoachNorte);
    expect(res.body.diaSemana).toBe(1);
    expect(res.body.horaInicio).toMatch(/^07:00(:00)?$/);
    expect(res.body.duracionMinutos).toBe(60);
    expect(res.body.cuposDefault).toBe(16);
    expect(res.body.activo).toBe(true);
  });

  it("rechaza la creación de Horario a Recepcionista, Coach y Atleta con 403 Forbidden", async () => {
    for (const token of [tokenRecepNorte, tokenCoachNorte, tokenAtletaNorte]) {
      const res = await api.pedir("/horarios", {
        method: "POST",
        token,
        boxId: IDS.boxNorte,
        body: {
          tipoClaseId: tipoClaseNorteId,
          coachAfiliacionId: IDS.afiliacionCoachNorte,
          diaSemana: 2,
          horaInicio: "08:00",
          duracionMinutos: 60,
          cuposDefault: 12
        }
      });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);
    }
  });

  it("rechaza asignar un coachAfiliacionId que no pertenece al Box o no posee el rol 'coach'", async () => {
    // 1. Afiliación del mismo box pero que solo es 'atleta'
    const resAtleta = await api.pedir("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionAtletaNorte,
        diaSemana: 3,
        horaInicio: "09:00",
        duracionMinutos: 60,
        cuposDefault: 10
      }
    });

    expect(resAtleta.status).toBe(400);
    expect(resAtleta.body.errorCode).toBe(ERROR_CODES.VALIDACION_FALLIDA);

    // 2. Afiliación de coach pero de OTRO Box (Box Sur)
    const resCoachSur = await api.pedir("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachSur,
        diaSemana: 3,
        horaInicio: "09:00",
        duracionMinutos: 60,
        cuposDefault: 10
      }
    });

    expect([400, 422, 500]).toContain(resCoachSur.status);
  });

  it("permite listar la grilla semanal ordenada por día y hora y aísla entre boxes con RLS", async () => {
    // Admin Norte crea otro Horario en día 1 a las 19:00 y en día 2 a las 08:00
    await api.pedir("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachNorte,
        diaSemana: 1,
        horaInicio: "19:00",
        duracionMinutos: 60,
        cuposDefault: 20
      }
    });

    await api.pedir("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachNorte,
        diaSemana: 2,
        horaInicio: "08:00",
        duracionMinutos: 60,
        cuposDefault: 15
      }
    });

    // Listar en Box Norte
    const resNorte = await api.pedir<Horario[]>("/horarios", {
      method: "GET",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });

    expect(resNorte.status).toBe(200);
    expect(resNorte.body.length).toBeGreaterThanOrEqual(3);

    // Verificar ordenamiento: día ascendente, hora ascendente
    for (let i = 0; i < resNorte.body.length - 1; i++) {
      const actual = resNorte.body[i];
      const siguiente = resNorte.body[i + 1];
      if (actual.diaSemana === siguiente.diaSemana) {
        expect(actual.horaInicio <= siguiente.horaInicio).toBe(true);
      } else {
        expect(actual.diaSemana < siguiente.diaSemana).toBe(true);
      }
    }

    // Listar en Box Sur: no debe ver los horarios de Box Norte
    const resSur = await api.pedir<Horario[]>("/horarios", {
      method: "GET",
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });

    expect(resSur.status).toBe(200);
    expect(resSur.body.every((h) => h.boxId === IDS.boxSur)).toBe(true);
    expect(resSur.body.some((h) => h.coachAfiliacionId === IDS.afiliacionCoachNorte)).toBe(false);
  });

  it("permite al Administrador editar y dar de baja lógica un Horario", async () => {
    const creada = await api.pedir<Horario>("/horarios", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        tipoClaseId: tipoClaseNorteId,
        coachAfiliacionId: IDS.afiliacionCoachNorte,
        diaSemana: 5,
        horaInicio: "10:00",
        duracionMinutos: 50,
        cuposDefault: 10
      }
    });

    // Editar
    const resEdit = await api.pedir<Horario>(`/horarios/${creada.body.id}`, {
      method: "PATCH",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        cuposDefault: 18,
        horaInicio: "10:30"
      }
    });
    expect(resEdit.status).toBe(200);
    expect(resEdit.body.cuposDefault).toBe(18);
    expect(resEdit.body.horaInicio).toMatch(/^10:30(:00)?$/);

    // Soft delete
    const resDelete = await api.pedir<void>(`/horarios/${creada.body.id}`, {
      method: "DELETE",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    expect(resDelete.status).toBe(200);

    // Ya no debe figurar en el listado activo
    const resList = await api.pedir<Horario[]>("/horarios", {
      method: "GET",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    expect(resList.body.some((h) => h.id === creada.body.id)).toBe(false);
  });
});
