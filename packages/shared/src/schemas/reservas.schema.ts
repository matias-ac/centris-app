import { z } from "zod";
import {
  diaSemanaIso,
  obtenerFechaLocal,
  sumarDiasAFecha
} from "./clases.schema.js";
import { FechaCalendarioSchema } from "./membresias.schema.js";
import type { ModalidadCreditos } from "./planes.schema.js";

const InstanteSchema = z.union([z.date(), z.string()]);

export const ESTADOS_RESERVA = [
  "CONFIRMADA",
  "CANCELADA",
  "CANCELADA_TARDIA",
  "CANCELADA_POR_BOX"
] as const;

export const EstadoReservaSchema = z.enum(ESTADOS_RESERVA);

export type EstadoReserva = z.infer<typeof EstadoReservaSchema>;

/**
 * Estados de Reserva que mantienen el Crédito consumido en el Período (ADR 0003, PRD §4.2.3).
 * Tanto las Reservas confirmadas (incluyendo Asistencia y Ausencia) como las Cancelaciones Tardías
 * consumen Crédito; las Canceladas en término y las Canceladas por el Box restituyen el Crédito.
 */
export const ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO: readonly EstadoReserva[] = [
  "CONFIRMADA",
  "CANCELADA_TARDIA"
] as const;

export const ReservaSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  claseId: z.string().uuid(),
  afiliacionId: z.string().uuid(),
  membresiaId: z.string().uuid(),
  creadaPorUsuarioId: z.string().uuid(),
  estado: EstadoReservaSchema,
  asistenciaMarcadaEn: InstanteSchema.nullable(),
  asistenciaPorUsuarioId: z.string().uuid().nullable(),
  canceladaEn: InstanteSchema.nullable(),
  createdAt: InstanteSchema,
  updatedAt: InstanteSchema,
  claseInicio: InstanteSchema.optional(),
  claseFin: InstanteSchema.optional(),
  tipoClaseNombre: z.string().optional(),
  coachNombre: z.string().optional(),
  atletaNombre: z.string().optional(),
  atletaEmail: z.string().optional(),
  ausenciaConsolidada: z.boolean().optional()
});

export type Reserva = z.infer<typeof ReservaSchema>;

export const CrearReservaSchema = z.object({
  claseId: z.string().uuid("El identificador de la Clase debe ser un UUID válido"),
  afiliacionId: z
    .string()
    .uuid("El identificador de la Afiliación debe ser un UUID válido")
    .optional()
});

export type CrearReserva = z.infer<typeof CrearReservaSchema>;

export const FiltroReservasSchema = z
  .object({
    afiliacionId: z.string().uuid().optional(),
    claseId: z.string().uuid().optional(),
    estado: EstadoReservaSchema.optional(),
    desde: FechaCalendarioSchema.optional(),
    hasta: FechaCalendarioSchema.optional()
  })
  .refine(
    ({ desde, hasta }) =>
      desde === undefined || hasta === undefined || desde <= hasta,
    {
      message:
        "El rango de fechas es inválido: 'desde' no puede ser posterior a 'hasta'"
    }
  );

export type FiltroReservas = z.infer<typeof FiltroReservasSchema>;

export interface RangoPeriodoSemanal {
  lunes: string;
  domingo: string;
}

export interface PeriodoSemanalInstante extends RangoPeriodoSemanal {
  fechaLocal: string;
}

/**
 * Calcula el rango de fechas calendario (`lunes` a `domingo`, inclusivo)
 * del Período semanal ISO al que pertenece una fecha local `YYYY-MM-DD` (ADR 0005).
 */
export function obtenerRangoPeriodoSemanal(
  fechaLocal: string
): RangoPeriodoSemanal {
  const diaIso = diaSemanaIso(fechaLocal);
  const lunes = sumarDiasAFecha(fechaLocal, -(diaIso - 1));
  const domingo = sumarDiasAFecha(lunes, 6);
  return { lunes, domingo };
}

/**
 * Convierte un instante UTC a la zona horaria IANA del Box y devuelve su fecha local
 * junto con el Período semanal (`lunes` a `domingo`) al que se imputa el Crédito (ADR 0005).
 */
export function obtenerPeriodoSemanalDeInstante(
  instante: Date,
  timezone: string
): PeriodoSemanalInstante {
  const fechaLocal = obtenerFechaLocal(instante, timezone);
  const { lunes, domingo } = obtenerRangoPeriodoSemanal(fechaLocal);
  return { fechaLocal, lunes, domingo };
}

export interface EntradaDisponibilidadCreditos {
  modalidadCreditos: ModalidadCreditos;
  creditosPorPeriodo: number | null;
  creditosExtra: number;
  /**
   * Fechas calendario locales (`YYYY-MM-DD`, en timezone del Box) de todas las Clases
   * con Reserva que consume Crédito (`CONFIRMADA` o `CANCELADA_TARDIA`) asociadas a la Membresía.
   */
  fechasClasesConsumidas: string[];
  /** Fecha calendario local (`YYYY-MM-DD`, en timezone del Box) de la Clase que se desea reservar. */
  fechaClaseObjetivo: string;
}

export interface ResultadoDisponibilidadCreditos {
  disponible: boolean;
  creditosRestantesPeriodo: number | null;
  creditosExtraRestantes: number;
  usaCreditoExtra: boolean;
}

/**
 * Evalúa la disponibilidad de Créditos de una Membresía para la fecha local de una Clase (PRD §4.2.3):
 * - `ILIMITADO`: siempre disponible (`creditosRestantesPeriodo = null`).
 * - `VIGENCIA_TOTAL`: el Período abarca toda la Vigencia; consume primero `creditosPorPeriodo` y luego `creditosExtra`.
 * - `SEMANAL`: en cada semana ISO (lunes a domingo en timezone del Box) consume primero `creditosPorPeriodo`;
 *   todo exceso semanal en cualquier semana de la Vigencia descuenta de la bolsa única `creditosExtra`
 *   (que nunca se renueva los lunes).
 */
export function calcularDisponibilidadCreditos(
  entrada: EntradaDisponibilidadCreditos
): ResultadoDisponibilidadCreditos {
  const {
    modalidadCreditos,
    creditosPorPeriodo,
    creditosExtra,
    fechasClasesConsumidas,
    fechaClaseObjetivo
  } = entrada;

  if (modalidadCreditos === "ILIMITADO") {
    return {
      disponible: true,
      creditosRestantesPeriodo: null,
      creditosExtraRestantes: creditosExtra,
      usaCreditoExtra: false
    };
  }

  const creditosBase = creditosPorPeriodo ?? 0;

  if (modalidadCreditos === "VIGENCIA_TOTAL") {
    const consumidos = fechasClasesConsumidas.length;
    const creditosRestantesPeriodo = Math.max(0, creditosBase - consumidos);
    const extraUsados = Math.max(0, consumidos - creditosBase);
    const creditosExtraRestantes = Math.max(0, creditosExtra - extraUsados);
    const disponible =
      creditosRestantesPeriodo > 0 || creditosExtraRestantes > 0;

    return {
      disponible,
      creditosRestantesPeriodo,
      creditosExtraRestantes,
      usaCreditoExtra:
        disponible && creditosRestantesPeriodo === 0 && creditosExtraRestantes > 0
    };
  }

  // Modalidad SEMANAL: agrupar consumos por el lunes de cada Período semanal ISO
  const consumosPorSemana = new Map<string, number>();
  for (const fecha of fechasClasesConsumidas) {
    const { lunes } = obtenerRangoPeriodoSemanal(fecha);
    consumosPorSemana.set(lunes, (consumosPorSemana.get(lunes) ?? 0) + 1);
  }

  let extraUsadosEnVigencia = 0;
  for (const cantidadSemana of consumosPorSemana.values()) {
    if (cantidadSemana > creditosBase) {
      extraUsadosEnVigencia += cantidadSemana - creditosBase;
    }
  }

  const { lunes: lunesObjetivo } =
    obtenerRangoPeriodoSemanal(fechaClaseObjetivo);
  const consumidosEnSemanaObjetivo =
    consumosPorSemana.get(lunesObjetivo) ?? 0;

  const creditosRestantesPeriodo = Math.max(
    0,
    creditosBase - consumidosEnSemanaObjetivo
  );
  const creditosExtraRestantes = Math.max(
    0,
    creditosExtra - extraUsadosEnVigencia
  );
  const disponible =
    creditosRestantesPeriodo > 0 || creditosExtraRestantes > 0;

  return {
    disponible,
    creditosRestantesPeriodo,
    creditosExtraRestantes,
    usaCreditoExtra:
      disponible && creditosRestantesPeriodo === 0 && creditosExtraRestantes > 0
  };
}

export interface EntradaEvaluarVentanaCancelacion {
  claseInicio: Date | string;
  ahora: Date | string;
  ventanaCancelacionMinutos: number;
}

export interface ResultadoVentanaCancelacion {
  permitida: boolean;
  esTardia: boolean;
  estadoResultante: "CANCELADA" | "CANCELADA_TARDIA" | null;
  devuelveCredito: boolean;
}

const MS_POR_MINUTO_VENTANA = 60_000;

/**
 * Evalúa el efecto de cancelar una Reserva en el instante `ahora` respecto a `claseInicio`
 * y la `Ventana de Cancelación` configurada en el Box (PRD §4.4.2, GLOSSARY.md):
 * - Si `ahora > claseInicio`: la Clase ya comenzó; no se admite cancelación (`permitida = false`).
 * - Si `ahora <= claseInicio - ventanaCancelacionMinutos`: cancelación en término (`CANCELADA`, devuelve Crédito).
 * - Si `ahora` cae en `(claseInicio - ventanaCancelacionMinutos, claseInicio]`: Cancelación Tardía
 *   (`CANCELADA_TARDIA`, libera el Cupo pero no devuelve el Crédito).
 */
export function evaluarVentanaCancelacion(
  entrada: EntradaEvaluarVentanaCancelacion
): ResultadoVentanaCancelacion {
  const inicioMs =
    typeof entrada.claseInicio === "string"
      ? new Date(entrada.claseInicio).getTime()
      : entrada.claseInicio.getTime();
  const ahoraMs =
    typeof entrada.ahora === "string"
      ? new Date(entrada.ahora).getTime()
      : entrada.ahora.getTime();

  if (ahoraMs > inicioMs) {
    return {
      permitida: false,
      esTardia: false,
      estadoResultante: null,
      devuelveCredito: false
    };
  }

  const limiteSinPenalidadMs =
    inicioMs - entrada.ventanaCancelacionMinutos * MS_POR_MINUTO_VENTANA;

  if (ahoraMs <= limiteSinPenalidadMs) {
    return {
      permitida: true,
      esTardia: false,
      estadoResultante: "CANCELADA",
      devuelveCredito: true
    };
  }

  return {
    permitida: true,
    esTardia: true,
    estadoResultante: "CANCELADA_TARDIA",
    devuelveCredito: false
  };
}

export const HORAS_VENTANA_CORRECCION_ASISTENCIA = 24;
const MS_POR_HORA = 3_600_000;

export const RegistrarAsistenciaSchema = z.object({
  presente: z.boolean({
    required_error: "El estado de asistencia (presente) es requerido."
  })
});

export type RegistrarAsistencia = z.infer<typeof RegistrarAsistenciaSchema>;

export interface EntradaEvaluarVentanaCorreccionAsistencia {
  claseFin: Date | string;
  ahora?: Date | string;
}

export interface ResultadoVentanaCorreccionAsistencia {
  dentroDeVentana: boolean;
  expirada: boolean;
  limiteCorreccion: Date;
}

/**
 * Evalúa si una operación de marcado o rectificación de Asistencia se encuentra
 * dentro de la Ventana de Corrección de Asistencia (24 hs posteriores a `clase.fin`) (PRD §4.4.3, GLOSSARY.md).
 */
export function evaluarVentanaCorreccionAsistencia(
  entrada: EntradaEvaluarVentanaCorreccionAsistencia
): ResultadoVentanaCorreccionAsistencia {
  const finMs =
    typeof entrada.claseFin === "string"
      ? new Date(entrada.claseFin).getTime()
      : entrada.claseFin.getTime();
  const ahoraMs = entrada.ahora
    ? typeof entrada.ahora === "string"
      ? new Date(entrada.ahora).getTime()
      : entrada.ahora.getTime()
    : Date.now();

  const limiteMs = finMs + HORAS_VENTANA_CORRECCION_ASISTENCIA * MS_POR_HORA;
  const expirada = ahoraMs > limiteMs;

  return {
    dentroDeVentana: !expirada,
    expirada,
    limiteCorreccion: new Date(limiteMs)
  };
}

export interface EntradaEvaluarAusenciaConsolidada {
  estado: EstadoReserva;
  asistenciaMarcadaEn: Date | string | null;
  claseFin?: Date | string | null;
}

/**
 * Determina si una Reserva confirmada se ha consolidado como Ausencia por no registrar Asistencia
 * tras el vencimiento de la Ventana de Corrección de Asistencia de 24 hs (ADR 0003, GLOSSARY.md).
 */
export function esAusenciaConsolidada(
  reserva: EntradaEvaluarAusenciaConsolidada,
  ahora?: Date | string
): boolean {
  if (reserva.estado !== "CONFIRMADA") {
    return false;
  }
  if (reserva.asistenciaMarcadaEn !== null) {
    return false;
  }
  if (!reserva.claseFin) {
    return false;
  }

  const ventana = evaluarVentanaCorreccionAsistencia({
    claseFin: reserva.claseFin,
    ahora
  });

  return ventana.expirada;
}
