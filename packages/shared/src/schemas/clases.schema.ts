import { z } from "zod";
import { esTimezoneIanaValida } from "./identidad.schema.js";
import { FechaCalendarioSchema } from "./membresias.schema.js";

const InstanteSchema = z.union([z.date(), z.string()]);

export const ClaseSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  horarioId: z.string().uuid().nullable(),
  tipoClaseId: z.string().uuid(),
  coachAfiliacionId: z.string().uuid(),
  inicio: InstanteSchema,
  fin: InstanteSchema,
  cupos: z.number().int().min(1, "Los cupos deben ser al menos 1"),
  canceladaEn: InstanteSchema.nullable(),
  createdAt: InstanteSchema,
  updatedAt: InstanteSchema,
  deletedAt: InstanteSchema.nullable().optional(),
  tipoClaseNombre: z.string().optional(),
  coachNombre: z.string().optional(),
  reservasConfirmadas: z.number().int().min(0).optional()
});

export type Clase = z.infer<typeof ClaseSchema>;

export const EditarClaseSchema = z
  .object({
    coachAfiliacionId: z
      .string()
      .uuid("La afiliación del coach debe ser un UUID válido")
      .optional(),
    inicio: z
      .string()
      .datetime({
        offset: true,
        message: "El inicio debe ser un instante ISO 8601 válido"
      })
      .optional(),
    duracionMinutos: z.coerce
      .number()
      .int("La duración debe ser un número entero de minutos")
      .min(1, "La duración mínima es de 1 minuto")
      .optional(),
    cupos: z.coerce
      .number()
      .int("Los cupos deben ser un número entero")
      .min(1, "Los cupos deben ser al menos 1")
      .optional()
  })
  .refine((edicion) => Object.values(edicion).some((v) => v !== undefined), {
    message: "Debe indicar al menos un campo de la Clase a editar"
  });

export type EditarClase = z.infer<typeof EditarClaseSchema>;

export const FiltroClasesSchema = z
  .object({
    desde: FechaCalendarioSchema.optional(),
    hasta: FechaCalendarioSchema.optional()
  })
  .refine(
    ({ desde, hasta }) => desde === undefined || hasta === undefined || desde <= hasta,
    { message: "El rango de fechas es inválido: 'desde' no puede ser posterior a 'hasta'" }
  );

export type FiltroClases = z.infer<typeof FiltroClasesSchema>;

export interface EntradaInstantesClase {
  /** Fecha calendario local del Box en formato `YYYY-MM-DD`. */
  fechaLocal: string;
  /** Hora local del Box en formato `HH:mm`. */
  horaInicio: string;
  duracionMinutos: number;
  /** Zona horaria IANA del Box. */
  timezone: string;
}

export interface InstantesClase {
  inicio: Date;
  fin: Date;
}

const MS_POR_MINUTO = 60_000;

/**
 * Diferencia en milisegundos entre la hora de pared de `timezone` y UTC
 * en el instante dado (positiva al este de Greenwich).
 */
function desfasajeMs(instante: Date, timezone: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }).formatToParts(instante);

  const valor = (tipo: Intl.DateTimeFormatPartTypes): number =>
    Number(partes.find((parte) => parte.type === tipo)?.value);

  const comoUtc = Date.UTC(
    valor("year"),
    valor("month") - 1,
    valor("day"),
    valor("hour"),
    valor("minute"),
    valor("second")
  );
  const instanteSinMilisegundos = Math.floor(instante.getTime() / 1000) * 1000;
  return comoUtc - instanteSinMilisegundos;
}

/**
 * Convierte una fecha y hora locales del Box en los instantes `inicio` y `fin`
 * de una Clase (ADR 0005), respetando el offset vigente en esa fecha.
 */
export function calcularInstantesClase(
  entrada: EntradaInstantesClase
): InstantesClase {
  if (!esTimezoneIanaValida(entrada.timezone)) {
    throw new Error(`Zona horaria IANA inválida: ${entrada.timezone}`);
  }

  const [anio, mes, dia] = entrada.fechaLocal.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const [hora, minuto] = entrada.horaInicio.split(":").map(Number) as [
    number,
    number
  ];

  const comoSiFueraUtc = Date.UTC(anio, mes - 1, dia, hora, minuto);
  const primeraEstimacion =
    comoSiFueraUtc - desfasajeMs(new Date(comoSiFueraUtc), entrada.timezone);
  const instanteInicio =
    comoSiFueraUtc - desfasajeMs(new Date(primeraEstimacion), entrada.timezone);

  const inicio = new Date(instanteInicio);
  const fin = new Date(instanteInicio + entrada.duracionMinutos * MS_POR_MINUTO);
  return { inicio, fin };
}

/** Devuelve el día de la semana ISO (1 = Lunes, ..., 7 = Domingo). */
export function diaSemanaIso(fechaLocal: string): number {
  const diaUtc = new Date(`${fechaLocal}T00:00:00.000Z`).getUTCDay();
  return diaUtc === 0 ? 7 : diaUtc;
}

/** Obtiene la fecha calendario `YYYY-MM-DD` de un instante en la zona horaria del Box. */
export function obtenerFechaLocal(instante: Date, timezone: string): string {
  if (!esTimezoneIanaValida(timezone)) {
    throw new Error(`Zona horaria IANA inválida: ${timezone}`);
  }
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instante);
  const anio = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;
  return `${anio}-${mes}-${dia}`;
}

/** Suma días a una fecha calendario `YYYY-MM-DD`. */
export function sumarDiasAFecha(fecha: string, dias: number): string {
  const ms = new Date(`${fecha}T00:00:00.000Z`).getTime() + dias * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

