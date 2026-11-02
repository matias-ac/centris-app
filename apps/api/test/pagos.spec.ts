import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, type Pago } from "@centris/shared";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "f0000000-0000-4000-8000-000000000001",
  boxSur: "f0000000-0000-4000-8000-000000000002",
  usuarioAdminNorte: "f1000000-0000-4000-8000-000000000001",
  usuarioRecepNorte: "f1000000-0000-4000-8000-000000000002",
  usuarioCoachNorte: "f1000000-0000-4000-8000-000000000003",
  usuarioAtletaNorte: "f1000000-0000-4000-8000-000000000004",
  usuarioAdminSur: "f1000000-0000-4000-8000-000000000005",
  afiliacionAdminNorte: "f2000000-0000-4000-8000-000000000001",
  afiliacionRecepNorte: "f2000000-0000-4000-8000-000000000002",
  afiliacionCoachNorte: "f2000000-0000-4000-8000-000000000003",
  afiliacionAtletaNorte: "f2000000-0000-4000-8000-000000000004",
  afiliacionAdminSur: "f2000000-0000-4000-8000-000000000005"
} as const;

const PASSWORD = "PasswordSegura123!";

describe("Seam 2 — Pagos Inmutables, Anulaciones y Reporte de Morosos (@centris/api)", () => {
  let api: ApiDePrueba;
  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachNorte: string;
  let tokenAtletaNorte: string;
  let tokenAdminSur: string;

  let planNorteId: string;
  let membresiaNorteId: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Caja" },
      { id: IDS.boxSur, nombre: "Box Sur Caja" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.caja.norte@test.centris.dev",
        nombre: "Admin Caja Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.caja.norte@test.centris.dev",
        nombre: "Recep Caja Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.caja.norte@test.centris.dev",
        nombre: "Coach Caja Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.caja.norte@test.centris.dev",
        nombre: "Atleta Caja Norte",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.caja.sur@test.centris.dev",
        nombre: "Admin Caja Sur",
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
        body: { email, password: PASSWORD }
      });
      return resp.body.accessToken;
    }

    tokenAdminNorte = await login("admin.caja.norte@test.centris.dev");
    tokenRecepNorte = await login("recep.caja.norte@test.centris.dev");
    tokenCoachNorte = await login("coach.caja.norte@test.centris.dev");
    tokenAtletaNorte = await login("atleta.caja.norte@test.centris.dev");
    tokenAdminSur = await login("admin.caja.sur@test.centris.dev");

    // Crear un plan de $30.000 en Box Norte
    const respPlan = await api.pedir<{ id: string }>("/planes", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Plan Mensual Test 30k",
        descripcion: "Plan para pruebas de caja",
        precioBase: 30000,
        duracionDias: 30,
        modalidadCreditos: "ILIMITADO"
      }
    });
    expect(respPlan.status).toBe(201);
    planNorteId = respPlan.body.id;

    // Asignar membresía al atleta en Box Norte
    const respMembresia = await api.pedir<{ id: string }>("/membresias", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: IDS.afiliacionAtletaNorte,
        planId: planNorteId,
        fechaInicio: "2026-11-01"
      }
    });
    expect(respMembresia.status).toBe(201);
    membresiaNorteId = respMembresia.body.id;
  });

  afterAll(async () => {
    await api.cerrar();
    await datos.cerrar();
  });

  it("1. Atleta recién creado con membresía de $30.000 figura como Moroso con saldo de $30.000", async () => {
    const resp = await api.pedir<Array<{ totalDeuda: number; afiliacionId: string }>>(
      "/pagos/morosos",
      {
        method: "GET",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte
      }
    );

    expect(resp.status).toBe(200);
    const moroso = resp.body.find((m) => m.afiliacionId === IDS.afiliacionAtletaNorte);
    expect(moroso).toBeDefined();
    expect(moroso?.totalDeuda).toBe(30000);
  });

  it("2. Recepcionista registra dos pagos parciales ($15.000 y $10.000); el saldo resultante es $5.000", async () => {
    // Primer pago: $15.000 en EFECTIVO
    const pago1 = await api.pedir<Pago>("/pagos", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        membresiaId: membresiaNorteId,
        monto: 15000,
        medioPago: "EFECTIVO",
        fechaPago: "2026-11-02"
      }
    });
    expect(pago1.status).toBe(201);
    expect(pago1.body.monto).toBe(15000);
    expect(pago1.body.medioPago).toBe("EFECTIVO");
    expect(pago1.body.anuladoEn).toBeNull();

    // Segundo pago: $10.000 por TRANSFERENCIA
    const pago2 = await api.pedir<Pago>("/pagos", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        membresiaId: membresiaNorteId,
        monto: 10000,
        medioPago: "TRANSFERENCIA",
        fechaPago: "2026-11-02"
      }
    });
    expect(pago2.status).toBe(201);
    expect(pago2.body.monto).toBe(10000);

    // Consultar estado de cuenta / pagos de la membresía
    const consulta = await api.pedir<{
      pagos: Pago[];
      precio: number;
      totalPagado: number;
      saldo: number;
      esMoroso: boolean;
    }>(`/pagos/membresia/${membresiaNorteId}`, {
      method: "GET",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });

    expect(consulta.status).toBe(200);
    expect(consulta.body.pagos).toHaveLength(2);
    expect(consulta.body.totalPagado).toBe(25000);
    expect(consulta.body.saldo).toBe(5000);
    expect(consulta.body.esMoroso).toBe(true);
  });

  it("3. Recepcionista no tiene permiso para anular un pago (403 Forbidden)", async () => {
    const listado = await api.pedir<{ pagos: Pago[] }>(
      `/pagos/membresia/${membresiaNorteId}`,
      {
        method: "GET",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte
      }
    );
    const pagoId = listado.body.pagos[0]!.id;

    const intentoAnulacion = await api.pedir(`/pagos/${pagoId}/anular`, {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        motivoAnulacion: "Intento por recepcionista"
      }
    });

    expect(intentoAnulacion.status).toBe(403);
  });

  it("4. Administrador anula el segundo pago ($10.000); el saldo recalculado pasa a ser $15.000", async () => {
    const listado = await api.pedir<{ pagos: Pago[] }>(
      `/pagos/membresia/${membresiaNorteId}`,
      {
        method: "GET",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    const pago10k = listado.body.pagos.find((p) => p.monto === 10000);
    expect(pago10k).toBeDefined();

    const anulacion = await api.pedir<Pago>(`/pagos/${pago10k!.id}/anular`, {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        motivoAnulacion: "Transferencia duplicada ingresada por error"
      }
    });

    expect(anulacion.status).toBe(200);
    expect(anulacion.body.anuladoEn).not.toBeNull();
    expect(anulacion.body.anuladoPorUsuarioId).toBe(IDS.usuarioAdminNorte);
    expect(anulacion.body.motivoAnulacion).toBe("Transferencia duplicada ingresada por error");

    // Saldo recalculado
    const consulta = await api.pedir<{
      totalPagado: number;
      saldo: number;
    }>(`/pagos/membresia/${membresiaNorteId}`, {
      method: "GET",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });

    expect(consulta.status).toBe(200);
    expect(consulta.body.totalPagado).toBe(15000);
    expect(consulta.body.saldo).toBe(15000);
  });

  it("5. Re-anulación de un pago ya anulado falla con 409 Conflict y PAGO_YA_ANULADO", async () => {
    const listado = await api.pedir<{ pagos: Pago[] }>(
      `/pagos/membresia/${membresiaNorteId}`,
      {
        method: "GET",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    const pagoAnulado = listado.body.pagos.find((p) => p.anuladoEn !== null);
    expect(pagoAnulado).toBeDefined();

    const reintento = await api.pedir<{ errorCode: string }>(
      `/pagos/${pagoAnulado!.id}/anular`,
      {
        method: "POST",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: {
          motivoAnulacion: "Otro motivo de anulación"
        }
      }
    );

    expect(reintento.status).toBe(409);
    expect(reintento.body.errorCode).toBe(ERROR_CODES.PAGO_YA_ANULADO);
  });

  it("6. Coach recibe 403 Forbidden en todas las operaciones financieras", async () => {
    // Intento de ver morosos
    const morosos = await api.pedir("/pagos/morosos", {
      method: "GET",
      token: tokenCoachNorte,
      boxId: IDS.boxNorte
    });
    expect(morosos.status).toBe(403);

    // Intento de registrar pago
    const registrar = await api.pedir("/pagos", {
      method: "POST",
      token: tokenCoachNorte,
      boxId: IDS.boxNorte,
      body: {
        membresiaId: membresiaNorteId,
        monto: 1000,
        medioPago: "EFECTIVO",
        fechaPago: "2026-11-02"
      }
    });
    expect(registrar.status).toBe(403);

    // Intento de ver pagos de membresía
    const verPagos = await api.pedir(`/pagos/membresia/${membresiaNorteId}`, {
      method: "GET",
      token: tokenCoachNorte,
      boxId: IDS.boxNorte
    });
    expect(verPagos.status).toBe(403);
  });

  it("7. Aislamiento RLS: Box Sur no puede ver pagos ni morosos de Box Norte", async () => {
    const resp = await api.pedir<Array<{ afiliacionId: string }>>("/pagos/morosos", {
      method: "GET",
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });
    expect(resp.status).toBe(200);
    const atletaNorte = resp.body.find((m) => m.afiliacionId === IDS.afiliacionAtletaNorte);
    expect(atletaNorte).toBeUndefined();

    // Box Sur intenta consultar la membresía de Box Norte
    const intentoConsulta = await api.pedir(`/pagos/membresia/${membresiaNorteId}`, {
      method: "GET",
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });
    expect(intentoConsulta.status).toBe(404);
  });
});
