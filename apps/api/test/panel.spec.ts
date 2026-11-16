import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ResumenPanelSchema,
  calcularInstantesClase,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type Membresia,
  type Pago,
  type Plan,
  type Reserva
} from "@centris/shared";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const PASSWORD = "PasswordSegura123!";
const TIMEZONE_BA = "America/Argentina/Buenos_Aires";

const IDS = {
  boxA: "e0000000-0000-4000-8000-000000000131",
  boxB: "e0000000-0000-4000-8000-000000000132",
  usuarioAdminA: "e1000000-0000-4000-8000-000000000131",
  usuarioRecepA: "e1000000-0000-4000-8000-000000000132",
  usuarioCoachA: "e1000000-0000-4000-8000-000000000133",
  usuarioCoachMultiA: "e1000000-0000-4000-8000-000000000134",
  usuarioAtletaA: "e1000000-0000-4000-8000-000000000135",
  usuarioAdminB: "e1000000-0000-4000-8000-000000000136",
  usuarioAtletaB: "e1000000-0000-4000-8000-000000000137",
  afiliacionAdminA: "e2000000-0000-4000-8000-000000000131",
  afiliacionRecepA: "e2000000-0000-4000-8000-000000000132",
  afiliacionCoachA: "e2000000-0000-4000-8000-000000000133",
  afiliacionCoachMultiA: "e2000000-0000-4000-8000-000000000134",
  afiliacionAtletaA: "e2000000-0000-4000-8000-000000000135",
  afiliacionAdminB: "e2000000-0000-4000-8000-000000000136",
  afiliacionAtletaB: "e2000000-0000-4000-8000-000000000137",
  tipoClaseA: "e3000000-0000-4000-8000-000000000131",
  tipoClaseB: "e3000000-0000-4000-8000-000000000132",
  claseHoyCoachA: "e4000000-0000-4000-8000-000000000131",
  claseMananaA: "e4000000-0000-4000-8000-000000000132",
  clasePasadaPendienteA: "e4000000-0000-4000-8000-000000000133"
} as const;

describe("Seam 2 — Resumen del Panel Bento con RLS, Timezone y Roles (@centris/api)", () => {
  let api: ApiDePrueba;
  let tokenAdminA: string;
  let tokenRecepA: string;
  let tokenCoachA: string;
  let tokenCoachMultiA: string;
  let tokenAtletaA: string;
  let tokenAdminB: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxA, nombre: "Box Norte Panel" },
      { id: IDS.boxB, nombre: "Box Sur Panel" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminA,
        email: "admin.panel.a@test.centris.dev",
        nombre: "Admin Panel A",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioRecepA,
        email: "recep.panel.a@test.centris.dev",
        nombre: "Recep Panel A",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachA,
        email: "coach.panel.a@test.centris.dev",
        nombre: "Valentina Coach A",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachMultiA,
        email: "multi.panel.a@test.centris.dev",
        nombre: "Diego Multi A",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaA,
        email: "atleta.panel.a@test.centris.dev",
        nombre: "Nicolás Moroso A",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAdminB,
        email: "admin.panel.b@test.centris.dev",
        nombre: "Admin Panel B",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAtletaB,
        email: "atleta.panel.b@test.centris.dev",
        nombre: "Atleta B",
        contrasena: PASSWORD
      }
    ],
    afiliaciones: [
      {
        id: IDS.afiliacionAdminA,
        boxId: IDS.boxA,
        usuarioId: IDS.usuarioAdminA,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionRecepA,
        boxId: IDS.boxA,
        usuarioId: IDS.usuarioRecepA,
        roles: ["recepcionista"]
      },
      {
        id: IDS.afiliacionCoachA,
        boxId: IDS.boxA,
        usuarioId: IDS.usuarioCoachA,
        roles: ["coach"]
      },
      {
        id: IDS.afiliacionCoachMultiA,
        boxId: IDS.boxA,
        usuarioId: IDS.usuarioCoachMultiA,
        roles: ["coach", "recepcionista"]
      },
      {
        id: IDS.afiliacionAtletaA,
        boxId: IDS.boxA,
        usuarioId: IDS.usuarioAtletaA,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAdminB,
        boxId: IDS.boxB,
        usuarioId: IDS.usuarioAdminB,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionAtletaB,
        boxId: IDS.boxB,
        usuarioId: IDS.usuarioAtletaB,
        roles: ["atleta"]
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

    tokenAdminA = await login("admin.panel.a@test.centris.dev");
    tokenRecepA = await login("recep.panel.a@test.centris.dev");
    tokenCoachA = await login("coach.panel.a@test.centris.dev");
    tokenCoachMultiA = await login("multi.panel.a@test.centris.dev");
    tokenAtletaA = await login("atleta.panel.a@test.centris.dev");
    tokenAdminB = await login("admin.panel.b@test.centris.dev");

    const hoyBA = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaBA = sumarDiasAFecha(hoyBA, 1);
    const inicioMembresia = sumarDiasAFecha(hoyBA, -5);

    // 1. Planes y Membresías en Box A y Box B
    const planARes = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminA,
      boxId: IDS.boxA,
      body: {
        nombre: "Plan 3x Semana Panel",
        modalidadCreditos: "SEMANAL",
        duracionDias: 30,
        creditosPorPeriodo: 3,
        precioBase: 42000
      }
    });
    expect(planARes.status).toBe(201);

    const membARes = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminA,
      boxId: IDS.boxA,
      body: {
        afiliacionId: IDS.afiliacionAtletaA,
        planId: planARes.body.id,
        fechaInicio: inicioMembresia
      }
    });
    expect(membARes.status).toBe(201);

    // Pago válido de $15.000 + Pago anulado de $10.000 -> totalCobrado = 15000, deuda = 27000
    const pagoValidoA = await api.pedir<Pago>("/pagos", {
      method: "POST",
      token: tokenRecepA,
      boxId: IDS.boxA,
      body: {
        membresiaId: membARes.body.id,
        monto: 15000,
        medioPago: "TRANSFERENCIA",
        fechaPago: hoyBA
      }
    });
    expect(pagoValidoA.status).toBe(201);

    const pagoAnuladoA = await api.pedir<Pago>("/pagos", {
      method: "POST",
      token: tokenRecepA,
      boxId: IDS.boxA,
      body: {
        membresiaId: membARes.body.id,
        monto: 10000,
        medioPago: "EFECTIVO",
        fechaPago: hoyBA
      }
    });
    expect(pagoAnuladoA.status).toBe(201);

    const anulacionRes = await api.pedir<Pago>(
      `/pagos/${pagoAnuladoA.body.id}/anular`,
      {
        method: "POST",
        token: tokenAdminA,
        boxId: IDS.boxA,
        body: { motivoAnulacion: "Registro duplicado de prueba" }
      }
    );
    expect(anulacionRes.status).toBe(200);

    // Box B: Plan + Membresía + Pago por $99.000 (no debe filtrarse a Box A)
    const planBRes = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminB,
      boxId: IDS.boxB,
      body: {
        nombre: "Plan Sur Exclusivo",
        modalidadCreditos: "ILIMITADO",
        duracionDias: 30,
        creditosPorPeriodo: null,
        precioBase: 99000
      }
    });
    expect(planBRes.status).toBe(201);

    const membBRes = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminB,
      boxId: IDS.boxB,
      body: {
        afiliacionId: IDS.afiliacionAtletaB,
        planId: planBRes.body.id,
        fechaInicio: inicioMembresia
      }
    });
    expect(membBRes.status).toBe(201);

    const pagoBRes = await api.pedir<Pago>("/pagos", {
      method: "POST",
      token: tokenAdminB,
      boxId: IDS.boxB,
      body: {
        membresiaId: membBRes.body.id,
        monto: 99000,
        medioPago: "EFECTIVO",
        fechaPago: hoyBA
      }
    });
    expect(pagoBRes.status).toBe(201);

    // 2. Tipos de Clase y Clases reales en Box A
    await datos.consultar(
      `INSERT INTO tipos_clase (id, box_id, nombre, descripcion, activo)
       VALUES ($1, $2, 'WOD', 'Entrenamiento del día', true)`,
      [IDS.tipoClaseA, IDS.boxA]
    );

    // Clase hoy asignada al coach (futura respecto a ahora para poder reservar como Atleta)
    const ahoraMas2h = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const ahoraMas3h = new Date(Date.now() + 3 * 60 * 60 * 1000);
    // Clase recién finalizada (hace 1h) para probar ventana de asistencia 24h del Coach
    const finReciente = new Date(Date.now() - 60 * 60 * 1000);
    const inicioReciente = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const instantesManana = calcularInstantesClase({
      fechaLocal: mananaBA,
      horaInicio: "19:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await datos.consultar(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES
         ($1, $2, $3, $4, $5, $6, 20),
         ($7, $2, $3, $4, $8, $9, 10),
         ($10, $2, $3, $11, $12, $13, 15)`,
      [
        IDS.claseHoyCoachA,
        IDS.boxA,
        IDS.tipoClaseA,
        IDS.afiliacionCoachA,
        ahoraMas2h.toISOString(),
        ahoraMas3h.toISOString(),
        IDS.clasePasadaPendienteA,
        inicioReciente.toISOString(),
        finReciente.toISOString(),
        IDS.claseMananaA,
        IDS.afiliacionCoachMultiA,
        instantesManana.inicio.toISOString(),
        instantesManana.fin.toISOString()
      ]
    );

    // Reserva del atleta moroso en clase futura de hoy y en clase recién finalizada (sin asistencia aún)
    const reservaFutura = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaA,
      boxId: IDS.boxA,
      body: { claseId: IDS.claseHoyCoachA }
    });
    expect(reservaFutura.status).toBe(201);

    await datos.consultar(
      `INSERT INTO reservas (box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, 'CONFIRMADA')`,
      [
        IDS.boxA,
        IDS.clasePasadaPendienteA,
        IDS.afiliacionAtletaA,
        membARes.body.id,
        IDS.usuarioAtletaA
      ]
    );
  });

  afterAll(async () => {
    await datos.limpiar();
    await datos.cerrar();
    await api.cerrar();
  });

  it("Administrador recibe métricas reales aisladas de su Box (excluyendo pagos anulados y datos de Box B)", async () => {
    const res = await api.pedir("/panel/resumen", {
      token: tokenAdminA,
      boxId: IDS.boxA
    });

    expect(res.status).toBe(200);
    const parsed = ResumenPanelSchema.parse(res.body);

    expect(parsed.box.id).toBe(IDS.boxA);
    expect(parsed.gestion).not.toBeNull();
    expect(parsed.coach).toBeNull();
    expect(parsed.atleta).toBeNull();

    expect(parsed.gestion?.cobranzaMes.totalCobrado).toBe(15000);
    expect(parsed.gestion?.cobranzaMes.totalPendiente).toBe(27000);
    expect(parsed.gestion?.morosos.totalCantidad).toBe(1);
    expect(parsed.gestion?.morosos.totalDeuda).toBe(27000);
    expect(parsed.gestion?.morosos.top[0]).toMatchObject({
      afiliacionId: IDS.afiliacionAtletaA,
      nombre: "Nicolás Moroso A",
      deuda: 27000
    });
    expect(parsed.gestion?.ocupacionSemanal.dias).toHaveLength(7);
    expect(
      parsed.gestion?.ocupacionSemanal.dias.some((d) => d.esHoy)
    ).toBe(true);
    expect(parsed.gestion?.ocupacionSemanal.reservasSemana).toBeGreaterThanOrEqual(2);
    expect(parsed.gestion?.resumenOperativo.membresiasActivas).toBe(1);
  });

  it("Box B solo visualiza sus propias métricas financieras y operativas (RLS estricto)", async () => {
    const res = await api.pedir("/panel/resumen", {
      token: tokenAdminB,
      boxId: IDS.boxB
    });

    expect(res.status).toBe(200);
    const parsed = ResumenPanelSchema.parse(res.body);

    expect(parsed.box.id).toBe(IDS.boxB);
    expect(parsed.gestion?.cobranzaMes.totalCobrado).toBe(99000);
    expect(parsed.gestion?.cobranzaMes.totalPendiente).toBe(0);
    expect(parsed.gestion?.morosos.totalCantidad).toBe(0);
  });

  it("Coach exclusivo recibe agenda operativa y pendientes 24h sin ninguna cifra financiera", async () => {
    const res = await api.pedir("/panel/resumen", {
      token: tokenCoachA,
      boxId: IDS.boxA
    });

    expect(res.status).toBe(200);
    const parsed = ResumenPanelSchema.parse(res.body);

    expect(parsed.gestion).toBeNull();
    expect(parsed.atleta).toBeNull();
    expect(parsed.coach).not.toBeNull();
    expect(parsed.coach?.clasesPendientesAsistencia24h).toBeGreaterThanOrEqual(1);
    expect(parsed.coach?.atletasHoyACargo).toBeGreaterThanOrEqual(1);

    const jsonCrudo = JSON.stringify(res.body);
    expect(jsonCrudo).not.toContain("15000");
    expect(jsonCrudo).not.toContain("27000");
    expect(jsonCrudo).not.toContain("cobranzaMes");
    expect(jsonCrudo).not.toContain("morosos");
  });

  it("Atleta exclusivo recibe su membresía, créditos, saldo propio y próximas reservas sin datos de caja del Box", async () => {
    const res = await api.pedir("/panel/resumen", {
      token: tokenAtletaA,
      boxId: IDS.boxA
    });

    expect(res.status).toBe(200);
    const parsed = ResumenPanelSchema.parse(res.body);

    expect(parsed.gestion).toBeNull();
    expect(parsed.coach).toBeNull();
    expect(parsed.atleta).not.toBeNull();
    expect(parsed.atleta?.esMoroso).toBe(true);
    expect(parsed.atleta?.saldoPendienteTotal).toBe(27000);
    expect(parsed.atleta?.membresiaVigente?.planNombre).toBe("Plan 3x Semana Panel");
    expect(parsed.atleta?.membresiaVigente?.creditosDisponiblesPeriodo).toBeLessThan(3);
    expect(parsed.atleta?.proximasReservas.length).toBeGreaterThanOrEqual(1);
    expect(parsed.atleta?.proximasReservas[0]?.claseId).toBe(IDS.claseHoyCoachA);
  });

  it("Usuario con roles combinados ['coach', 'recepcionista'] recibe tanto gestión como agenda coach", async () => {
    const res = await api.pedir("/panel/resumen", {
      token: tokenCoachMultiA,
      boxId: IDS.boxA
    });

    expect(res.status).toBe(200);
    const parsed = ResumenPanelSchema.parse(res.body);

    expect(parsed.gestion).not.toBeNull();
    expect(parsed.coach).not.toBeNull();
    expect(parsed.atleta).toBeNull();
    expect(parsed.gestion?.cobranzaMes.totalCobrado).toBe(15000);
  });

  it("Recepcionista exclusivo recibe métricas de gestión sin agenda de Coach ni panel de Atleta", async () => {
    const res = await api.pedir("/panel/resumen", {
      token: tokenRecepA,
      boxId: IDS.boxA
    });

    expect(res.status).toBe(200);
    const parsed = ResumenPanelSchema.parse(res.body);

    expect(parsed.gestion).not.toBeNull();
    expect(parsed.coach).toBeNull();
    expect(parsed.atleta).toBeNull();
    expect(parsed.gestion?.morosos.totalDeuda).toBe(27000);
  });
});
