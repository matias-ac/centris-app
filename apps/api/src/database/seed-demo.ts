import {
  calcularFechaFinVigencia,
  calcularInstantesClase,
  diaSemanaIso,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type ModalidadCreditos,
  type RolAfiliacion
} from "@centris/shared";
import pg from "pg";
import {
  cargarVariablesDeEntorno,
  exigirVariableDeEntorno
} from "../common/config/env.js";
import { hashearContrasena } from "../modules/auth/contrasenas.js";

const TIMEZONE_BA = "America/Argentina/Buenos_Aires";

const DEMO_BOX_IDS = {
  forjaSur: "70000000-0000-4000-8000-000000000001",
  plazaLasHeras: "80000000-0000-4000-8000-000000000001"
} as const;

function uuidPrefijo(prefijo: string, indice: number): string {
  return `${prefijo}-0000-4000-8000-${String(indice).padStart(12, "0")}`;
}

interface UsuarioSeed {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
}

interface AfiliacionSeed {
  id: string;
  boxId: string;
  usuarioId: string;
  roles: RolAfiliacion[];
}

interface PlanSeed {
  id: string;
  boxId: string;
  nombre: string;
  precioBase: number;
  duracionDias: number;
  modalidadCreditos: ModalidadCreditos;
  creditosPorPeriodo: number | null;
}

interface HorarioSeed {
  id: string;
  boxId: string;
  tipoClaseId: string;
  coachAfiliacionId: string;
  diaSemana: number;
  horaInicio: string;
  duracionMinutos: number;
  cuposDefault: number;
}

interface ClaseMaterializadaSeed {
  id: string;
  boxId: string;
  horarioId: string | null;
  tipoClaseId: string;
  coachAfiliacionId: string;
  inicio: Date;
  fin: Date;
  cupos: number;
}

const NOMBRES_ATLETAS_FORJA_SUR = [
  "Valentina Gómez",
  "Tomás Martínez",
  "Camila Rodríguez",
  "Agustín Fernández",
  "Florencia López",
  "Santiago Díaz",
  "Paula Romero",
  "Facundo Torres",
  "Martina Álvarez",
  "Ramiro Ruiz",
  "Delfina Sosa",
  "Franco Morales",
  "Julián Castro",
  "Abril Herrera",
  "Joaquín Silva",
  "Micaela Ortiz",
  "Sofía Navarro",
  "Lucas Pereyra",
  "Ezequiel Medina",
  "Candela Acosta",
  "Luciana Méndez",
  "Mateo Cabrera"
] as const;

const NOMBRES_ATLETAS_PLAZA = [
  "Lourdes Giménez",
  "Ignacio Vega",
  "Nadia Ríos",
  "Bruno Molina",
  "Caterina Suárez",
  "Lautaro Paz",
  "Solange Vera",
  "Emiliano Ibáñez",
  "Milagros Luna",
  "Patricio Ponce",
  "Rocío Cáceres",
  "Gabriel Ramos"
] as const;

function construirHorariosForjaSur(params: {
  boxId: string;
  tipoFuncionalId: string;
  tipoRunningId: string;
  coachDueno1Id: string;
  coachDueno2Id: string;
  coachMananaId: string;
  coachMediodiaId: string;
  profeRunningId: string;
}): HorarioSeed[] {
  const horarios: HorarioSeed[] = [];
  let seq = 1;

  const agregar = (
    tipoClaseId: string,
    coachAfiliacionId: string,
    diaSemana: number,
    horaInicio: string,
    cuposDefault: number
  ) => {
    horarios.push({
      id: uuidPrefijo("74000000", seq++),
      boxId: params.boxId,
      tipoClaseId,
      coachAfiliacionId,
      diaSemana,
      horaInicio,
      duracionMinutos: 60,
      cuposDefault
    });
  };

  // Lunes (1) a Viernes (5): Mañana 07 y 08, Mediodía 12 y 13
  for (let dia = 1; dia <= 5; dia++) {
    agregar(params.tipoFuncionalId, params.coachMananaId, dia, "07:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachMananaId, dia, "08:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachMediodiaId, dia, "12:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachMediodiaId, dia, "13:00:00", 18);
  }

  // Lunes (1) y Miércoles (3): 17, 18 (Dueño 2) y 19, 20 (Dueño 1)
  for (const dia of [1, 3]) {
    agregar(params.tipoFuncionalId, params.coachDueno2Id, dia, "17:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachDueno2Id, dia, "18:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachDueno1Id, dia, "19:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachDueno1Id, dia, "20:00:00", 18);
  }

  // Martes (2), Jueves (4) y Viernes (5): 17, 18 (Dueño 2) y 19 (Dueño 1)
  for (const dia of [2, 4, 5]) {
    agregar(params.tipoFuncionalId, params.coachDueno2Id, dia, "17:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachDueno2Id, dia, "18:00:00", 18);
    agregar(params.tipoFuncionalId, params.coachDueno1Id, dia, "19:00:00", 18);
  }

  // Sábado (6): 1 y 1 cada dueño (10:00 Dueño 1, 11:00 Dueño 2)
  agregar(params.tipoFuncionalId, params.coachDueno1Id, 6, "10:00:00", 18);
  agregar(params.tipoFuncionalId, params.coachDueno2Id, 6, "11:00:00", 18);

  // Domingo (7): 10:00 Dueño 2, 11:00 Dueño 1
  agregar(params.tipoFuncionalId, params.coachDueno2Id, 7, "10:00:00", 18);
  agregar(params.tipoFuncionalId, params.coachDueno1Id, 7, "11:00:00", 18);

  // Running: Lunes (1), Miércoles (3) y Viernes (5) a las 19:00 (cupo 15)
  for (const dia of [1, 3, 5]) {
    agregar(params.tipoRunningId, params.profeRunningId, dia, "19:00:00", 15);
  }

  return horarios;
}

function construirHorariosPlaza(params: {
  boxId: string;
  tipoPlazaId: string;
  profeAfiliacionId: string;
}): HorarioSeed[] {
  const horarios: HorarioSeed[] = [];
  let seq = 1;
  const turnos = ["08:00:00", "09:00:00", "17:00:00", "18:00:00", "19:00:00"];

  for (let dia = 1; dia <= 5; dia++) {
    for (const hora of turnos) {
      horarios.push({
        id: uuidPrefijo("84000000", seq++),
        boxId: params.boxId,
        tipoClaseId: params.tipoPlazaId,
        coachAfiliacionId: params.profeAfiliacionId,
        diaSemana: dia,
        horaInicio: hora,
        duracionMinutos: 60,
        cuposDefault: 8
      });
    }
  }

  return horarios;
}

function proximoDiaSemana(fechaBase: string, diaIsoObjetivo: number): string {
  for (let offset = 1; offset <= 7; offset++) {
    const candidata = sumarDiasAFecha(fechaBase, offset);
    if (diaSemanaIso(candidata) === diaIsoObjetivo) {
      return candidata;
    }
  }
  return sumarDiasAFecha(fechaBase, 1);
}

export async function ejecutarSeedDemo(
  connectionString?: string
): Promise<void> {
  cargarVariablesDeEntorno();
  const url =
    connectionString ??
    process.env.MIGRATION_DATABASE_URL ??
    exigirVariableDeEntorno("DATABASE_URL");

  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1");
  const useSsl =
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
    (isRemote && process.env.NODE_ENV === "production");

  const pool = new pg.Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHashDemo = await hashearContrasena(
      "Centris123!",
      "centris_demo_salt"
    );
    const ahora = new Date();
    const hoyBA = obtenerFechaLocal(ahora, TIMEZONE_BA);

    // 0. Limpieza aislada ÚNICAMENTE de los 2 Boxes demo (no toca Box Norte/Sur del seed oficial)
    const demoBoxesArray = [DEMO_BOX_IDS.forjaSur, DEMO_BOX_IDS.plazaLasHeras];
    await client.query(`DELETE FROM reservas WHERE box_id = ANY($1::uuid[])`, [
      demoBoxesArray
    ]);
    await client.query(`DELETE FROM clases WHERE box_id = ANY($1::uuid[])`, [
      demoBoxesArray
    ]);
    await client.query(`DELETE FROM horarios WHERE box_id = ANY($1::uuid[])`, [
      demoBoxesArray
    ]);
    await client.query(
      `DELETE FROM tipos_clase WHERE box_id = ANY($1::uuid[])`,
      [demoBoxesArray]
    );
    await client.query(`DELETE FROM pagos WHERE box_id = ANY($1::uuid[])`, [
      demoBoxesArray
    ]);
    await client.query(
      `DELETE FROM membresias WHERE box_id = ANY($1::uuid[])`,
      [demoBoxesArray]
    );
    await client.query(`DELETE FROM planes WHERE box_id = ANY($1::uuid[])`, [
      demoBoxesArray
    ]);
    await client.query(
      `DELETE FROM afiliaciones WHERE box_id = ANY($1::uuid[])`,
      [demoBoxesArray]
    );

    // 1. Boxes demo
    await client.query(
      `INSERT INTO boxes (id, nombre, slug, timezone, moneda, anticipacion_reserva_dias, ventana_cancelacion_minutos)
       VALUES
         ($1, 'Box Forja Sur', 'forja-sur', $3, 'ARS', 7, 120),
         ($2, 'Entrenamiento Plaza Las Heras', 'plaza-las-heras', $3, 'ARS', 5, 180)
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         slug = EXCLUDED.slug,
         timezone = EXCLUDED.timezone,
         moneda = EXCLUDED.moneda,
         anticipacion_reserva_dias = EXCLUDED.anticipacion_reserva_dias,
         ventana_cancelacion_minutos = EXCLUDED.ventana_cancelacion_minutos`,
      [DEMO_BOX_IDS.forjaSur, DEMO_BOX_IDS.plazaLasHeras, TIMEZONE_BA]
    );

    // 2. Usuarios y Afiliaciones — Box Forja Sur
    const staffForjaSur = {
      dueno1: {
        usuarioId: uuidPrefijo("71000000", 1),
        afiliacionId: uuidPrefijo("72000000", 1),
        email: "dueno1.forjasur@centris.dev",
        nombre: "Federico Alarcón",
        roles: ["administrador", "coach"] as RolAfiliacion[]
      },
      dueno2: {
        usuarioId: uuidPrefijo("71000000", 2),
        afiliacionId: uuidPrefijo("72000000", 2),
        email: "dueno2.forjasur@centris.dev",
        nombre: "Mariano Ferreyra",
        roles: ["administrador", "coach"] as RolAfiliacion[]
      },
      coachManana: {
        usuarioId: uuidPrefijo("71000000", 3),
        afiliacionId: uuidPrefijo("72000000", 3),
        email: "coach.manana.forjasur@centris.dev",
        nombre: "Tomás Benítez",
        roles: ["coach"] as RolAfiliacion[]
      },
      coachMediodia: {
        usuarioId: uuidPrefijo("71000000", 4),
        afiliacionId: uuidPrefijo("72000000", 4),
        email: "coach.mediodia.forjasur@centris.dev",
        nombre: "Carolina Paredes",
        roles: ["coach"] as RolAfiliacion[]
      },
      profeRunning: {
        usuarioId: uuidPrefijo("71000000", 5),
        afiliacionId: uuidPrefijo("72000000", 5),
        email: "profe.running.forjasur@centris.dev",
        nombre: "Julieta Roldán",
        roles: ["coach"] as RolAfiliacion[]
      },
      recepcion: {
        usuarioId: uuidPrefijo("71000000", 6),
        afiliacionId: uuidPrefijo("72000000", 6),
        email: "recepcion.forjasur@centris.dev",
        nombre: "Camila Quiroga",
        roles: ["recepcionista"] as RolAfiliacion[]
      }
    };

    const staffPlaza = {
      profeUnico: {
        usuarioId: uuidPrefijo("81000000", 1),
        afiliacionId: uuidPrefijo("82000000", 1),
        email: "profe.plaza@centris.dev",
        nombre: "Sebastián Morales",
        roles: ["administrador", "recepcionista", "coach"] as RolAfiliacion[]
      }
    };

    const atletasForjaSur = NOMBRES_ATLETAS_FORJA_SUR.map((nombre, i) => ({
      indice: i + 1,
      usuarioId: uuidPrefijo("71000000", 101 + i),
      afiliacionId: uuidPrefijo("72000000", 101 + i),
      email: `atleta${String(i + 1).padStart(2, "0")}.forjasur@centris.dev`,
      nombre,
      activo: i !== 21 // atleta22 pendiente de activar cuenta (password_hash = NULL)
    }));

    const atletasPlaza = NOMBRES_ATLETAS_PLAZA.map((nombre, i) => ({
      indice: i + 1,
      usuarioId: uuidPrefijo("81000000", 101 + i),
      afiliacionId: uuidPrefijo("82000000", 101 + i),
      email: `atleta${String(i + 1).padStart(2, "0")}.plaza@centris.dev`,
      nombre,
      activo: true
    }));

    const usuarios: UsuarioSeed[] = [
      ...Object.values(staffForjaSur).map((s) => ({
        id: s.usuarioId,
        email: s.email,
        nombre: s.nombre,
        activo: true
      })),
      ...atletasForjaSur.map((a) => ({
        id: a.usuarioId,
        email: a.email,
        nombre: a.nombre,
        activo: a.activo
      })),
      {
        id: staffPlaza.profeUnico.usuarioId,
        email: staffPlaza.profeUnico.email,
        nombre: staffPlaza.profeUnico.nombre,
        activo: true
      },
      ...atletasPlaza.map((a) => ({
        id: a.usuarioId,
        email: a.email,
        nombre: a.nombre,
        activo: a.activo
      }))
    ];

    for (const u of usuarios) {
      await client.query(
        `INSERT INTO usuarios (id, email, nombre, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           nombre = EXCLUDED.nombre,
           password_hash = EXCLUDED.password_hash`,
        [u.id, u.email, u.nombre, u.activo ? passwordHashDemo : null]
      );
    }

    const afiliaciones: AfiliacionSeed[] = [
      ...Object.values(staffForjaSur).map((s) => ({
        id: s.afiliacionId,
        boxId: DEMO_BOX_IDS.forjaSur,
        usuarioId: s.usuarioId,
        roles: s.roles
      })),
      ...atletasForjaSur.map((a) => ({
        id: a.afiliacionId,
        boxId: DEMO_BOX_IDS.forjaSur,
        usuarioId: a.usuarioId,
        roles: ["atleta"] as RolAfiliacion[]
      })),
      {
        id: staffPlaza.profeUnico.afiliacionId,
        boxId: DEMO_BOX_IDS.plazaLasHeras,
        usuarioId: staffPlaza.profeUnico.usuarioId,
        roles: staffPlaza.profeUnico.roles
      },
      ...atletasPlaza.map((a) => ({
        id: a.afiliacionId,
        boxId: DEMO_BOX_IDS.plazaLasHeras,
        usuarioId: a.usuarioId,
        roles: ["atleta"] as RolAfiliacion[]
      }))
    ];

    for (const af of afiliaciones) {
      await client.query(
        `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
         VALUES ($1, $2, $3, $4, true)`,
        [af.id, af.boxId, af.usuarioId, af.roles]
      );
    }

    // 3. Tipos de Clase
    const tiposForjaSur = {
      funcional: uuidPrefijo("73000000", 1),
      running: uuidPrefijo("73000000", 2),
      levantamiento: uuidPrefijo("73000000", 3),
      rcp: uuidPrefijo("73000000", 4)
    };
    const tipoPlaza = uuidPrefijo("83000000", 1);

    await client.query(
      `INSERT INTO tipos_clase (id, box_id, nombre, descripcion, activo)
       VALUES
         ($1, $5, 'Funcional (WOD)', 'Entrenamiento funcional diario de 60 minutos', true),
         ($2, $5, 'Running', 'Entrenamiento aeróbico y técnica de carrera', true),
         ($3, $5, 'Levantamiento Olímpico', 'Clínica técnica especial fuera de grilla', true),
         ($4, $5, 'Práctica RCP', 'Jornada especial de primeros auxilios y RCP', true),
         ($6, $7, 'Entrenamiento Funcional en Plaza', 'Sesiones al aire libre para grupos reducidos', true)`,
      [
        tiposForjaSur.funcional,
        tiposForjaSur.running,
        tiposForjaSur.levantamiento,
        tiposForjaSur.rcp,
        DEMO_BOX_IDS.forjaSur,
        tipoPlaza,
        DEMO_BOX_IDS.plazaLasHeras
      ]
    );

    // 4. Horarios recurrentes + Materialización de Clases (-2 a +7 días Forja Sur / -2 a +5 días Plaza)
    const horariosForjaSur = construirHorariosForjaSur({
      boxId: DEMO_BOX_IDS.forjaSur,
      tipoFuncionalId: tiposForjaSur.funcional,
      tipoRunningId: tiposForjaSur.running,
      coachDueno1Id: staffForjaSur.dueno1.afiliacionId,
      coachDueno2Id: staffForjaSur.dueno2.afiliacionId,
      coachMananaId: staffForjaSur.coachManana.afiliacionId,
      coachMediodiaId: staffForjaSur.coachMediodia.afiliacionId,
      profeRunningId: staffForjaSur.profeRunning.afiliacionId
    });

    const horariosPlaza = construirHorariosPlaza({
      boxId: DEMO_BOX_IDS.plazaLasHeras,
      tipoPlazaId: tipoPlaza,
      profeAfiliacionId: staffPlaza.profeUnico.afiliacionId
    });

    for (const h of [...horariosForjaSur, ...horariosPlaza]) {
      await client.query(
        `INSERT INTO horarios (id, box_id, tipo_clase_id, coach_afiliacion_id, dia_semana, hora_inicio, duracion_minutos, cupos_default, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [
          h.id,
          h.boxId,
          h.tipoClaseId,
          h.coachAfiliacionId,
          h.diaSemana,
          h.horaInicio,
          h.duracionMinutos,
          h.cuposDefault
        ]
      );
    }

    const clasesForjaSur: ClaseMaterializadaSeed[] = [];
    let claseSeqForja = 1;
    for (let offset = -2; offset <= 7; offset++) {
      const fecha = sumarDiasAFecha(hoyBA, offset);
      const diaIso = diaSemanaIso(fecha);
      for (const h of horariosForjaSur) {
        if (h.diaSemana !== diaIso) continue;
        const { inicio, fin } = calcularInstantesClase({
          fechaLocal: fecha,
          horaInicio: h.horaInicio.slice(0, 5),
          duracionMinutos: h.duracionMinutos,
          timezone: TIMEZONE_BA
        });
        clasesForjaSur.push({
          id: uuidPrefijo("75000000", claseSeqForja++),
          boxId: h.boxId,
          horarioId: h.id,
          tipoClaseId: h.tipoClaseId,
          coachAfiliacionId: h.coachAfiliacionId,
          inicio,
          fin,
          cupos: h.cuposDefault
        });
      }
    }

    // Eventos puntuales (sin horario_id) en Box Forja Sur
    const sabadoProximo = proximoDiaSemana(hoyBA, 6);
    const domingoProximo = proximoDiaSemana(hoyBA, 7);
    const instantesLevantamiento = calcularInstantesClase({
      fechaLocal: sabadoProximo,
      horaInicio: "12:00",
      duracionMinutos: 90,
      timezone: TIMEZONE_BA
    });
    const instantesRcp = calcularInstantesClase({
      fechaLocal: domingoProximo,
      horaInicio: "12:30",
      duracionMinutos: 90,
      timezone: TIMEZONE_BA
    });
    const eventoLevantamiento: ClaseMaterializadaSeed = {
      id: uuidPrefijo("75000000", claseSeqForja++),
      boxId: DEMO_BOX_IDS.forjaSur,
      horarioId: null,
      tipoClaseId: tiposForjaSur.levantamiento,
      coachAfiliacionId: staffForjaSur.dueno1.afiliacionId,
      inicio: instantesLevantamiento.inicio,
      fin: instantesLevantamiento.fin,
      cupos: 16
    };
    const eventoRcp: ClaseMaterializadaSeed = {
      id: uuidPrefijo("75000000", claseSeqForja++),
      boxId: DEMO_BOX_IDS.forjaSur,
      horarioId: null,
      tipoClaseId: tiposForjaSur.rcp,
      coachAfiliacionId: staffForjaSur.dueno2.afiliacionId,
      inicio: instantesRcp.inicio,
      fin: instantesRcp.fin,
      cupos: 20
    };
    clasesForjaSur.push(eventoLevantamiento, eventoRcp);

    const clasesPlaza: ClaseMaterializadaSeed[] = [];
    let claseSeqPlaza = 1;
    for (let offset = -2; offset <= 5; offset++) {
      const fecha = sumarDiasAFecha(hoyBA, offset);
      const diaIso = diaSemanaIso(fecha);
      for (const h of horariosPlaza) {
        if (h.diaSemana !== diaIso) continue;
        const { inicio, fin } = calcularInstantesClase({
          fechaLocal: fecha,
          horaInicio: h.horaInicio.slice(0, 5),
          duracionMinutos: h.duracionMinutos,
          timezone: TIMEZONE_BA
        });
        clasesPlaza.push({
          id: uuidPrefijo("85000000", claseSeqPlaza++),
          boxId: h.boxId,
          horarioId: h.id,
          tipoClaseId: h.tipoClaseId,
          coachAfiliacionId: h.coachAfiliacionId,
          inicio,
          fin,
          cupos: h.cuposDefault
        });
      }
    }

    for (const c of [...clasesForjaSur, ...clasesPlaza]) {
      await client.query(
        `INSERT INTO clases (id, box_id, horario_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          c.id,
          c.boxId,
          c.horarioId,
          c.tipoClaseId,
          c.coachAfiliacionId,
          c.inicio,
          c.fin,
          c.cupos
        ]
      );
    }

    // 5. Catálogo de Planes
    const planesForjaSur = {
      packRunning: {
        id: uuidPrefijo("76000000", 1),
        boxId: DEMO_BOX_IDS.forjaSur,
        nombre: "Pack Running 8",
        precioBase: 52000,
        duracionDias: 30,
        modalidadCreditos: "VIGENCIA_TOTAL" as ModalidadCreditos,
        creditosPorPeriodo: 8
      },
      funcional2x: {
        id: uuidPrefijo("76000000", 2),
        boxId: DEMO_BOX_IDS.forjaSur,
        nombre: "Funcional 2x Semana",
        precioBase: 60000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL" as ModalidadCreditos,
        creditosPorPeriodo: 2
      },
      funcional3x: {
        id: uuidPrefijo("76000000", 3),
        boxId: DEMO_BOX_IDS.forjaSur,
        nombre: "Funcional 3x Semana",
        precioBase: 72000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL" as ModalidadCreditos,
        creditosPorPeriodo: 3
      },
      libreFull: {
        id: uuidPrefijo("76000000", 4),
        boxId: DEMO_BOX_IDS.forjaSur,
        nombre: "Pase Libre + Running",
        precioBase: 92000,
        duracionDias: 30,
        modalidadCreditos: "ILIMITADO" as ModalidadCreditos,
        creditosPorPeriodo: null
      }
    } satisfies Record<string, PlanSeed>;

    const planesPlaza = {
      pack4: {
        id: uuidPrefijo("86000000", 1),
        boxId: DEMO_BOX_IDS.plazaLasHeras,
        nombre: "Pack 4 Clases Plaza",
        precioBase: 28000,
        duracionDias: 30,
        modalidadCreditos: "VIGENCIA_TOTAL" as ModalidadCreditos,
        creditosPorPeriodo: 4
      },
      semanal2x: {
        id: uuidPrefijo("86000000", 2),
        boxId: DEMO_BOX_IDS.plazaLasHeras,
        nombre: "Plaza 2x Semana",
        precioBase: 44000,
        duracionDias: 30,
        modalidadCreditos: "SEMANAL" as ModalidadCreditos,
        creditosPorPeriodo: 2
      },
      pack8: {
        id: uuidPrefijo("86000000", 3),
        boxId: DEMO_BOX_IDS.plazaLasHeras,
        nombre: "Pack 8 Clases Plaza",
        precioBase: 48000,
        duracionDias: 30,
        modalidadCreditos: "VIGENCIA_TOTAL" as ModalidadCreditos,
        creditosPorPeriodo: 8
      },
      libre: {
        id: uuidPrefijo("86000000", 4),
        boxId: DEMO_BOX_IDS.plazaLasHeras,
        nombre: "Plaza Libre",
        precioBase: 56000,
        duracionDias: 30,
        modalidadCreditos: "ILIMITADO" as ModalidadCreditos,
        creditosPorPeriodo: null
      }
    } satisfies Record<string, PlanSeed>;

    for (const p of [
      ...Object.values(planesForjaSur),
      ...Object.values(planesPlaza)
    ]) {
      await client.query(
        `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          p.id,
          p.boxId,
          p.nombre,
          p.precioBase,
          p.duracionDias,
          p.modalidadCreditos,
          p.creditosPorPeriodo
        ]
      );
    }

    // 6. Membresías y Pagos — Box Forja Sur (22 atletas)
    const inicioMesReciente = sumarDiasAFecha(hoyBA, -8);
    const fechaPagoReciente = sumarDiasAFecha(hoyBA, -6);

    const membresiasForjaMap = new Map<string, string>();
    let pagoSeqForja = 1;

    const asignarPlanForja = (indiceAtleta: number): PlanSeed => {
      if (indiceAtleta <= 7) return planesForjaSur.libreFull;
      if (indiceAtleta <= 14) return planesForjaSur.funcional3x;
      if (indiceAtleta <= 19) return planesForjaSur.funcional2x;
      if (indiceAtleta === 20) return planesForjaSur.packRunning;
      return planesForjaSur.funcional3x;
    };

    for (const atleta of atletasForjaSur) {
      const plan = asignarPlanForja(atleta.indice);
      const membresiaId = uuidPrefijo("77000000", atleta.indice);
      const fechaInicio = sumarDiasAFecha(
        inicioMesReciente,
        (atleta.indice % 5) - 2
      );
      const fechaFin = calcularFechaFinVigencia(fechaInicio, plan.duracionDias);
      // atleta17 tiene beca parcial ($65.000)
      const precioFinal = atleta.indice === 17 ? 65000 : plan.precioBase;
      const creditosExtra = atleta.indice === 16 ? 1 : 0;

      await client.query(
        `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          membresiaId,
          DEMO_BOX_IDS.forjaSur,
          atleta.afiliacionId,
          plan.id,
          precioFinal,
          plan.modalidadCreditos,
          plan.creditosPorPeriodo,
          creditosExtra,
          fechaInicio,
          fechaFin
        ]
      );
      membresiasForjaMap.set(atleta.afiliacionId, membresiaId);

      // Pagos
      if (atleta.indice === 17) {
        // Sofía Navarro: Morosa con beca parcial ($65.000) y pago parcial de $30.000
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
           VALUES ($1, $2, $3, 30000, 'TRANSFERENCIA', $4, $5)`,
          [
            uuidPrefijo("78000000", pagoSeqForja++),
            DEMO_BOX_IDS.forjaSur,
            membresiaId,
            fechaPagoReciente,
            staffForjaSur.recepcion.usuarioId
          ]
        );
      } else if (atleta.indice === 18) {
        // Lucas Pereyra: Pago erróneo anulado por Dueño 1 + pago correcto
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id, anulado_en, anulado_por_usuario_id, motivo_anulacion)
           VALUES ($1, $2, $3, 9200, 'EFECTIVO', $4, $5, NOW() - INTERVAL '3 days', $6, 'Importe mal tipeado (faltó un cero)')`,
          [
            uuidPrefijo("78000000", pagoSeqForja++),
            DEMO_BOX_IDS.forjaSur,
            membresiaId,
            fechaPagoReciente,
            staffForjaSur.recepcion.usuarioId,
            staffForjaSur.dueno1.usuarioId
          ]
        );
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
           VALUES ($1, $2, $3, $4, 'TRANSFERENCIA', $5, $6)`,
          [
            uuidPrefijo("78000000", pagoSeqForja++),
            DEMO_BOX_IDS.forjaSur,
            membresiaId,
            precioFinal,
            fechaPagoReciente,
            staffForjaSur.recepcion.usuarioId
          ]
        );
      } else if (atleta.indice === 19 || atleta.indice === 20) {
        // Dos morosos adicionales con pago parcial del 50%
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
           VALUES ($1, $2, $3, $4, 'EFECTIVO', $5, $6)`,
          [
            uuidPrefijo("78000000", pagoSeqForja++),
            DEMO_BOX_IDS.forjaSur,
            membresiaId,
            Math.round(precioFinal / 2),
            fechaPagoReciente,
            staffForjaSur.recepcion.usuarioId
          ]
        );
      } else if (atleta.indice <= 16 || atleta.indice === 21) {
        // Al día
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidPrefijo("78000000", pagoSeqForja++),
            DEMO_BOX_IDS.forjaSur,
            membresiaId,
            precioFinal,
            atleta.indice % 2 === 0 ? "TRANSFERENCIA" : "EFECTIVO",
            fechaPagoReciente,
            staffForjaSur.recepcion.usuarioId
          ]
        );
      }
      // atleta22 (pendiente de activar) queda sin pago cargado para mostrar deuda total pendiente
    }

    // 7. Membresías y Pagos — Plaza Las Heras (12 atletas)
    const membresiasPlazaMap = new Map<string, string>();
    let pagoSeqPlaza = 1;

    const asignarPlanPlaza = (indiceAtleta: number): PlanSeed => {
      if (indiceAtleta <= 3) return planesPlaza.libre;
      if (indiceAtleta <= 7) return planesPlaza.pack8;
      if (indiceAtleta <= 10) return planesPlaza.semanal2x;
      return planesPlaza.pack8;
    };

    for (const atleta of atletasPlaza) {
      const plan = asignarPlanPlaza(atleta.indice);
      const membresiaId = uuidPrefijo("87000000", atleta.indice);
      const fechaInicio = sumarDiasAFecha(inicioMesReciente, atleta.indice % 3);
      const fechaFin = calcularFechaFinVigencia(fechaInicio, plan.duracionDias);

      await client.query(
        `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)`,
        [
          membresiaId,
          DEMO_BOX_IDS.plazaLasHeras,
          atleta.afiliacionId,
          plan.id,
          plan.precioBase,
          plan.modalidadCreditos,
          plan.creditosPorPeriodo,
          fechaInicio,
          fechaFin
        ]
      );
      membresiasPlazaMap.set(atleta.afiliacionId, membresiaId);

      if (atleta.indice === 10 || atleta.indice === 11) {
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
           VALUES ($1, $2, $3, 20000, 'TRANSFERENCIA', $4, $5)`,
          [
            uuidPrefijo("88000000", pagoSeqPlaza++),
            DEMO_BOX_IDS.plazaLasHeras,
            membresiaId,
            fechaPagoReciente,
            staffPlaza.profeUnico.usuarioId
          ]
        );
      } else {
        await client.query(
          `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidPrefijo("88000000", pagoSeqPlaza++),
            DEMO_BOX_IDS.plazaLasHeras,
            membresiaId,
            plan.precioBase,
            atleta.indice % 2 === 0 ? "TRANSFERENCIA" : "EFECTIVO",
            fechaPagoReciente,
            staffPlaza.profeUnico.usuarioId
          ]
        );
      }
    }

    // 8. Reservas y Asistencias reales — Box Forja Sur
    let reservaSeqForja = 1;
    const clasesFuncionalFuturasForja = clasesForjaSur
      .filter(
        (c) =>
          c.tipoClaseId === tiposForjaSur.funcional &&
          c.inicio.getTime() > ahora.getTime()
      )
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

    const clasesRunningFuturasForja = clasesForjaSur
      .filter(
        (c) =>
          c.tipoClaseId === tiposForjaSur.running &&
          c.inicio.getTime() > ahora.getTime()
      )
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

    const clasesPasadasRecientesForja = clasesForjaSur
      .filter(
        (c) =>
          c.fin.getTime() <= ahora.getTime() &&
          ahora.getTime() - c.fin.getTime() <= 20 * 60 * 60 * 1000
      )
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime());

    const insertarReservaForja = async (params: {
      claseId: string;
      atletaIdx: number;
      estado?: "CONFIRMADA" | "CANCELADA" | "CANCELADA_TARDIA";
      conAsistencia?: boolean;
      coachUsuarioId?: string;
    }) => {
      const atleta = atletasForjaSur[params.atletaIdx]!;
      const membresiaId = membresiasForjaMap.get(atleta.afiliacionId)!;
      const estado = params.estado ?? "CONFIRMADA";
      await client.query(
        `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado, asistencia_marcada_en, asistencia_por_usuario_id, cancelada_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuidPrefijo("79000000", reservaSeqForja++),
          DEMO_BOX_IDS.forjaSur,
          params.claseId,
          atleta.afiliacionId,
          membresiaId,
          atleta.usuarioId,
          estado,
          params.conAsistencia ? new Date(ahora.getTime() - 30 * 60 * 1000) : null,
          params.conAsistencia ? (params.coachUsuarioId ?? staffForjaSur.dueno1.usuarioId) : null,
          estado === "CONFIRMADA" ? null : new Date(ahora.getTime() - 60 * 60 * 1000)
        ]
      );
    };

    // Primera clase futura de Funcional: LLENA 18 / 18 (atletas 0..17, dejando libre a atleta21 para probar rechazo)
    const claseLlenaForja = clasesFuncionalFuturasForja[0];
    if (claseLlenaForja) {
      for (let i = 0; i < 18; i++) {
        await insertarReservaForja({ claseId: claseLlenaForja.id, atletaIdx: i });
      }
    }

    // Segunda clase futura de Funcional: 15 / 18 (disponible con últimos lugares)
    const claseDisponibleForja = clasesFuncionalFuturasForja[1];
    if (claseDisponibleForja) {
      for (let i = 2; i < 17; i++) {
        await insertarReservaForja({ claseId: claseDisponibleForja.id, atletaIdx: i });
      }
    }

    // Tercera clase futura de Funcional (mañana): 18 / 18 llena
    const claseMananaLlenaForja = clasesFuncionalFuturasForja[3];
    if (claseMananaLlenaForja) {
      for (let i = 0; i < 18; i++) {
        await insertarReservaForja({
          claseId: claseMananaLlenaForja.id,
          atletaIdx: i
        });
      }
    }

    // Próxima clase de Running: 11 / 15 inscriptos
    const claseRunningProxima = clasesRunningFuturasForja[0];
    if (claseRunningProxima) {
      for (let i = 0; i < 10; i++) {
        await insertarReservaForja({ claseId: claseRunningProxima.id, atletaIdx: i });
      }
      await insertarReservaForja({ claseId: claseRunningProxima.id, atletaIdx: 19 });
    }

    // Eventos puntuales: Levantamiento (10/16) y Práctica RCP (12/20)
    for (let i = 0; i < 10; i++) {
      await insertarReservaForja({ claseId: eventoLevantamiento.id, atletaIdx: i });
    }
    for (let i = 0; i < 12; i++) {
      await insertarReservaForja({ claseId: eventoRcp.id, atletaIdx: i });
    }

    // Clases recién finalizadas (<24h): asistencia parcial marcada para probar corrección
    const claseReciente1 = clasesPasadasRecientesForja[0];
    if (claseReciente1) {
      for (let i = 0; i < 8; i++) {
        await insertarReservaForja({
          claseId: claseReciente1.id,
          atletaIdx: i,
          conAsistencia: i < 5,
          coachUsuarioId: staffForjaSur.dueno2.usuarioId
        });
      }
    }
    const claseReciente2 = clasesPasadasRecientesForja[1];
    if (claseReciente2) {
      for (let i = 5; i < 11; i++) {
        await insertarReservaForja({
          claseId: claseReciente2.id,
          atletaIdx: i,
          conAsistencia: i < 9,
          coachUsuarioId: staffForjaSur.coachMediodia.usuarioId
        });
      }
    }

    // 9. Reservas y Asistencias reales — Plaza Las Heras
    let reservaSeqPlaza = 1;
    const clasesFuturasPlaza = clasesPlaza
      .filter((c) => c.inicio.getTime() > ahora.getTime())
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    const clasesRecientesPlaza = clasesPlaza
      .filter(
        (c) =>
          c.fin.getTime() <= ahora.getTime() &&
          ahora.getTime() - c.fin.getTime() <= 20 * 60 * 60 * 1000
      )
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime());

    const insertarReservaPlaza = async (params: {
      claseId: string;
      atletaIdx: number;
      estado?: "CONFIRMADA" | "CANCELADA_TARDIA";
      conAsistencia?: boolean;
    }) => {
      const atleta = atletasPlaza[params.atletaIdx]!;
      const membresiaId = membresiasPlazaMap.get(atleta.afiliacionId)!;
      const estado = params.estado ?? "CONFIRMADA";
      await client.query(
        `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado, asistencia_marcada_en, asistencia_por_usuario_id, cancelada_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuidPrefijo("89000000", reservaSeqPlaza++),
          DEMO_BOX_IDS.plazaLasHeras,
          params.claseId,
          atleta.afiliacionId,
          membresiaId,
          atleta.usuarioId,
          estado,
          params.conAsistencia ? new Date(ahora.getTime() - 25 * 60 * 1000) : null,
          params.conAsistencia ? staffPlaza.profeUnico.usuarioId : null,
          estado === "CONFIRMADA" ? null : new Date(ahora.getTime() - 45 * 60 * 1000)
        ]
      );
    };

    // Primera clase futura de Plaza: LLENA 8 / 8 (atletas 0..7, dejando libre a atleta09)
    const claseLlenaPlaza = clasesFuturasPlaza[0];
    if (claseLlenaPlaza) {
      for (let i = 0; i < 8; i++) {
        await insertarReservaPlaza({ claseId: claseLlenaPlaza.id, atletaIdx: i });
      }
      // atleta12 (indice 11) con Cancelación Tardía en la misma clase
      await insertarReservaPlaza({
        claseId: claseLlenaPlaza.id,
        atletaIdx: 11,
        estado: "CANCELADA_TARDIA"
      });
    }

    // Segunda clase futura de Plaza: 6 / 8
    const claseDispPlaza = clasesFuturasPlaza[1];
    if (claseDispPlaza) {
      for (let i = 3; i < 9; i++) {
        await insertarReservaPlaza({ claseId: claseDispPlaza.id, atletaIdx: i });
      }
    }

    // Clase reciente de Plaza (<24h): asistencia marcada para 4 de 6
    const claseRecientePlaza = clasesRecientesPlaza[0];
    if (claseRecientePlaza) {
      for (let i = 0; i < 6; i++) {
        await insertarReservaPlaza({
          claseId: claseRecientePlaza.id,
          atletaIdx: i,
          conAsistencia: i < 4
        });
      }
    }

    await client.query("COMMIT");

    console.log(
      [
        "Seed demo aplicada correctamente:",
        `- Box Forja Sur: ${Object.keys(staffForjaSur).length} staff, ${atletasForjaSur.length} atletas, ${horariosForjaSur.length} horarios, ${clasesForjaSur.length} clases (incluidos Levantamiento Olímpico y Práctica RCP).`,
        `- Entrenamiento Plaza Las Heras: 1 profe dueño multi-rol, ${atletasPlaza.length} atletas, ${horariosPlaza.length} horarios, ${clasesPlaza.length} clases.`
      ].join("\n")
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarSeedDemo().catch((err) => {
    console.error("Error ejecutando seed demo:", err);
    process.exit(1);
  });
}
