import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  calcularInstantesClase,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type Clase,
  type ErrorResponse,
  type Membresia,
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
  boxNorte: "d0000000-0000-4000-8000-000000000091",
  boxSur: "d0000000-0000-4000-8000-000000000092",
  usuarioAdminNorte: "d1000000-0000-4000-8000-000000000091",
  usuarioCoachNorte: "d1000000-0000-4000-8000-000000000092",
  usuarioAdminSur: "d1000000-0000-4000-8000-000000000093",
  afiliacionAdminNorte: "d2000000-0000-4000-8000-000000000091",
  afiliacionCoachNorte: "d2000000-0000-4000-8000-000000000092",
  afiliacionAdminSur: "d2000000-0000-4000-8000-000000000093",
  tipoClaseNorte: "d3000000-0000-4000-8000-000000000091",
  tipoClaseSur: "d3000000-0000-4000-8000-000000000092"
} as const;

// 10 atletas para la prueba de concurrencia de Cupos (Criterio 1)
const ATLETAS_CONCURRENCIA = Array.from({ length: 10 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return {
    usuarioId: `d1100000-0000-4000-8000-0000000000${num}`,
    afiliacionId: `d2100000-0000-4000-8000-0000000000${num}`,
    email: `atleta.conc.${num}@test.centris.dev`,
    nombre: `Atleta Concurrencia ${num}`
  };
});

// Atletas dedicados para Criterios 2, 3 y 4
const ATLETA_CREDITOS = {
  usuarioId: "d1200000-0000-4000-8000-000000000001",
  afiliacionId: "d2200000-0000-4000-8000-000000000001",
  email: "atleta.creditos@test.centris.dev",
  nombre: "Atleta Un Credito"
};

const ATLETA_SOLAPAMIENTO = {
  usuarioId: "d1200000-0000-4000-8000-000000000002",
  afiliacionId: "d2200000-0000-4000-8000-000000000002",
  email: "atleta.solapado@test.centris.dev",
  nombre: "Atleta Solapamiento"
};

const ATLETA_TIMEZONE = {
  usuarioId: "d1200000-0000-4000-8000-000000000003",
  afiliacionId: "d2200000-0000-4000-8000-000000000003",
  email: "atleta.timezone@test.centris.dev",
  nombre: "Atleta Timezone Domingo"
};

const ATLETA_MOROSO = {
  usuarioId: "d1200000-0000-4000-8000-000000000004",
  afiliacionId: "d2200000-0000-4000-8000-000000000004",
  email: "atleta.moroso.res@test.centris.dev",
  nombre: "Atleta Moroso Sin Pagos"
};

describe("Seam 2 — Motor Transaccional de Reservas, Concurrencia, Timezone y RLS (@centris/api)", () => {
  let api: ApiDePrueba;
  let tokenAdminNorte: string;
  let tokenCoachNorte: string;
  let tokenAdminSur: string;
  const tokensAtletasConcurrencia: string[] = [];
  let tokenAtletaCreditos: string;
  let tokenAtletaSolapamiento: string;
  let tokenAtletaTimezone: string;
  let tokenAtletaMoroso: string;

  let planSemanal2Id: string;
  let planSemanal1Id: string;
  let planIlimitadoId: string;

  const todosLosAtletas = [
    ...ATLETAS_CONCURRENCIA,
    ATLETA_CREDITOS,
    ATLETA_SOLAPAMIENTO,
    ATLETA_TIMEZONE,
    ATLETA_MOROSO
  ];

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Reservas" },
      { id: IDS.boxSur, nombre: "Box Sur Reservas" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.reservas.norte@test.centris.dev",
        nombre: "Admin Norte Reservas",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.reservas.norte@test.centris.dev",
        nombre: "Coach Norte Reservas",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.reservas.sur@test.centris.dev",
        nombre: "Admin Sur Reservas",
        contrasena: PASSWORD
      },
      ...todosLosAtletas.map((a) => ({
        id: a.usuarioId,
        email: a.email,
        nombre: a.nombre,
        contrasena: PASSWORD
      }))
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
        id: IDS.afiliacionAdminSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioAdminSur,
        roles: ["administrador"]
      },
      ...todosLosAtletas.map((a) => ({
        id: a.afiliacionId,
        boxId: IDS.boxNorte,
        usuarioId: a.usuarioId,
        roles: ["atleta" as const]
      }))
    ]
  });

  async function login(email: string): Promise<string> {
    const res = await api.pedir<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: { email, password: PASSWORD }
    });
    expect(res.status).toBe(200);
    return res.body.accessToken;
  }

  async function insertarClaseDirecta(params: {
    boxId?: string;
    tipoClaseId?: string;
    coachAfiliacionId?: string;
    fechaLocal: string;
    horaInicio: string;
    duracionMinutos?: number;
    cupos: number;
  }): Promise<string> {
    const { inicio, fin } = calcularInstantesClase({
      fechaLocal: params.fechaLocal,
      horaInicio: params.horaInicio,
      duracionMinutos: params.duracionMinutos ?? 60,
      timezone: TIMEZONE_BA
    });
    const filas = await datos.consultar<{ id: string }>(
      `INSERT INTO clases (box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        params.boxId ?? IDS.boxNorte,
        params.tipoClaseId ?? IDS.tipoClaseNorte,
        params.coachAfiliacionId ?? IDS.afiliacionCoachNorte,
        inicio.toISOString(),
        fin.toISOString(),
        params.cupos
      ]
    );
    return filas[0]!.id;
  }

  beforeAll(async () => {
    await datos.sembrar();
    // Ampliar anticipacion_reserva_dias a 30 días en Box Norte para facilitar escenarios de semanas consecutivas
    await datos.consultar(
      `UPDATE boxes SET anticipacion_reserva_dias = 14 WHERE id = $1`,
      [IDS.boxNorte]
    );
    await datos.consultar(
      `INSERT INTO tipos_clase (id, box_id, nombre, descripcion, activo)
       VALUES ($1, $2, 'WOD CrossFit', 'Entrenamiento funcional', true),
              ($3, $4, 'WOD Sur', 'Entrenamiento Sur', true)`,
      [
        IDS.tipoClaseNorte,
        IDS.boxNorte,
        IDS.tipoClaseSur,
        IDS.boxSur
      ]
    );

    api = await levantarApiDePrueba();

    tokenAdminNorte = await login("admin.reservas.norte@test.centris.dev");
    tokenCoachNorte = await login("coach.reservas.norte@test.centris.dev");
    tokenAdminSur = await login("admin.reservas.sur@test.centris.dev");

    for (const atleta of ATLETAS_CONCURRENCIA) {
      tokensAtletasConcurrencia.push(await login(atleta.email));
    }
    tokenAtletaCreditos = await login(ATLETA_CREDITOS.email);
    tokenAtletaSolapamiento = await login(ATLETA_SOLAPAMIENTO.email);
    tokenAtletaTimezone = await login(ATLETA_TIMEZONE.email);
    tokenAtletaMoroso = await login(ATLETA_MOROSO.email);

    // Crear Planes base en Box Norte
    const resPlan1 = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Plan 1x Semana",
        precioBase: 25000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: 1
      }
    });
    expect(resPlan1.status).toBe(201);
    planSemanal1Id = resPlan1.body.id;

    const resPlan2 = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Plan 2x Semana",
        precioBase: 35000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: 2
      }
    });
    expect(resPlan2.status).toBe(201);
    planSemanal2Id = resPlan2.body.id;

    const resPlanIlim = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Pase Libre",
        precioBase: 55000,
        duracionDias: 30,
        modalidadCreditos: "ILIMITADO",
        creditosPorPeriodo: null
      }
    });
    expect(resPlanIlim.status).toBe(201);
    planIlimitadoId = resPlanIlim.body.id;
  });

  afterAll(async () => {
    if (api) await api.cerrar();
    await datos.cerrar();
  });

  it("Criterio 1: Concurrencia de Cupos con bloqueo en orden canónico (Membresía -> Clase) confirma 1 y rechaza 9 con CUPO_AGOTADO", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

    // Asignar Membresía vigente a los 10 atletas
    for (const atleta of ATLETAS_CONCURRENCIA) {
      const resMem = await api.pedir<Membresia>("/membresias", {
        method: "POST",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: {
          afiliacionId: atleta.afiliacionId,
          planId: planSemanal2Id,
          fechaInicio: hoyLocal
        }
      });
      expect(resMem.status).toBe(201);
    }

    // Crear una Clase mañana con 1 solo Cupo libre
    const claseUnCupoId = await insertarClaseDirecta({
      fechaLocal: mananaLocal,
      horaInicio: "09:00",
      cupos: 1
    });

    // Disparar 10 peticiones simultáneas (Promise.all)
    const respuestas = await Promise.all(
      tokensAtletasConcurrencia.map((token) =>
        api.pedir<Reserva & ErrorResponse>("/reservas", {
          method: "POST",
          token,
          boxId: IDS.boxNorte,
          body: { claseId: claseUnCupoId }
        })
      )
    );

    const confirmadas = respuestas.filter((r) => r.status === 201);
    const rechazadas = respuestas.filter((r) => r.status === 409);

    expect(confirmadas).toHaveLength(1);
    expect(confirmadas[0]!.body.estado).toBe("CONFIRMADA");
    expect(rechazadas).toHaveLength(9);
    for (const rechazo of rechazadas) {
      expect(rechazo.body.errorCode).toBe(ERROR_CODES.CUPO_AGOTADO);
    }

    // Verificar en la grilla que reservasConfirmadas == clase.cupos == 1
    const resClase = await api.pedir<Clase>(`/clases/${claseUnCupoId}`, {
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    expect(resClase.status).toBe(200);
    expect(resClase.body.reservasConfirmadas).toBe(1);
    expect(resClase.body.cupos).toBe(1);
  });

  it("Criterio 2A: Concurrencia de Créditos del mismo Atleta serializa por Membresía y evita sobregiro de Créditos", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const diaClase = sumarDiasAFecha(hoyLocal, 1);

    // Atleta con Plan de 1 solo Crédito por semana
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_CREDITOS.afiliacionId,
        planId: planSemanal1Id,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);

    // Crear 5 Clases en distintos horarios no solapados del mismo día
    const horas = ["07:00", "09:00", "11:00", "15:00", "18:00"];
    const claseIds: string[] = [];
    for (const hora of horas) {
      claseIds.push(
        await insertarClaseDirecta({
          fechaLocal: diaClase,
          horaInicio: hora,
          cupos: 10
        })
      );
    }

    // El mismo Atleta dispara 5 peticiones simultáneas desde distintos dispositivos
    const respuestas = await Promise.all(
      claseIds.map((claseId) =>
        api.pedir<Reserva & ErrorResponse>("/reservas", {
          method: "POST",
          token: tokenAtletaCreditos,
          boxId: IDS.boxNorte,
          body: { claseId }
        })
      )
    );

    const confirmadas = respuestas.filter((r) => r.status === 201);
    const rechazadas = respuestas.filter((r) => r.status === 422);

    expect(confirmadas).toHaveLength(1);
    expect(rechazadas).toHaveLength(4);
    for (const rechazo of rechazadas) {
      expect(rechazo.body.errorCode).toBe(ERROR_CODES.SIN_CREDITOS_DISPONIBLES);
    }
  });

  it("Criterio 2B: Concurrencia de Clases superpuestas del mismo Atleta serializa por Membresía y rechaza con SUPERPOSICION_HORARIA", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const diaClase = sumarDiasAFecha(hoyLocal, 2);

    // Atleta con Pase Libre (créditos ilimitados) para aislar validación de superposición
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_SOLAPAMIENTO.afiliacionId,
        planId: planIlimitadoId,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);

    // Crear 5 Clases que se solapan entre sí (10:00 a 11:00 y 10:30 a 11:30)
    const horariosSolapados = ["10:00", "10:15", "10:30", "10:45", "10:00"];
    const claseIds: string[] = [];
    for (const hora of horariosSolapados) {
      claseIds.push(
        await insertarClaseDirecta({
          fechaLocal: diaClase,
          horaInicio: hora,
          duracionMinutos: 60,
          cupos: 15
        })
      );
    }

    const respuestas = await Promise.all(
      claseIds.map((claseId) =>
        api.pedir<Reserva & ErrorResponse>("/reservas", {
          method: "POST",
          token: tokenAtletaSolapamiento,
          boxId: IDS.boxNorte,
          body: { claseId }
        })
      )
    );

    const confirmadas = respuestas.filter((r) => r.status === 201);
    const rechazadas = respuestas.filter((r) => r.status === 409);

    expect(confirmadas).toHaveLength(1);
    expect(rechazadas).toHaveLength(4);
    for (const rechazo of rechazadas) {
      expect(rechazo.body.errorCode).toBe(ERROR_CODES.SUPERPOSICION_HORARIA);
    }
  });

  it("Criterio 3: Corte de Período semanal en timezone del Box (domingo 22:30 local = lunes 01:30 UTC) y consumo de creditos_extra sin renovación semanal", async () => {
    // Buscar el próximo domingo desde hoy en hora local de Buenos Aires
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    let cursor = hoyLocal;
    while (new Date(`${cursor}T00:00:00.000Z`).getUTCDay() !== 0) {
      cursor = sumarDiasAFecha(cursor, 1);
    }
    const domingoSemana1 = cursor;
    const lunesSemana2 = sumarDiasAFecha(domingoSemana1, 1);
    const martesSemana2 = sumarDiasAFecha(domingoSemana1, 2);
    const miercolesSemana2 = sumarDiasAFecha(domingoSemana1, 3);

    // Asignar Membresía SEMANAL de 1 crédito por semana, iniciando hoy
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_TIMEZONE.afiliacionId,
        planId: planSemanal1Id,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);
    const membresiaId = resMem.body.id;

    // 1. Clase el domingo a las 22:30 hora local de Buenos Aires (que en UTC ya es lunes 01:30Z)
    const claseDomingo2230Id = await insertarClaseDirecta({
      fechaLocal: domingoSemana1,
      horaInicio: "22:30",
      duracionMinutos: 60,
      cupos: 10
    });

    // El Atleta reserva la Clase del domingo 22:30 local -> consume el único crédito de la Semana 1
    const resDomingo = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaTimezone,
      boxId: IDS.boxNorte,
      body: { claseId: claseDomingo2230Id }
    });
    expect(resDomingo.status).toBe(201);

    // 2. Otra Clase ese mismo domingo más temprano (18:00 local):
    // Como ya consumió su 1 crédito semanal de Semana 1 (en la clase de las 22:30), debe fallar con SIN_CREDITOS_DISPONIBLES
    const claseDomingo1800Id = await insertarClaseDirecta({
      fechaLocal: domingoSemana1,
      horaInicio: "18:00",
      duracionMinutos: 60,
      cupos: 10
    });
    const resSinCreditoSem1 = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenAtletaTimezone,
      boxId: IDS.boxNorte,
      body: { claseId: claseDomingo1800Id }
    });
    expect(resSinCreditoSem1.status).toBe(422);
    expect(resSinCreditoSem1.body.errorCode).toBe(
      ERROR_CODES.SIN_CREDITOS_DISPONIBLES
    );

    // 3. Otorgar 1 credito_extra a la Membresía: ahora sí puede reservar la 2da clase de Semana 1 consumiendo de creditos_extra
    const resExtra = await api.pedir<Membresia>(
      `/membresias/${membresiaId}/creditos-extra`,
      {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { creditosExtra: 1 }
      }
    );
    expect(resExtra.status).toBe(200);

    const resConExtraSem1 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaTimezone,
      boxId: IDS.boxNorte,
      body: { claseId: claseDomingo1800Id }
    });
    expect(resConExtraSem1.status).toBe(201);

    // 4. En Semana 2 (lunes siguiente):
    // - La Clase del domingo 22:30 NO consumió el crédito de Semana 2 (fue imputada a Semana 1),
    //   por lo que el Atleta tiene su 1 crédito semanal renovado para el lunes de Semana 2.
    const claseLunesSem2Id = await insertarClaseDirecta({
      fechaLocal: lunesSemana2,
      horaInicio: "08:00",
      cupos: 10
    });
    const resLunesSem2 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaTimezone,
      boxId: IDS.boxNorte,
      body: { claseId: claseLunesSem2Id }
    });
    expect(resLunesSem2.status).toBe(201);

    // - Pero la bolsa creditos_extra (1) ya se usó en Semana 1 y NO se renueva en Semana 2:
    //   intentar reservar una 2da clase en Semana 2 debe ser rechazado con SIN_CREDITOS_DISPONIBLES.
    const claseMartesSem2Id = await insertarClaseDirecta({
      fechaLocal: martesSemana2,
      horaInicio: "08:00",
      cupos: 10
    });
    const resMartesSem2 = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenAtletaTimezone,
      boxId: IDS.boxNorte,
      body: { claseId: claseMartesSem2Id }
    });
    expect(resMartesSem2.status).toBe(422);
    expect(resMartesSem2.body.errorCode).toBe(
      ERROR_CODES.SIN_CREDITOS_DISPONIBLES
    );
    void miercolesSemana2;
  });

  it("Criterio 4: Acceso desacoplado del Pago permite reservar a un Atleta Moroso (Saldo > 0) y valida Anticipación, Vigencia y RLS", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

    // Asignar Membresía con Precio = 35000 y 0 Pagos (Saldo = 35000 -> Moroso)
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_MOROSO.afiliacionId,
        planId: planSemanal2Id,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);
    expect(resMem.body.precio).toBe(35000);

    const claseMananaId = await insertarClaseDirecta({
      fechaLocal: mananaLocal,
      horaInicio: "19:00",
      cupos: 10
    });

    // El Atleta Moroso reserva sin bloqueo alguno
    const resReservaMoroso = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaMoroso,
      boxId: IDS.boxNorte,
      body: { claseId: claseMananaId }
    });
    expect(resReservaMoroso.status).toBe(201);
    expect(resReservaMoroso.body.estado).toBe("CONFIRMADA");
    expect(resReservaMoroso.body.membresiaId).toBe(resMem.body.id);

    // Puede consultar sus propias Reservas
    const misReservas = await api.pedir<Reserva[]>("/reservas", {
      token: tokenAtletaMoroso,
      boxId: IDS.boxNorte
    });
    expect(misReservas.status).toBe(200);
    expect(misReservas.body).toHaveLength(1);
    expect(misReservas.body[0]!.claseId).toBe(claseMananaId);

    // Validación de Anticipación de Reserva (más allá de los 14 días configurados en Box Norte)
    const fechaLejana = sumarDiasAFecha(hoyLocal, 20);
    const claseFueraAnticipacionId = await insertarClaseDirecta({
      fechaLocal: fechaLejana,
      horaInicio: "19:00",
      cupos: 10
    });
    const resFueraAnticipacion = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenAtletaMoroso,
      boxId: IDS.boxNorte,
      body: { claseId: claseFueraAnticipacionId }
    });
    expect(resFueraAnticipacion.status).toBe(422);
    expect(resFueraAnticipacion.body.errorCode).toBe(
      ERROR_CODES.FUERA_DE_ANTICIPACION
    );

    // Aislamiento RLS: Box Sur no ve Reservas de Box Norte
    const reservasEnSur = await api.pedir<Reserva[]>("/reservas", {
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });
    expect(reservasEnSur.status).toBe(200);
    expect(reservasEnSur.body).toHaveLength(0);

    // Un Coach puro no puede crear Reservas
    const resPorCoach = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenCoachNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseMananaId,
        afiliacionId: ATLETA_MOROSO.afiliacionId
      }
    });
    expect(resPorCoach.status).toBe(403);
    expect(resPorCoach.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);
  });
});
