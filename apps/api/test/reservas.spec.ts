import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  calcularInstantesClase,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type Clase,
  type ErrorResponse,
  type EstadoReserva,
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
  usuarioRecepNorte: "d1000000-0000-4000-8000-000000000094",
  afiliacionRecepNorte: "d2000000-0000-4000-8000-000000000094",
  usuarioCoachRecepNorte: "d1000000-0000-4000-8000-000000000095",
  afiliacionCoachRecepNorte: "d2000000-0000-4000-8000-000000000095",
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

// Atletas dedicados para Ticket 10 (Cancelaciones, 15/15 FCFS, Cancelación por Box con 10 inscriptos y Baja Anticipada)
const ATLETA_VENTANA = {
  usuarioId: "d1300000-0000-4000-8000-000000000001",
  afiliacionId: "d2300000-0000-4000-8000-000000000001",
  email: "atleta.ventana.t10@test.centris.dev",
  nombre: "Atleta Ventana Cancelacion"
};

const ATLETA_BAJA_CASCADA = {
  usuarioId: "d1300000-0000-4000-8000-000000000002",
  afiliacionId: "d2300000-0000-4000-8000-000000000002",
  email: "atleta.baja.t10@test.centris.dev",
  nombre: "Atleta Baja Anticipada Cascada"
};

const ATLETAS_FCFS_16 = Array.from({ length: 16 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return {
    usuarioId: `d1400000-0000-4000-8000-0000000000${num}`,
    afiliacionId: `d2400000-0000-4000-8000-0000000000${num}`,
    email: `atleta.fcfs.${num}@test.centris.dev`,
    nombre: `Atleta FCFS ${num}`
  };
});

const ATLETAS_CANCEL_BOX_10 = Array.from({ length: 10 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return {
    usuarioId: `d1500000-0000-4000-8000-0000000000${num}`,
    afiliacionId: `d2500000-0000-4000-8000-0000000000${num}`,
    email: `atleta.cancelbox.${num}@test.centris.dev`,
    nombre: `Atleta CancelBox ${num}`
  };
});

// Atletas dedicados para Ticket 11 (Walk-ins en Mostrador por Recepción y Administración)
const ATLETA_WALKIN_1 = {
  usuarioId: "d1600000-0000-4000-8000-000000000001",
  afiliacionId: "d2600000-0000-4000-8000-000000000001",
  email: "atleta.walkin.1@test.centris.dev",
  nombre: "Atleta Walkin Uno"
};

const ATLETA_WALKIN_2 = {
  usuarioId: "d1600000-0000-4000-8000-000000000002",
  afiliacionId: "d2600000-0000-4000-8000-000000000002",
  email: "atleta.walkin.2@test.centris.dev",
  nombre: "Atleta Walkin Dos"
};

const ATLETA_WALKIN_CUPO = {
  usuarioId: "d1600000-0000-4000-8000-000000000003",
  afiliacionId: "d2600000-0000-4000-8000-000000000003",
  email: "atleta.walkin.cupo@test.centris.dev",
  nombre: "Atleta Walkin Cupo"
};

const ATLETA_WALKIN_SIN_CRED = {
  usuarioId: "d1600000-0000-4000-8000-000000000004",
  afiliacionId: "d2600000-0000-4000-8000-000000000004",
  email: "atleta.walkin.sincred@test.centris.dev",
  nombre: "Atleta Walkin Sin Creditos"
};

// Atletas dedicados para Ticket 12 (Panel del Coach, Asistencia 24 hs y Consolidación de Ausencias)
const ATLETA_ASISTENCIA_1 = {
  usuarioId: "d1700000-0000-4000-8000-000000000001",
  afiliacionId: "d2700000-0000-4000-8000-000000000001",
  email: "atleta.asistencia.1@test.centris.dev",
  nombre: "Atleta Asistencia Uno"
};

const ATLETA_ASISTENCIA_2 = {
  usuarioId: "d1700000-0000-4000-8000-000000000002",
  afiliacionId: "d2700000-0000-4000-8000-000000000002",
  email: "atleta.asistencia.2@test.centris.dev",
  nombre: "Atleta Asistencia Dos"
};

const ATLETA_ASISTENCIA_3 = {
  usuarioId: "d1700000-0000-4000-8000-000000000003",
  afiliacionId: "d2700000-0000-4000-8000-000000000003",
  email: "atleta.asistencia.3@test.centris.dev",
  nombre: "Atleta Asistencia Tres"
};

describe("Seam 2 — Motor Transaccional de Reservas, Concurrencia, Timezone y RLS (@centris/api)", () => {
  let api: ApiDePrueba;
  let tokenAdminNorte: string;
  let tokenCoachNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachRecepNorte: string;
  let tokenAdminSur: string;
  const tokensAtletasConcurrencia: string[] = [];
  let tokenAtletaCreditos: string;
  let tokenAtletaSolapamiento: string;
  let tokenAtletaTimezone: string;
  let tokenAtletaMoroso: string;
  let tokenAtletaVentana: string;
  let tokenAtletaBajaCascada: string;
  const tokensAtletasFcfs16: string[] = [];
  const tokensAtletasCancelBox10: string[] = [];
  let tokenAtletaAsistencia1: string;

  let planSemanal2Id: string;
  let planSemanal1Id: string;
  let planIlimitadoId: string;
  let membresiaAsistencia1Id: string;
  let membresiaAsistencia2Id: string;

  const todosLosAtletas = [
    ...ATLETAS_CONCURRENCIA,
    ATLETA_CREDITOS,
    ATLETA_SOLAPAMIENTO,
    ATLETA_TIMEZONE,
    ATLETA_MOROSO,
    ATLETA_VENTANA,
    ATLETA_BAJA_CASCADA,
    ...ATLETAS_FCFS_16,
    ...ATLETAS_CANCEL_BOX_10,
    ATLETA_WALKIN_1,
    ATLETA_WALKIN_2,
    ATLETA_WALKIN_CUPO,
    ATLETA_WALKIN_SIN_CRED,
    ATLETA_ASISTENCIA_1,
    ATLETA_ASISTENCIA_2,
    ATLETA_ASISTENCIA_3
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
        id: IDS.usuarioRecepNorte,
        email: "recep.reservas.norte@test.centris.dev",
        nombre: "Recep Norte Reservas",
        contrasena: PASSWORD
      },
      {
        id: IDS.usuarioCoachRecepNorte,
        email: "coach.recep.reservas.norte@test.centris.dev",
        nombre: "Coach Recep Norte Reservas",
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
        id: IDS.afiliacionRecepNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioRecepNorte,
        roles: ["recepcionista"]
      },
      {
        id: IDS.afiliacionCoachRecepNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioCoachRecepNorte,
        roles: ["coach", "recepcionista"]
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

  async function insertarClaseEnInstante(params: {
    boxId?: string;
    tipoClaseId?: string;
    coachAfiliacionId?: string;
    inicio: Date;
    duracionMinutos?: number;
    cupos: number;
  }): Promise<string> {
    const fin = new Date(
      params.inicio.getTime() + (params.duracionMinutos ?? 60) * 60_000
    );
    const filas = await datos.consultar<{ id: string }>(
      `INSERT INTO clases (box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        params.boxId ?? IDS.boxNorte,
        params.tipoClaseId ?? IDS.tipoClaseNorte,
        params.coachAfiliacionId ?? IDS.afiliacionCoachNorte,
        params.inicio.toISOString(),
        fin.toISOString(),
        params.cupos
      ]
    );
    return filas[0]!.id;
  }

  async function insertarReservaDirecta(params: {
    boxId?: string;
    claseId: string;
    afiliacionId: string;
    membresiaId?: string;
    creadaPorUsuarioId?: string;
    estado?: EstadoReserva;
    asistenciaMarcadaEn?: Date | null;
    asistenciaPorUsuarioId?: string | null;
  }): Promise<string> {
    const filas = await datos.consultar<{ id: string }>(
      `INSERT INTO reservas (box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado, asistencia_marcada_en, asistencia_por_usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        params.boxId ?? IDS.boxNorte,
        params.claseId,
        params.afiliacionId,
        params.membresiaId ?? membresiaAsistencia1Id,
        params.creadaPorUsuarioId ?? IDS.usuarioAdminNorte,
        params.estado ?? "CONFIRMADA",
        params.asistenciaMarcadaEn ? params.asistenciaMarcadaEn.toISOString() : null,
        params.asistenciaPorUsuarioId ?? null
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
    tokenRecepNorte = await login("recep.reservas.norte@test.centris.dev");
    tokenCoachRecepNorte = await login("coach.recep.reservas.norte@test.centris.dev");
    tokenAdminSur = await login("admin.reservas.sur@test.centris.dev");

    for (const atleta of ATLETAS_CONCURRENCIA) {
      tokensAtletasConcurrencia.push(await login(atleta.email));
    }
    tokenAtletaCreditos = await login(ATLETA_CREDITOS.email);
    tokenAtletaSolapamiento = await login(ATLETA_SOLAPAMIENTO.email);
    tokenAtletaTimezone = await login(ATLETA_TIMEZONE.email);
    tokenAtletaMoroso = await login(ATLETA_MOROSO.email);
    tokenAtletaVentana = await login(ATLETA_VENTANA.email);
    tokenAtletaBajaCascada = await login(ATLETA_BAJA_CASCADA.email);
    for (const atleta of ATLETAS_FCFS_16) {
      tokensAtletasFcfs16.push(await login(atleta.email));
    }
    for (const atleta of ATLETAS_CANCEL_BOX_10) {
      tokensAtletasCancelBox10.push(await login(atleta.email));
    }
    tokenAtletaAsistencia1 = await login(ATLETA_ASISTENCIA_1.email);

    // Plan de 180 días para pruebas de Asistencia (Ticket 12)
    const resPlanLargo = await api.pedir<Plan>("/planes", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Pase Semestral Asistencias",
        precioBase: 120000,
        duracionDias: 180,
        modalidadCreditos: "ILIMITADO",
        creditosPorPeriodo: null
      }
    });
    expect(resPlanLargo.status).toBe(201);

    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const hace30Dias = sumarDiasAFecha(hoyLocal, -30);

    const resMemAsist1 = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_ASISTENCIA_1.afiliacionId,
        planId: resPlanLargo.body.id,
        fechaInicio: hace30Dias
      }
    });
    expect(resMemAsist1.status).toBe(201);
    membresiaAsistencia1Id = resMemAsist1.body.id;

    const resMemAsist2 = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_ASISTENCIA_2.afiliacionId,
        planId: resPlanLargo.body.id,
        fechaInicio: hace30Dias
      }
    });
    expect(resMemAsist2.status).toBe(201);
    membresiaAsistencia2Id = resMemAsist2.body.id;

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
  }, 30000);

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

  it("Ticket 10 — Criterio 1: Cancelación en término (125 min antes, ventana 120) pasa a CANCELADA y devuelve el Crédito; a los 90 min pasa a CANCELADA_TARDIA sin devolver el Crédito", async () => {
    await datos.consultar(
      `UPDATE boxes SET ventana_cancelacion_minutos = 120 WHERE id = $1`,
      [IDS.boxNorte]
    );

    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const ayerLocal = sumarDiasAFecha(hoyLocal, -1);

    // Atleta con Plan de 1 solo Crédito por semana
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_VENTANA.afiliacionId,
        planId: planSemanal1Id,
        fechaInicio: ayerLocal
      }
    });
    expect(resMem.status).toBe(201);

    // 1. Clase que inicia en 125 minutos (fuera de la ventana de 120 min)
    const inicio125Min = new Date(Date.now() + 125 * 60_000);
    const clase125MinId = await insertarClaseEnInstante({
      inicio: inicio125Min,
      duracionMinutos: 60,
      cupos: 10
    });

    const resReserva1 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaVentana,
      boxId: IDS.boxNorte,
      body: { claseId: clase125MinId }
    });
    expect(resReserva1.status).toBe(201);

    // Cancelar en término (125 min antes) -> CANCELADA, libera Cupo y devuelve Crédito
    const resCancelEnTermino = await api.pedir<Reserva>(
      `/reservas/${resReserva1.body.id}/cancelar`,
      {
        method: "POST",
        token: tokenAtletaVentana,
        boxId: IDS.boxNorte
      }
    );
    expect(resCancelEnTermino.status).toBe(200);
    expect(resCancelEnTermino.body.estado).toBe("CANCELADA");
    expect(resCancelEnTermino.body.canceladaEn).not.toBeNull();

    const claseTrasCancel1 = await api.pedir<Clase>(`/clases/${clase125MinId}`, {
      token: tokenAtletaVentana,
      boxId: IDS.boxNorte
    });
    expect(claseTrasCancel1.body.reservasConfirmadas).toBe(0);

    // 2. Como recuperó su único Crédito del Período, puede reservar una Clase que inicia en 90 minutos
    const inicio90Min = new Date(Date.now() + 90 * 60_000);
    const clase90MinId = await insertarClaseEnInstante({
      inicio: inicio90Min,
      duracionMinutos: 60,
      cupos: 10
    });

    const resReserva2 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaVentana,
      boxId: IDS.boxNorte,
      body: { claseId: clase90MinId }
    });
    expect(resReserva2.status).toBe(201);

    // Cancelar dentro de la ventana (90 min antes < 120 min) -> CANCELADA_TARDIA
    const resCancelTardia = await api.pedir<Reserva>(
      `/reservas/${resReserva2.body.id}/cancelar`,
      {
        method: "POST",
        token: tokenAtletaVentana,
        boxId: IDS.boxNorte
      }
    );
    expect(resCancelTardia.status).toBe(200);
    expect(resCancelTardia.body.estado).toBe("CANCELADA_TARDIA");
    expect(resCancelTardia.body.canceladaEn).not.toBeNull();

    // El Cupo se libera inmediatamente
    const claseTrasCancel2 = await api.pedir<Clase>(`/clases/${clase90MinId}`, {
      token: tokenAtletaVentana,
      boxId: IDS.boxNorte
    });
    expect(claseTrasCancel2.body.reservasConfirmadas).toBe(0);

    // Pero el Crédito permanece consumido en ese Período: intentar reservar otra Clase en el mismo Período falla con SIN_CREDITOS_DISPONIBLES
    const inicioOtraMismoDia = new Date(inicio90Min.getTime() + 120 * 60_000);
    const claseOtraMismoDiaId = await insertarClaseEnInstante({
      inicio: inicioOtraMismoDia,
      duracionMinutos: 60,
      cupos: 10
    });

    const resIntentoSinCredito = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenAtletaVentana,
      boxId: IDS.boxNorte,
      body: { claseId: claseOtraMismoDiaId }
    });
    expect(resIntentoSinCredito.status).toBe(422);
    expect(resIntentoSinCredito.body.errorCode).toBe(
      ERROR_CODES.SIN_CREDITOS_DISPONIBLES
    );
  });

  it("Ticket 10 — Criterio 2: Liberación inmediata sin Lista de Espera (15/15 -> 14/15 -> 15/15 First-Come, First-Served)", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

    for (const atleta of ATLETAS_FCFS_16) {
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

    const clase15CuposId = await insertarClaseDirecta({
      fechaLocal: mananaLocal,
      horaInicio: "17:00",
      cupos: 15
    });

    // Los primeros 15 atletas llenan la Clase (15/15)
    let primeraReservaId = "";
    for (let i = 0; i < 15; i++) {
      const res = await api.pedir<Reserva>("/reservas", {
        method: "POST",
        token: tokensAtletasFcfs16[i],
        boxId: IDS.boxNorte,
        body: { claseId: clase15CuposId }
      });
      expect(res.status).toBe(201);
      if (i === 0) primeraReservaId = res.body.id;
    }

    const claseLlena = await api.pedir<Clase>(`/clases/${clase15CuposId}`, {
      token: tokensAtletasFcfs16[15],
      boxId: IDS.boxNorte
    });
    expect(claseLlena.body.reservasConfirmadas).toBe(15);
    expect(claseLlena.body.cupos).toBe(15);

    // El atleta #16 intenta reservar con la Clase 15/15 y recibe CUPO_AGOTADO
    const resRechazo = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokensAtletasFcfs16[15],
      boxId: IDS.boxNorte,
      body: { claseId: clase15CuposId }
    });
    expect(resRechazo.status).toBe(409);
    expect(resRechazo.body.errorCode).toBe(ERROR_CODES.CUPO_AGOTADO);

    // El atleta #1 cancela su Reserva -> pasa inmediatamente a 14/15
    const resCancel = await api.pedir<Reserva>(
      `/reservas/${primeraReservaId}/cancelar`,
      {
        method: "POST",
        token: tokensAtletasFcfs16[0],
        boxId: IDS.boxNorte
      }
    );
    expect(resCancel.status).toBe(200);

    const claseCon14 = await api.pedir<Clase>(`/clases/${clase15CuposId}`, {
      token: tokensAtletasFcfs16[15],
      boxId: IDS.boxNorte
    });
    expect(claseCon14.body.reservasConfirmadas).toBe(14);
    expect(claseCon14.body.cupos).toBe(15);

    // El atleta #16 presiona Reservar y obtiene inmediatamente el Cupo liberado (15/15)
    const resExito16 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokensAtletasFcfs16[15],
      boxId: IDS.boxNorte,
      body: { claseId: clase15CuposId }
    });
    expect(resExito16.status).toBe(201);
    expect(resExito16.body.estado).toBe("CONFIRMADA");

    const claseNuevamente15 = await api.pedir<Clase>(
      `/clases/${clase15CuposId}`,
      {
        token: tokensAtletasFcfs16[15],
        boxId: IDS.boxNorte
      }
    );
    expect(claseNuevamente15.body.reservasConfirmadas).toBe(15);
  });

  it("Ticket 10 — Criterio 3: Cancelación de Clase por el Box 30 min antes con 10 Reservas confirmadas pasa todas a CANCELADA_POR_BOX y reintegra los 10 Créditos", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const ayerLocal = sumarDiasAFecha(hoyLocal, -1);

    // Asignar Membresía de 1 Crédito semanal a los 10 atletas
    for (const atleta of ATLETAS_CANCEL_BOX_10) {
      const resMem = await api.pedir<Membresia>("/membresias", {
        method: "POST",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: {
          afiliacionId: atleta.afiliacionId,
          planId: planSemanal1Id,
          fechaInicio: ayerLocal
        }
      });
      expect(resMem.status).toBe(201);
    }

    // Clase que comienza en 30 minutos (dentro de la Ventana de Cancelación de 120 min)
    const inicio30Min = new Date(Date.now() + 30 * 60_000);
    const claseImprevistoId = await insertarClaseEnInstante({
      inicio: inicio30Min,
      duracionMinutos: 60,
      cupos: 15
    });

    // Los 10 atletas reservan la Clase (consumiendo su único Crédito del Período)
    for (let i = 0; i < 10; i++) {
      const res = await api.pedir<Reserva>("/reservas", {
        method: "POST",
        token: tokensAtletasCancelBox10[i],
        boxId: IDS.boxNorte,
        body: { claseId: claseImprevistoId }
      });
      expect(res.status).toBe(201);
    }

    // Un Coach o Atleta no puede cancelar una Clase del Box
    const resCancelNoAutorizado = await api.pedir<ErrorResponse>(
      `/clases/${claseImprevistoId}/cancelar`,
      {
        method: "POST",
        token: tokenCoachNorte,
        boxId: IDS.boxNorte,
        body: { motivoCancelacion: "Intento sin permiso" }
      }
    );
    expect(resCancelNoAutorizado.status).toBe(403);
    expect(resCancelNoAutorizado.body.errorCode).toBe(
      ERROR_CODES.ACCESO_DENEGADO_ROL
    );

    // El Administrador cancela la Clase por imprevisto del Box
    const resCancelClase = await api.pedir<Clase>(
      `/clases/${claseImprevistoId}/cancelar`,
      {
        method: "POST",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { motivoCancelacion: "Corte de luz en el Box" }
      }
    );
    expect(resCancelClase.status).toBe(200);
    expect(resCancelClase.body.canceladaEn).not.toBeNull();
    expect(resCancelClase.body.motivoCancelacion).toBe(
      "Corte de luz en el Box"
    );
    expect(resCancelClase.body.reservasConfirmadas).toBe(0);

    // Todas las 10 Reservas pasaron a CANCELADA_POR_BOX
    const reservasDeLaClase = await api.pedir<Reserva[]>(
      `/reservas?claseId=${claseImprevistoId}`,
      {
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(reservasDeLaClase.status).toBe(200);
    expect(reservasDeLaClase.body).toHaveLength(10);
    for (const r of reservasDeLaClase.body) {
      expect(r.estado).toBe("CANCELADA_POR_BOX");
      expect(r.canceladaEn).not.toBeNull();
    }

    // Los 10 Atletas recuperaron íntegramente su único Crédito y pueden reservar una Clase de reemplazo ese mismo día
    const inicioReemplazo = new Date(inicio30Min.getTime() + 180 * 60_000);
    const claseReemplazoId = await insertarClaseEnInstante({
      inicio: inicioReemplazo,
      duracionMinutos: 60,
      cupos: 15
    });

    for (let i = 0; i < 10; i++) {
      const resNueva = await api.pedir<Reserva>("/reservas", {
        method: "POST",
        token: tokensAtletasCancelBox10[i],
        boxId: IDS.boxNorte,
        body: { claseId: claseReemplazoId }
      });
      expect(resNueva.status).toBe(201);
    }
  });

  it("Ticket 10 — Criterio 4: Efecto cascada de Baja Anticipada cancela automáticamente las Reservas posteriores a la nueva fecha_fin y libera sus Cupos", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const proximaSemana1 = sumarDiasAFecha(hoyLocal, 7);
    const proximaSemana2 = sumarDiasAFecha(hoyLocal, 9);

    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_BAJA_CASCADA.afiliacionId,
        planId: planIlimitadoId,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);
    const membresiaId = resMem.body.id;

    // Clases para la próxima semana
    const claseFutura1Id = await insertarClaseDirecta({
      fechaLocal: proximaSemana1,
      horaInicio: "10:00",
      cupos: 12
    });
    const claseFutura2Id = await insertarClaseDirecta({
      fechaLocal: proximaSemana2,
      horaInicio: "10:00",
      cupos: 12
    });

    const resFut1 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaBajaCascada,
      boxId: IDS.boxNorte,
      body: { claseId: claseFutura1Id }
    });
    expect(resFut1.status).toBe(201);

    const resFut2 = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenAtletaBajaCascada,
      boxId: IDS.boxNorte,
      body: { claseId: claseFutura2Id }
    });
    expect(resFut2.status).toBe(201);

    // El Administrador ejecuta Baja Anticipada con fechaFin = hoyLocal
    const resBaja = await api.pedir<Membresia>(
      `/membresias/${membresiaId}/baja-anticipada`,
      {
        method: "POST",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { fechaFin: hoyLocal }
      }
    );
    expect(resBaja.status).toBe(200);
    expect(resBaja.body.fechaFin).toBe(hoyLocal);

    // Ambas Reservas de la próxima semana se cancelaron automáticamente y liberaron sus Cupos
    const reservasAtleta = await api.pedir<Reserva[]>(
      `/reservas?afiliacionId=${ATLETA_BAJA_CASCADA.afiliacionId}`,
      {
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(reservasAtleta.status).toBe(200);
    expect(reservasAtleta.body).toHaveLength(2);
    for (const r of reservasAtleta.body) {
      expect(r.estado).toBe("CANCELADA");
      expect(r.canceladaEn).not.toBeNull();
    }

    const clase1Despues = await api.pedir<Clase>(`/clases/${claseFutura1Id}`, {
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    expect(clase1Despues.body.reservasConfirmadas).toBe(0);

    const clase2Despues = await api.pedir<Clase>(`/clases/${claseFutura2Id}`, {
      token: tokenAdminNorte,
      boxId: IDS.boxNorte
    });
    expect(clase2Despues.body.reservasConfirmadas).toBe(0);
  });

  it("Ticket 11 — Criterio 1: Permisos estrictos para Walk-ins (Coach exclusivo recibe 403; Recepcionista, Administrador y rol combinado crean Reserva registrando creada_por_usuario_id)", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

    // Asignar Membresías activas a ATLETA_WALKIN_1 y ATLETA_WALKIN_2
    const resMem1 = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_WALKIN_1.afiliacionId,
        planId: planIlimitadoId,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem1.status).toBe(201);

    const resMem2 = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_WALKIN_2.afiliacionId,
        planId: planIlimitadoId,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem2.status).toBe(201);

    const claseWalkinId = await insertarClaseDirecta({
      fechaLocal: mananaLocal,
      horaInicio: "18:00",
      cupos: 15
    });

    // 1. Coach con rol exclusivo intenta registrar un walk-in -> 403 Forbidden
    const resCoach = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenCoachNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseWalkinId,
        afiliacionId: ATLETA_WALKIN_1.afiliacionId
      }
    });
    expect(resCoach.status).toBe(403);
    expect(resCoach.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // 2. Recepcionista inscribe a ATLETA_WALKIN_1 -> 201 Created y creadaPorUsuarioId = usuarioRecepNorte
    const resRecep = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseWalkinId,
        afiliacionId: ATLETA_WALKIN_1.afiliacionId
      }
    });
    expect(resRecep.status).toBe(201);
    expect(resRecep.body.estado).toBe("CONFIRMADA");
    expect(resRecep.body.afiliacionId).toBe(ATLETA_WALKIN_1.afiliacionId);
    expect(resRecep.body.creadaPorUsuarioId).toBe(IDS.usuarioRecepNorte);

    // 3. Usuario combinado ['coach', 'recepcionista'] inscribe a ATLETA_WALKIN_2 -> 201 Created y creadaPorUsuarioId = usuarioCoachRecepNorte
    const resCoachRecep = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenCoachRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseWalkinId,
        afiliacionId: ATLETA_WALKIN_2.afiliacionId
      }
    });
    expect(resCoachRecep.status).toBe(201);
    expect(resCoachRecep.body.estado).toBe("CONFIRMADA");
    expect(resCoachRecep.body.afiliacionId).toBe(ATLETA_WALKIN_2.afiliacionId);
    expect(resCoachRecep.body.creadaPorUsuarioId).toBe(IDS.usuarioCoachRecepNorte);
  });

  it("Ticket 11 — Criterio 2: Cupo estricto sin sobrecupo automático (20/20 rechaza con CUPO_AGOTADO; tras editar Clase a 21 cupos se confirma 21/21)", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

    // Asignar Membresía a ATLETA_WALKIN_CUPO
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_WALKIN_CUPO.afiliacionId,
        planId: planIlimitadoId,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);
    const membresiaId = resMem.body.id;

    // Crear Clase con 20 cupos
    const claseLlenaId = await insertarClaseDirecta({
      fechaLocal: mananaLocal,
      horaInicio: "19:00",
      cupos: 20
    });

    // Simular que la clase ya tiene 20 reservas confirmadas (20/20) con 20 atletas distintos
    const veinteAtletas = [...ATLETAS_CONCURRENCIA, ...ATLETAS_CANCEL_BOX_10];
    for (let i = 0; i < 20; i++) {
      await datos.consultar(
        `INSERT INTO reservas (box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
         VALUES ($1, $2, $3, $4, $5, 'CONFIRMADA')`,
        [
          IDS.boxNorte,
          claseLlenaId,
          veinteAtletas[i]!.afiliacionId,
          membresiaId,
          IDS.usuarioAdminNorte
        ]
      );
    }

    // El Recepcionista intenta anotar el walk-in en la clase 20/20 -> Rechazo con CUPO_AGOTADO (409)
    const resRechazo = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseLlenaId,
        afiliacionId: ATLETA_WALKIN_CUPO.afiliacionId
      }
    });
    expect(resRechazo.status).toBe(409);
    expect(resRechazo.body.errorCode).toBe(ERROR_CODES.CUPO_AGOTADO);

    // El Recepcionista edita primero la entidad Clase aumentando cupos a 21 (PATCH /clases/:id)
    const resEdicion = await api.pedir<Clase>(`/clases/${claseLlenaId}`, {
      method: "PATCH",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: { cupos: 21 }
    });
    expect(resEdicion.status).toBe(200);
    expect(resEdicion.body.cupos).toBe(21);

    // Vuelve a confirmar el walk-in -> Se registra exitosamente (21/21)
    const resExito = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseLlenaId,
        afiliacionId: ATLETA_WALKIN_CUPO.afiliacionId
      }
    });
    expect(resExito.status).toBe(201);
    expect(resExito.body.estado).toBe("CONFIRMADA");
    expect(resExito.body.creadaPorUsuarioId).toBe(IDS.usuarioRecepNorte);

    // La Clase ahora refleja 21/21
    const claseConsultada = await api.pedir<Clase>(`/clases/${claseLlenaId}`, {
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(claseConsultada.body.cupos).toBe(21);
    expect(claseConsultada.body.reservasConfirmadas).toBe(21);
  });

  it("Ticket 11 — Criterio 3: Créditos estrictos sin deuda de Créditos (Atleta sin Créditos/Membresía rechaza con SIN_CREDITOS_DISPONIBLES; tras sumar creditos_extra se inscribe exitosamente)", async () => {
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const pasadoMananaLocal = sumarDiasAFecha(hoyLocal, 2);

    const claseWalkinCreditosId = await insertarClaseDirecta({
      fechaLocal: pasadoMananaLocal,
      horaInicio: "11:00",
      cupos: 15
    });

    // 1. Atleta sin Membresía vigente intenta ser inscripto por mostrador -> 422 MEMBRESIA_NO_VIGENTE
    const resSinMembresia = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseWalkinCreditosId,
        afiliacionId: ATLETA_WALKIN_SIN_CRED.afiliacionId
      }
    });
    expect(resSinMembresia.status).toBe(422);
    expect(resSinMembresia.body.errorCode).toBe(ERROR_CODES.MEMBRESIA_NO_VIGENTE);

    // Asignar Membresía semanal de 1 Crédito (planSemanal1Id)
    const resMem = await api.pedir<Membresia>("/membresias", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        afiliacionId: ATLETA_WALKIN_SIN_CRED.afiliacionId,
        planId: planSemanal1Id,
        fechaInicio: hoyLocal
      }
    });
    expect(resMem.status).toBe(201);
    const membresiaId = resMem.body.id;

    // Consumir el único Crédito semanal asignándole una Reserva previa en otra clase
    const clasePreviaId = await insertarClaseDirecta({
      fechaLocal: hoyLocal,
      horaInicio: "09:00",
      cupos: 15
    });
    const resConsumo = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: clasePreviaId,
        afiliacionId: ATLETA_WALKIN_SIN_CRED.afiliacionId
      }
    });
    expect(resConsumo.status).toBe(201);

    // Ahora el Atleta tiene 0 Créditos restantes en el Período semanal
    // El Recepcionista intenta anotar el walk-in en la segunda clase -> 422 SIN_CREDITOS_DISPONIBLES
    const resSinCreditos = await api.pedir<ErrorResponse>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseWalkinCreditosId,
        afiliacionId: ATLETA_WALKIN_SIN_CRED.afiliacionId
      }
    });
    expect(resSinCreditos.status).toBe(422);
    expect(resSinCreditos.body.errorCode).toBe(ERROR_CODES.SIN_CREDITOS_DISPONIBLES);

    // El Recepcionista le suma 1 crédito extra antes de inscribirlo (PATCH /membresias/:id/creditos-extra)
    const resAjuste = await api.pedir<Membresia>(
      `/membresias/${membresiaId}/creditos-extra`,
      {
        method: "PATCH",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte,
        body: {
          creditosExtra: 1,
          motivo: "Walk-in espontáneo en mostrador"
        }
      }
    );
    expect(resAjuste.status).toBe(200);
    expect(resAjuste.body.creditosExtra).toBe(1);

    // Vuelve a confirmar el walk-in -> Reserva confirmada con éxito
    const resExito = await api.pedir<Reserva>("/reservas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        claseId: claseWalkinCreditosId,
        afiliacionId: ATLETA_WALKIN_SIN_CRED.afiliacionId
      }
    });
    expect(resExito.status).toBe(201);
    expect(resExito.body.estado).toBe("CONFIRMADA");
    expect(resExito.body.creadaPorUsuarioId).toBe(IDS.usuarioRecepNorte);
  });

  it("Ticket 12 — Criterio 1: Visibilidad acotada del Coach (Coach no puede marcar en Clases de otro Coach; marca en la suya; Recepción y Admin pueden en cualquiera; Atleta recibe 403; filtrado de clases por coach)", async () => {
    // Clase 1: asignada a Coach Norte (inicio hace 2 horas, dentro de ventana)
    const inicioClase1 = new Date(Date.now() - 2 * 3600 * 1000);
    const claseCoachNorteId = await insertarClaseEnInstante({
      coachAfiliacionId: IDS.afiliacionCoachNorte,
      inicio: inicioClase1,
      cupos: 15
    });

    // Clase 2: asignada a Coach Recep Norte (inicio hace 2 horas, dentro de ventana)
    const inicioClase2 = new Date(Date.now() - 2 * 3600 * 1000);
    const claseOtroCoachId = await insertarClaseEnInstante({
      coachAfiliacionId: IDS.afiliacionCoachRecepNorte,
      inicio: inicioClase2,
      cupos: 15
    });

    // Crear reservas directamente para los atletas
    const reservaClase1Id = await insertarReservaDirecta({
      claseId: claseCoachNorteId,
      afiliacionId: ATLETA_ASISTENCIA_1.afiliacionId,
      membresiaId: membresiaAsistencia1Id
    });

    const reservaClase2Id = await insertarReservaDirecta({
      claseId: claseOtroCoachId,
      afiliacionId: ATLETA_ASISTENCIA_2.afiliacionId,
      membresiaId: membresiaAsistencia2Id
    });

    // 1. Coach Norte (exclusivo) intenta marcar asistencia en Clase 2 (de otro Coach) -> 403 Forbidden
    const resCoachOtro = await api.pedir<ErrorResponse>(
      `/reservas/${reservaClase2Id}/asistencia`,
      {
        method: "PATCH",
        token: tokenCoachNorte,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resCoachOtro.status).toBe(403);
    expect(resCoachOtro.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // 2. Coach Norte marca asistencia en Clase 1 (su propia clase asignada) -> 200 OK
    const resCoachPropia = await api.pedir<Reserva>(
      `/reservas/${reservaClase1Id}/asistencia`,
      {
        method: "PATCH",
        token: tokenCoachNorte,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resCoachPropia.status).toBe(200);
    expect(resCoachPropia.body.asistenciaMarcadaEn).toBeTruthy();
    expect(resCoachPropia.body.asistenciaPorUsuarioId).toBe(
      IDS.usuarioCoachNorte
    );

    // 3. Recepcionista o Administrador pueden marcar asistencia en cualquier Clase del Box -> 200 OK
    const resRecepEnOtro = await api.pedir<Reserva>(
      `/reservas/${reservaClase2Id}/asistencia`,
      {
        method: "PATCH",
        token: tokenRecepNorte,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resRecepEnOtro.status).toBe(200);
    expect(resRecepEnOtro.body.asistenciaMarcadaEn).toBeTruthy();
    expect(resRecepEnOtro.body.asistenciaPorUsuarioId).toBe(
      IDS.usuarioRecepNorte
    );

    // 4. Atleta (sin rol staff) intenta marcar asistencia -> 403 Forbidden
    const resAtleta = await api.pedir<ErrorResponse>(
      `/reservas/${reservaClase1Id}/asistencia`,
      {
        method: "PATCH",
        token: tokenAtletaAsistencia1,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resAtleta.status).toBe(403);
    expect(resAtleta.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // 5. Filtrado de clases por coachAfiliacionId
    const resClasesCoach = await api.pedir<Clase[]>(
      `/clases?coachAfiliacionId=${IDS.afiliacionCoachNorte}`,
      {
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(resClasesCoach.status).toBe(200);
    expect(
      resClasesCoach.body.every(
        (c) => c.coachAfiliacionId === IDS.afiliacionCoachNorte
      )
    ).toBe(true);

    // 6. Coach con rol exclusivo consulta /clases -> se acota automáticamente a sus clases
    const resClasesSoloCoach = await api.pedir<Clase[]>("/clases", {
      token: tokenCoachNorte,
      boxId: IDS.boxNorte
    });
    expect(resClasesSoloCoach.status).toBe(200);
    expect(
      resClasesSoloCoach.body.every(
        (c) => c.coachAfiliacionId === IDS.afiliacionCoachNorte
      )
    ).toBe(true);
  });

  it("Ticket 12 — Criterio 2: Marcado y rectificación dentro de la Ventana de Corrección de Asistencia (24 hs) (presente=true guarda timestamp y operador; presente=false resetea; rechaza en reservas canceladas)", async () => {
    const inicioClase = new Date(Date.now() - 3 * 3600 * 1000);
    const claseId = await insertarClaseEnInstante({
      coachAfiliacionId: IDS.afiliacionCoachNorte,
      inicio: inicioClase,
      cupos: 15
    });

    const reservaId = await insertarReservaDirecta({
      claseId,
      afiliacionId: ATLETA_ASISTENCIA_1.afiliacionId,
      membresiaId: membresiaAsistencia1Id,
      estado: "CONFIRMADA"
    });

    // 1. Marcar presente dentro de la ventana de 24 hs
    const resPresente = await api.pedir<Reserva>(
      `/reservas/${reservaId}/asistencia`,
      {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resPresente.status).toBe(200);
    expect(resPresente.body.asistenciaMarcadaEn).toBeTruthy();
    expect(resPresente.body.asistenciaPorUsuarioId).toBe(IDS.usuarioAdminNorte);

    // 2. Rectificar / desmarcar presente dentro de la ventana de 24 hs
    const resDesmarcar = await api.pedir<Reserva>(
      `/reservas/${reservaId}/asistencia`,
      {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { presente: false }
      }
    );
    expect(resDesmarcar.status).toBe(200);
    expect(resDesmarcar.body.asistenciaMarcadaEn).toBeNull();
    expect(resDesmarcar.body.asistenciaPorUsuarioId).toBeNull();

    // 3. Rechazar en reservas que no están confirmadas (ej. canceladas)
    const reservaCanceladaId = await insertarReservaDirecta({
      claseId,
      afiliacionId: ATLETA_ASISTENCIA_2.afiliacionId,
      membresiaId: membresiaAsistencia2Id,
      estado: "CANCELADA"
    });

    const resRechazoCancelada = await api.pedir<ErrorResponse>(
      `/reservas/${reservaCanceladaId}/asistencia`,
      {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resRechazoCancelada.status).toBe(400);
    expect(resRechazoCancelada.body.errorCode).toBe(
      ERROR_CODES.VALIDACION_FALLIDA
    );
  });

  it("Ticket 12 — Criterio 3: Cierre estricto tras 24 horas y consolidación de Ausencia (pasadas 24 hs rechaza modificar asistencia con VENTANA_CORRECCION_VENCIDA y expone ausenciaConsolidada=true para reservas sin presente)", async () => {
    // Clase cuyo fin ocurrió hace 26 horas
    const inicioHace27Hs = new Date(Date.now() - 27 * 3600 * 1000);
    const claseVencidaId = await insertarClaseEnInstante({
      coachAfiliacionId: IDS.afiliacionCoachNorte,
      inicio: inicioHace27Hs,
      cupos: 15
    });

    // Reserva 1: sin presente
    const reservaId = await insertarReservaDirecta({
      claseId: claseVencidaId,
      afiliacionId: ATLETA_ASISTENCIA_1.afiliacionId,
      membresiaId: membresiaAsistencia1Id,
      estado: "CONFIRMADA",
      asistenciaMarcadaEn: null
    });

    // Reserva 2: con presente marcado previamente
    const reservaConPresenteId = await insertarReservaDirecta({
      claseId: claseVencidaId,
      afiliacionId: ATLETA_ASISTENCIA_2.afiliacionId,
      membresiaId: membresiaAsistencia2Id,
      estado: "CONFIRMADA",
      asistenciaMarcadaEn: new Date(Date.now() - 26 * 3600 * 1000),
      asistenciaPorUsuarioId: IDS.usuarioCoachNorte
    });

    // 1. Intentar marcar asistencia tras vencer la ventana de 24 hs -> 422 VENTANA_CORRECCION_VENCIDA
    const resVencida = await api.pedir<ErrorResponse>(
      `/reservas/${reservaId}/asistencia`,
      {
        method: "PATCH",
        token: tokenCoachNorte,
        boxId: IDS.boxNorte,
        body: { presente: true }
      }
    );
    expect(resVencida.status).toBe(422);
    expect(resVencida.body.errorCode).toBe(
      ERROR_CODES.VENTANA_CORRECCION_VENCIDA
    );

    // 2. Al listar reservas de la clase vencida:
    //    - Reserva sin presente se expone como ausencia consolidada (ausenciaConsolidada: true)
    //    - Reserva con presente se expone normalmente (ausenciaConsolidada: false)
    const resListado = await api.pedir<Reserva[]>(
      `/reservas?claseId=${claseVencidaId}`,
      {
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(resListado.status).toBe(200);

    const reservaSinPresente = resListado.body.find((r) => r.id === reservaId);
    expect(reservaSinPresente).toBeDefined();
    expect(reservaSinPresente?.asistenciaMarcadaEn).toBeNull();
    expect(reservaSinPresente?.ausenciaConsolidada).toBe(true);

    const reservaConPresente = resListado.body.find(
      (r) => r.id === reservaConPresenteId
    );
    expect(reservaConPresente).toBeDefined();
    expect(reservaConPresente?.asistenciaMarcadaEn).toBeTruthy();
    expect(reservaConPresente?.ausenciaConsolidada).toBe(false);
  });
});
