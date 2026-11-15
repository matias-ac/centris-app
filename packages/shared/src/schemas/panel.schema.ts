import { z } from "zod";
import { sumarDiasAFecha } from "./clases.schema.js";
import { BoxSchema } from "./identidad.schema.js";
import { FechaCalendarioSchema } from "./membresias.schema.js";
import { MedioPagoSchema } from "./pagos.schema.js";
import { ModalidadCreditosSchema } from "./planes.schema.js";

const InstanteIsoSchema = z.string();

const NOMBRES_MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
] as const;

const DIAS_CORTOS_SEMANA = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom"
] as const;

export interface RangoMesLocal {
  inicioMes: string;
  finMes: string;
  clave: string;
  etiqueta: string;
}

/**
 * Calcula inicio, fin, clave (`YYYY-MM`) y nombre del mes en español a partir de una fecha local `YYYY-MM-DD`.
 */
export function obtenerRangoMesLocal(fechaLocal: string): RangoMesLocal {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaLocal);
  if (!match) {
    throw new Error(`Fecha local inválida para rango mensual: ${fechaLocal}`);
  }
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const mesPadded = String(mes).padStart(2, "0");
  const clave = `${anio}-${mesPadded}`;

  return {
    inicioMes: `${clave}-01`,
    finMes: `${clave}-${String(ultimoDia).padStart(2, "0")}`,
    clave,
    etiqueta: NOMBRES_MESES_ES[mes - 1] ?? clave
  };
}

export interface DiaSemanaPanelBase {
  fecha: string;
  diaCorto: string;
  esHoy: boolean;
}

/**
 * Genera los 7 días calendario de lunes a domingo para el gráfico semanal del Panel.
 */
export function construirDiasSemanaPanel(
  lunesYmd: string,
  hoyYmd: string
): DiaSemanaPanelBase[] {
  return DIAS_CORTOS_SEMANA.map((diaCorto, indice) => {
    const fecha = sumarDiasAFecha(lunesYmd, indice);
    return {
      fecha,
      diaCorto,
      esHoy: fecha === hoyYmd
    };
  });
}

export const DiaOcupacionSemanalSchema = z.object({
  fecha: FechaCalendarioSchema,
  diaCorto: z.string().min(1),
  cuposTotales: z.number().int().nonnegative(),
  reservasConfirmadas: z.number().int().nonnegative(),
  porcentaje: z.number().int().min(0).max(100),
  esHoy: z.boolean()
});

export const DesgloseMedioPagoPanelSchema = z.object({
  medioPago: MedioPagoSchema,
  label: z.string().min(1),
  total: z.number().int().nonnegative()
});

export const MorosoResumenPanelSchema = z.object({
  afiliacionId: z.string().uuid(),
  nombre: z.string().min(1),
  planNombre: z.string().min(1),
  deuda: z.number().int().positive()
});

export const ResumenGestionPanelSchema = z.object({
  ocupacionSemanal: z.object({
    dias: z.array(DiaOcupacionSemanalSchema),
    reservasSemana: z.number().int().nonnegative(),
    cuposSemana: z.number().int().nonnegative(),
    porcentajeHoy: z.number().int().min(0).max(100)
  }),
  cobranzaMes: z.object({
    totalCobrado: z.number().int().nonnegative(),
    totalPendiente: z.number().int().nonnegative(),
    porcentajeCobrado: z.number().int().min(0).max(100),
    desglosePorMedio: z.array(DesgloseMedioPagoPanelSchema)
  }),
  morosos: z.object({
    totalCantidad: z.number().int().nonnegative(),
    totalDeuda: z.number().int().nonnegative(),
    top: z.array(MorosoResumenPanelSchema)
  }),
  resumenOperativo: z.object({
    membresiasActivas: z.number().int().nonnegative(),
    membresiasPorVencer7Dias: z.number().int().nonnegative(),
    clasesHoy: z.number().int().nonnegative(),
    asistenciasSemana: z.number().int().nonnegative(),
    reservasCerradasSemana: z.number().int().nonnegative(),
    tasaAsistenciaPorcentaje: z.number().int().min(0).max(100)
  })
});

export const ClaseCoachHoyPanelSchema = z.object({
  id: z.string().uuid(),
  tipoClaseNombre: z.string().min(1),
  inicio: InstanteIsoSchema,
  fin: InstanteIsoSchema,
  cupos: z.number().int().nonnegative(),
  reservasConfirmadas: z.number().int().nonnegative(),
  asistenciasMarcadas: z.number().int().nonnegative(),
  canceladaEn: InstanteIsoSchema.nullable(),
  ventanaCorreccionAbierta: z.boolean()
});

export const ResumenCoachPanelSchema = z.object({
  clasesHoy: z.array(ClaseCoachHoyPanelSchema),
  clasesPendientesAsistencia24h: z.number().int().nonnegative(),
  atletasHoyACargo: z.number().int().nonnegative(),
  ventanaCorreccionHoras: z.number().int().positive()
});

export const MembresiaAtletaPanelSchema = z.object({
  id: z.string().uuid(),
  planNombre: z.string().min(1),
  modalidadCreditos: ModalidadCreditosSchema,
  fechaInicio: FechaCalendarioSchema,
  fechaFin: FechaCalendarioSchema,
  creditosPorPeriodo: z.number().int().nullable(),
  creditosDisponiblesPeriodo: z.number().int().nullable(),
  creditosExtra: z.number().int().nonnegative(),
  saldoPendiente: z.number().int().nonnegative(),
  esMoroso: z.boolean()
});

export const ProximaReservaAtletaPanelSchema = z.object({
  reservaId: z.string().uuid(),
  claseId: z.string().uuid(),
  tipoClaseNombre: z.string().min(1),
  coachNombre: z.string().min(1),
  inicio: InstanteIsoSchema,
  fin: InstanteIsoSchema,
  cupos: z.number().int().nonnegative(),
  reservasConfirmadas: z.number().int().nonnegative(),
  enCurso: z.boolean(),
  puedeCancelarSinCargo: z.boolean(),
  horaLimiteSinCargo: z.string().min(1)
});

export const ResumenAtletaPanelSchema = z.object({
  membresiaVigente: MembresiaAtletaPanelSchema.nullable(),
  membresiaFutura: z
    .object({
      id: z.string().uuid(),
      planNombre: z.string().min(1),
      fechaInicio: FechaCalendarioSchema,
      fechaFin: FechaCalendarioSchema
    })
    .nullable(),
  esMoroso: z.boolean(),
  saldoPendienteTotal: z.number().int().nonnegative(),
  proximasReservas: z.array(ProximaReservaAtletaPanelSchema)
});

export const ResumenPanelSchema = z.object({
  box: BoxSchema,
  fechaLocal: FechaCalendarioSchema,
  semana: z.object({
    desde: FechaCalendarioSchema,
    hasta: FechaCalendarioSchema
  }),
  mes: z.object({
    clave: z.string().min(7),
    etiqueta: z.string().min(1)
  }),
  gestion: ResumenGestionPanelSchema.nullable(),
  coach: ResumenCoachPanelSchema.nullable(),
  atleta: ResumenAtletaPanelSchema.nullable()
});

export type DiaOcupacionSemanal = z.infer<typeof DiaOcupacionSemanalSchema>;
export type DesgloseMedioPagoPanel = z.infer<typeof DesgloseMedioPagoPanelSchema>;
export type MorosoResumenPanel = z.infer<typeof MorosoResumenPanelSchema>;
export type ResumenGestionPanel = z.infer<typeof ResumenGestionPanelSchema>;
export type ClaseCoachHoyPanel = z.infer<typeof ClaseCoachHoyPanelSchema>;
export type ResumenCoachPanel = z.infer<typeof ResumenCoachPanelSchema>;
export type MembresiaAtletaPanel = z.infer<typeof MembresiaAtletaPanelSchema>;
export type ProximaReservaAtletaPanel = z.infer<typeof ProximaReservaAtletaPanelSchema>;
export type ResumenAtletaPanel = z.infer<typeof ResumenAtletaPanelSchema>;
export type ResumenPanel = z.infer<typeof ResumenPanelSchema>;
