import { esTimezoneIanaValida } from "./identidad.schema.js";

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
