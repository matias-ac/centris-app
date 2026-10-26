import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ERROR_CODES, type Plan } from "@centris/shared";
import { DatabaseService } from "../src/database/database.service.js";
import { planes } from "../src/database/schema/index.js";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "e0000000-0000-4000-8000-000000000001",
  boxSur: "e0000000-0000-4000-8000-000000000002",
  usuarioAdminNorte: "e1000000-0000-4000-8000-000000000001",
  usuarioRecepNorte: "e1000000-0000-4000-8000-000000000002",
  usuarioCoachNorte: "e1000000-0000-4000-8000-000000000003",
  usuarioAtletaNorte: "e1000000-0000-4000-8000-000000000004",
  usuarioAdminSur: "e1000000-0000-4000-8000-000000000005",
  afiliacionAdminNorte: "e2000000-0000-4000-8000-000000000001",
  afiliacionRecepNorte: "e2000000-0000-4000-8000-000000000002",
  afiliacionCoachNorte: "e2000000-0000-4000-8000-000000000003",
  afiliacionAtletaNorte: "e2000000-0000-4000-8000-000000000004",
  afiliacionAdminSur: "e2000000-0000-4000-8000-000000000005"
} as const;

describe("Seam 2 — Catálogo de Planes: Aislamiento RLS en PostgreSQL y Autorización por Rol en API", () => {
  let api: ApiDePrueba;
  let db: DatabaseService;
  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachNorte: string;
  let tokenAtletaNorte: string;
  let tokenAdminSur: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Planes" },
      { id: IDS.boxSur, nombre: "Box Sur Planes" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.norte@test.centris.dev",
        nombre: "Admin Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.norte@test.centris.dev",
        nombre: "Recep Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.norte@test.centris.dev",
        nombre: "Coach Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.norte@test.centris.dev",
        nombre: "Atleta Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.sur@test.centris.dev",
        nombre: "Admin Sur",
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
    db = new DatabaseService();
    await datos.sembrar();
    api = await levantarApiDePrueba();

    // Obtener tokens de autenticación
    async function login(email: string): Promise<string> {
      const resp = await api.pedir<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password: "PasswordSegura123!" }
      });
      return resp.body.accessToken;
    }

    tokenAdminNorte = await login("admin.norte@test.centris.dev");
    tokenRecepNorte = await login("recep.norte@test.centris.dev");
    tokenCoachNorte = await login("coach.norte@test.centris.dev");
    tokenAtletaNorte = await login("atleta.norte@test.centris.dev");
    tokenAdminSur = await login("admin.sur@test.centris.dev");
  });

  afterAll(async () => {
    await api?.cerrar();
    await datos.cerrar();
  });

  it("Criterio 4: garantiza aislamiento RLS estricto entre Boxes y fail-closed fuera de transacción", async () => {
    // 1. Crear un plan directamente en Box Norte y otro en Box Sur
    const planNorteId = "f0000000-0000-4000-8000-000000000001";
    const planSurId = "f0000000-0000-4000-8000-000000000002";

    await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      await tx.insert(planes).values({
        id: planNorteId,
        boxId: IDS.boxNorte,
        nombre: "Plan Norte RLS",
        precioBase: 30000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: 3,
        activo: true
      });
    });

    await db.withBoxTransaction(IDS.boxSur, async (tx) => {
      await tx.insert(planes).values({
        id: planSurId,
        boxId: IDS.boxSur,
        nombre: "Plan Sur RLS",
        precioBase: 45000,
        duracionDias: 30,
        modalidadCreditos: "ILIMITADO",
        creditosPorPeriodo: null,
        activo: true
      });
    });

    // 2. Transacción en Box Norte ve únicamente planes de Box Norte
    const filasNorte = await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      return tx.select().from(planes);
    });
    expect(filasNorte.some((p) => p.id === planNorteId)).toBe(true);
    expect(filasNorte.some((p) => p.id === planSurId)).toBe(false);
    expect(filasNorte.every((p) => p.boxId === IDS.boxNorte)).toBe(true);

    // 3. Transacción en Box Sur ve únicamente planes de Box Sur
    const filasSur = await db.withBoxTransaction(IDS.boxSur, async (tx) => {
      return tx.select().from(planes);
    });
    expect(filasSur.some((p) => p.id === planSurId)).toBe(true);
    expect(filasSur.some((p) => p.id === planNorteId)).toBe(false);
    expect(filasSur.every((p) => p.boxId === IDS.boxSur)).toBe(true);

    // 4. Fuera de una transacción con contexto RLS opera en modo fail-closed (0 filas)
    const sinContexto = await db.client.select().from(planes);
    expect(sinContexto).toEqual([]);

    // 5. Intentar insertar un plan para Box Sur desde una transacción de Box Norte falla por WITH CHECK de RLS
    await expect(
      db.withBoxTransaction(IDS.boxNorte, async (tx) => {
        await tx.insert(planes).values({
          boxId: IDS.boxSur,
          nombre: "Plan Infiltrado",
          precioBase: 1000,
          duracionDias: 30,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null,
          activo: true
        });
      })
    ).rejects.toThrow(/row-level security policy/i);
  });

  it("Criterio 3: Administrador crea, edita y da de baja lógica un Plan en su Box", async () => {
    // 1. Administrador crea un plan SEMANAL
    const respCreacion = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "3 Clases por Semana",
        precioBase: 35000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: 3
      }
    });

    expect(respCreacion.status).toBe(201);
    expect(respCreacion.body.nombre).toBe("3 Clases por Semana");
    expect(respCreacion.body.precioBase).toBe(35000);
    expect(respCreacion.body.modalidadCreditos).toBe("SEMANAL");
    expect(respCreacion.body.creditosPorPeriodo).toBe(3);
    expect(respCreacion.body.activo).toBe(true);
    expect(respCreacion.body.boxId).toBe(IDS.boxNorte);

    const planId = respCreacion.body.id;

    // 2. Administrador edita el plan
    const respEdicion = await api.pedir<Plan>(`/planes/${planId}`, {
      method: "PATCH",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Pase 3x Semana Actualizado",
        precioBase: 38000
      }
    });

    expect(respEdicion.status).toBe(200);
    expect(respEdicion.body.nombre).toBe("Pase 3x Semana Actualizado");
    expect(respEdicion.body.precioBase).toBe(38000);

    // 3. Administrador lista planes del Box Norte y verifica que figure el actualizado
    const respListado = await api.pedir<Plan[]>("/planes", {
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    expect(respListado.status).toBe(200);
    const encontrado = respListado.body.find((p) => p.id === planId);
    expect(encontrado).toBeDefined();
    expect(encontrado?.nombre).toBe("Pase 3x Semana Actualizado");

    // 4. Administrador da de baja lógica (Soft Delete)
    const respBaja = await api.pedir<{ success: boolean; id: string }>(
      `/planes/${planId}`,
      {
        method: "DELETE",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(respBaja.status).toBe(200);
    expect(respBaja.body.success).toBe(true);

    // 5. El plan dado de baja lógica ya no aparece en el listado activo
    const respPostBaja = await api.pedir<Plan[]>("/planes", {
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    const buscadoPostBaja = respPostBaja.body.find((p) => p.id === planId);
    expect(buscadoPostBaja).toBeUndefined();
  });

  it("Criterio 3: Recepcionista lista planes activos para venta pero recibe 403 Forbidden al crear, editar o eliminar", async () => {
    // 1. Crear un plan activo y uno inactivo en Box Norte
    const planActivoId = "f1000000-0000-4000-8000-000000000001";
    const planInactivoId = "f1000000-0000-4000-8000-000000000002";

    await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      await tx.insert(planes).values([
        {
          id: planActivoId,
          boxId: IDS.boxNorte,
          nombre: "Plan Activo Para Recepción",
          precioBase: 25000,
          duracionDias: 30,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null,
          activo: true
        },
        {
          id: planInactivoId,
          boxId: IDS.boxNorte,
          nombre: "Plan Desactivado",
          precioBase: 20000,
          duracionDias: 30,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null,
          activo: false
        }
      ]);
    });

    // 2. Recepcionista lista planes: solo ve los activos (para vender)
    const respListadoRecep = await api.pedir<Plan[]>("/planes", {
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(respListadoRecep.status).toBe(200);
    expect(respListadoRecep.body.some((p) => p.id === planActivoId)).toBe(true);
    expect(respListadoRecep.body.some((p) => p.id === planInactivoId)).toBe(
      false
    );

    // 3. Recepcionista intenta crear un plan -> 403 Forbidden
    const respCrear = await api.pedir("/planes", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Plan Prohibido",
        precioBase: 10000,
        duracionDias: 30,
        modalidadCreditos: "ILIMITADO"
      }
    });
    expect(respCrear.status).toBe(403);
    expect(respCrear.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // 4. Recepcionista intenta editar un plan -> 403 Forbidden
    const respEditar = await api.pedir(`/planes/${planActivoId}`, {
      method: "PATCH",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: { nombre: "Intento Edición" }
    });
    expect(respEditar.status).toBe(403);
    expect(respEditar.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // 5. Recepcionista intenta eliminar un plan -> 403 Forbidden
    const respEliminar = await api.pedir(`/planes/${planActivoId}`, {
      method: "DELETE",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(respEliminar.status).toBe(403);
    expect(respEliminar.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);
  });

  it("Criterio 3: Coach y Atleta reciben 403 Forbidden al intentar acceder al catálogo", async () => {
    // Coach recibe 403
    const respCoach = await api.pedir("/planes", {
      token: tokenCoachNorte,
      boxId: IDS.boxNorte
    });
    expect(respCoach.status).toBe(403);
    expect(respCoach.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // Atleta recibe 403
    const respAtleta = await api.pedir("/planes", {
      token: tokenAtletaNorte,
      boxId: IDS.boxNorte
    });
    expect(respAtleta.status).toBe(403);
    expect(respAtleta.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);
  });

  it("Aislamiento en API: Admin de Box Sur no puede listar ni mutar planes de Box Norte", async () => {
    // 1. Obtener listado de Box Sur
    const respSur = await api.pedir<Plan[]>("/planes", {
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });
    expect(respSur.status).toBe(200);
    // Ningún plan retornado pertenece a Box Norte
    expect(respSur.body.every((p) => p.boxId === IDS.boxSur)).toBe(true);

    // 2. Admin Sur intenta editar un plan existente de Box Norte -> 404 No Encontrado (oculto por RLS)
    const planNorteId = "f0000000-0000-4000-8000-000000000001";
    const respEditarAjeno = await api.pedir(`/planes/${planNorteId}`, {
      method: "PATCH",
      token: tokenAdminSur,
      boxId: IDS.boxSur,
      body: { nombre: "Intento Ataque Tenant" }
    });
    expect(respEditarAjeno.status).toBe(404);
  });
});
