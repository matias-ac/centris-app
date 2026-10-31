import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, type TipoClase } from "@centris/shared";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "e0000000-0000-4000-8000-000000000071",
  boxSur: "e0000000-0000-4000-8000-000000000072",
  usuarioAdminNorte: "e1000000-0000-4000-8000-000000000071",
  usuarioRecepNorte: "e1000000-0000-4000-8000-000000000072",
  usuarioCoachNorte: "e1000000-0000-4000-8000-000000000073",
  usuarioAtletaNorte: "e1000000-0000-4000-8000-000000000074",
  usuarioAdminSur: "e1000000-0000-4000-8000-000000000075",
  afiliacionAdminNorte: "e2000000-0000-4000-8000-000000000071",
  afiliacionRecepNorte: "e2000000-0000-4000-8000-000000000072",
  afiliacionCoachNorte: "e2000000-0000-4000-8000-000000000073",
  afiliacionAtletaNorte: "e2000000-0000-4000-8000-000000000074",
  afiliacionAdminSur: "e2000000-0000-4000-8000-000000000075"
} as const;

describe("Seam 2 — Tipos de Clase: CRUD, Soft Delete y Aislamiento RLS en API (@centris/api)", () => {
  let api: ApiDePrueba;
  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachNorte: string;
  let tokenAtletaNorte: string;
  let tokenAdminSur: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Tipos Clase" },
      { id: IDS.boxSur, nombre: "Box Sur Tipos Clase" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.tc.norte@test.centris.dev",
        nombre: "Admin TC Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.tc.norte@test.centris.dev",
        nombre: "Recep TC Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.tc.norte@test.centris.dev",
        nombre: "Coach TC Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.tc.norte@test.centris.dev",
        nombre: "Atleta TC Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.tc.sur@test.centris.dev",
        nombre: "Admin TC Sur",
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

    tokenAdminNorte = await login("admin.tc.norte@test.centris.dev");
    tokenRecepNorte = await login("recep.tc.norte@test.centris.dev");
    tokenCoachNorte = await login("coach.tc.norte@test.centris.dev");
    tokenAtletaNorte = await login("atleta.tc.norte@test.centris.dev");
    tokenAdminSur = await login("admin.tc.sur@test.centris.dev");
  });

  afterAll(async () => {
    await api?.cerrar();
    await datos.cerrar();
  });

  it("permite al Administrador crear un Tipo de Clase", async () => {
    const res = await api.pedir<TipoClase>("/tipos-clase", {
      method: "POST",
      token: tokenAdminNorte,
      body: {
        nombre: "WOD",
        descripcion: "Workout of the Day"
      }
    });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("WOD");
    expect(res.body.descripcion).toBe("Workout of the Day");
    expect(res.body.boxId).toBe(IDS.boxNorte);
    expect(res.body.activo).toBe(true);
  });

  it("rechaza la creación de Tipo de Clase a Recepcionista, Coach y Atleta con 403 Forbidden", async () => {
    for (const token of [tokenRecepNorte, tokenCoachNorte, tokenAtletaNorte]) {
      const res = await api.pedir("/tipos-clase", {
        method: "POST",
        token,
        body: {
          nombre: "Halterofilia",
          descripcion: "Levantamiento"
        }
      });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);
    }
  });

  it("permite listar los Tipos de Clase del Box activo y aísla entre boxes con RLS", async () => {
    // Admin Norte crea otro Tipo de Clase
    await api.pedir<TipoClase>("/tipos-clase", {
      method: "POST",
      token: tokenAdminNorte,
      body: {
        nombre: "Open Box",
        descripcion: "Entrenamiento libre"
      }
    });

    // Listado en Box Norte
    const resNorte = await api.pedir<TipoClase[]>("/tipos-clase", {
      method: "GET",
      token: tokenAdminNorte
    });
    expect(resNorte.status).toBe(200);
    expect(resNorte.body.some((tc) => tc.nombre === "WOD")).toBe(true);
    expect(resNorte.body.some((tc) => tc.nombre === "Open Box")).toBe(true);

    // Listado en Box Sur no debe ver los de Norte
    const resSur = await api.pedir<TipoClase[]>("/tipos-clase", {
      method: "GET",
      token: tokenAdminSur
    });
    expect(resSur.status).toBe(200);
    expect(resSur.body.some((tc) => tc.nombre === "WOD")).toBe(false);
    expect(resSur.body.some((tc) => tc.nombre === "Open Box")).toBe(false);
  });

  it("permite al Administrador editar y desactivar (soft delete) un Tipo de Clase", async () => {
    const creada = await api.pedir<TipoClase>("/tipos-clase", {
      method: "POST",
      token: tokenAdminNorte,
      body: {
        nombre: "Gimnasia",
        descripcion: "Skills de gimnásticos"
      }
    });

    // Editar
    const resEdit = await api.pedir<TipoClase>(`/tipos-clase/${creada.body.id}`, {
      method: "PATCH",
      token: tokenAdminNorte,
      body: {
        nombre: "Gymnastics Pro"
      }
    });
    expect(resEdit.status).toBe(200);
    expect(resEdit.body.nombre).toBe("Gymnastics Pro");

    // Soft delete
    const resDelete = await api.pedir<void>(`/tipos-clase/${creada.body.id}`, {
      method: "DELETE",
      token: tokenAdminNorte
    });
    expect(resDelete.status).toBe(200);

    // Ya no debe aparecer en el listado activo
    const resList = await api.pedir<TipoClase[]>("/tipos-clase", {
      method: "GET",
      token: tokenAdminNorte
    });
    expect(resList.body.some((tc) => tc.id === creada.body.id)).toBe(false);
  });
});
