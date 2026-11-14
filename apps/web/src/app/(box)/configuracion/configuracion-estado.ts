import {
  ActualizarConfiguracionBoxSchema,
  ERROR_CODES,
  type ActualizarConfiguracionBox,
  type Box,
  type ErrorCode
} from "@centris/shared";

export interface OpcionSelect {
  value: string;
  label: string;
}

export interface AtajoVentanaCancelacion {
  minutos: number;
  label: string;
}

export interface BorradorConfiguracionBox {
  nombre: string;
  timezone: string;
  moneda: string;
  anticipacionReservaDias: string;
  ventanaCancelacionMinutos: string;
}

export interface ErroresConfiguracionBox {
  nombre?: string;
  timezone?: string;
  moneda?: string;
  anticipacionReservaDias?: string;
  ventanaCancelacionMinutos?: string;
  general?: string;
}

export type ResultadoValidacionConfiguracion =
  | { ok: true; datos: ActualizarConfiguracionBox }
  | { ok: false; errores: ErroresConfiguracionBox };

export type ResultadoAccionConfiguracion =
  | { ok: true }
  | { ok: false; errorCode?: string; message?: string };

export type AccionGuardarConfiguracionFn = (
  boxId: string,
  input: ActualizarConfiguracionBox
) => Promise<ResultadoAccionConfiguracion>;

export type ResultadoGuardadoConfiguracion =
  | { ok: true; datosGuardados: ActualizarConfiguracionBox }
  | { ok: false; errores: ErroresConfiguracionBox };

export interface VistaPreviaOperativaBox {
  relojLocal: string;
  zonaElegidaLabel: string;
  ejemploMoneda: string;
  horizonteTitulo: string;
  horizonteDetalle: string;
  cancelacionTitulo: string;
  cancelacionDetalle: string;
  equivalenciaVentana: string;
}

export const OPCIONES_TIMEZONE: readonly OpcionSelect[] = [
  {
    value: "America/Argentina/Buenos_Aires",
    label: "Argentina, Buenos Aires (UTC-3)"
  },
  {
    value: "America/Argentina/Cordoba",
    label: "Argentina, Córdoba (UTC-3)"
  },
  {
    value: "America/Argentina/Mendoza",
    label: "Argentina, Mendoza (UTC-3)"
  },
  {
    value: "America/Montevideo",
    label: "Uruguay, Montevideo (UTC-3)"
  },
  {
    value: "America/Santiago",
    label: "Chile, Santiago (UTC-3/-4)"
  },
  {
    value: "America/Bogota",
    label: "Colombia, Bogotá (UTC-5)"
  },
  {
    value: "America/Mexico_City",
    label: "México, Ciudad de México (UTC-6)"
  },
  {
    value: "Europe/Madrid",
    label: "España, Madrid (UTC+1/+2)"
  }
];

export const OPCIONES_MONEDA: readonly OpcionSelect[] = [
  { value: "ARS", label: "ARS (Peso argentino $)" },
  { value: "USD", label: "USD (Dólar estadounidense US$)" },
  { value: "UYU", label: "UYU (Peso uruguayo $U)" },
  { value: "CLP", label: "CLP (Peso chileno $)" },
  { value: "MXN", label: "MXN (Peso mexicano $)" },
  { value: "COP", label: "COP (Peso colombiano $)" },
  { value: "EUR", label: "EUR (Euro €)" }
];

export const ATAJOS_VENTANA_CANCELACION: readonly AtajoVentanaCancelacion[] = [
  { minutos: 30, label: "30 min" },
  { minutos: 60, label: "1 hora (60 min)" },
  { minutos: 120, label: "2 horas (120 min)" },
  { minutos: 360, label: "6 horas (360 min)" },
  { minutos: 1440, label: "24 horas (1440 min)" }
];

const MENSAJES_ERROR_SERVIDOR: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "Solo un usuario con rol de Administrador puede modificar la configuración del Box.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo antes de guardar estos cambios.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión venció. Volvé a iniciar sesión para guardar la configuración.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá los valores ingresados antes de guardar la configuración."
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos guardar la configuración en este momento. Intentá nuevamente en unos segundos.";

function parsearEnteroEstricto(valor: string): number {
  const limpio = valor.trim();
  if (!/^-?\d+$/.test(limpio)) {
    return Number.NaN;
  }
  return Number(limpio);
}

function formatearNombreZonaFallback(timezone: string): string {
  const segmento = timezone.trim().split("/").filter(Boolean).pop();
  if (!segmento) {
    return "Zona horaria configurada";
  }
  return segmento.replaceAll("_", " ");
}

export function resolverOpcionesTimezone(
  timezoneActual: string
): readonly OpcionSelect[] {
  if (
    !timezoneActual ||
    OPCIONES_TIMEZONE.some((opt) => opt.value === timezoneActual)
  ) {
    return OPCIONES_TIMEZONE;
  }
  return [
    {
      value: timezoneActual,
      label: formatearNombreZonaFallback(timezoneActual)
    },
    ...OPCIONES_TIMEZONE
  ];
}

export function resolverOpcionesMoneda(
  monedaActual: string
): readonly OpcionSelect[] {
  if (!monedaActual || OPCIONES_MONEDA.some((opt) => opt.value === monedaActual)) {
    return OPCIONES_MONEDA;
  }
  return [
    { value: monedaActual, label: monedaActual },
    ...OPCIONES_MONEDA
  ];
}

export function crearBorradorDesdeBox(box: Box): BorradorConfiguracionBox {
  return {
    nombre: box.nombre,
    timezone: box.timezone,
    moneda: box.moneda,
    anticipacionReservaDias: String(box.anticipacionReservaDias),
    ventanaCancelacionMinutos: String(box.ventanaCancelacionMinutos)
  };
}

/**
 * Traduce los minutos de ventana de cancelación a una descripción legible en español.
 */
export function formatearMinutosVentana(min: number): string {
  if (!Number.isInteger(min) || min < 0 || min > 10080) {
    return "Valor fuera de rango";
  }
  if (min === 0) {
    return "Sin restricción (0 min)";
  }
  if (min < 60) {
    return `${min} minuto${min === 1 ? "" : "s"}`;
  }

  const horas = Math.floor(min / 60);
  const minutosRestantes = min % 60;

  if (horas >= 24 && horas % 24 === 0 && minutosRestantes === 0) {
    const dias = horas / 24;
    return `${dias} día${dias === 1 ? "" : "s"} (${min} min)`;
  }
  if (minutosRestantes === 0) {
    return `${horas} hora${horas === 1 ? "" : "s"} (${min} min)`;
  }
  return `${horas} h ${minutosRestantes} min (${min} min)`;
}

/**
 * Evalúa si el borrador difiere de los valores persistidos en el Box.
 */
export function hayCambiosPendientesConfiguracion(
  guardado: Box,
  borrador: BorradorConfiguracionBox
): boolean {
  const dias = parsearEnteroEstricto(borrador.anticipacionReservaDias);
  const minutos = parsearEnteroEstricto(borrador.ventanaCancelacionMinutos);

  return (
    borrador.nombre.trim() !== guardado.nombre ||
    borrador.timezone !== guardado.timezone ||
    borrador.moneda !== guardado.moneda ||
    dias !== guardado.anticipacionReservaDias ||
    minutos !== guardado.ventanaCancelacionMinutos
  );
}

/**
 * Valida cada campo individualmente y verifica el contrato compartido ActualizarConfiguracionBoxSchema.
 */
export function validarConfiguracionBox(
  borrador: BorradorConfiguracionBox
): ResultadoValidacionConfiguracion {
  const errores: ErroresConfiguracionBox = {};
  const nombreLimpio = borrador.nombre.trim();
  const dias = parsearEnteroEstricto(borrador.anticipacionReservaDias);
  const minutos = parsearEnteroEstricto(borrador.ventanaCancelacionMinutos);

  if (nombreLimpio.length < 1 || nombreLimpio.length > 120) {
    errores.nombre =
      "Ingresá un nombre visible de entre 1 y 120 caracteres.";
  }

  if (!Number.isInteger(dias) || dias < 1 || dias > 90) {
    errores.anticipacionReservaDias =
      "Indicá un número entero entre 1 y 90 días.";
  }

  if (!Number.isInteger(minutos) || minutos < 0 || minutos > 10080) {
    errores.ventanaCancelacionMinutos =
      "Indicá un número entero entre 0 y 10080 minutos.";
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const validado = ActualizarConfiguracionBoxSchema.safeParse({
    nombre: nombreLimpio,
    timezone: borrador.timezone,
    moneda: borrador.moneda,
    anticipacionReservaDias: dias,
    ventanaCancelacionMinutos: minutos
  });

  if (!validado.success) {
    const campo = validado.error.issues[0]?.path[0];
    const mensaje =
      validado.error.issues[0]?.message ??
      "Revisá los valores ingresados en el formulario.";
    if (campo === "timezone") {
      errores.timezone = mensaje;
    } else if (campo === "moneda") {
      errores.moneda = mensaje;
    } else if (campo === "anticipacionReservaDias") {
      errores.anticipacionReservaDias =
        "Indicá un número entero entre 1 y 90 días.";
    } else if (campo === "ventanaCancelacionMinutos") {
      errores.ventanaCancelacionMinutos =
        "Indicá un número entero entre 0 y 10080 minutos.";
    } else {
      errores.general = mensaje;
    }
    return { ok: false, errores };
  }

  return { ok: true, datos: validado.data };
}

/**
 * Calcula los indicadores en vivo de la tarjeta derecha en la zona horaria y moneda elegidas.
 */
export function calcularVistaPreviaOperativa(
  borrador: BorradorConfiguracionBox,
  ahora: Date = new Date()
): VistaPreviaOperativaBox {
  const opcionesTz = resolverOpcionesTimezone(borrador.timezone);
  const zonaEncontrada = opcionesTz.find(
    (opt) => opt.value === borrador.timezone
  );
  const zonaElegidaLabel =
    zonaEncontrada?.label ?? formatearNombreZonaFallback(borrador.timezone);

  let relojLocal = "Horario no disponible";
  try {
    relojLocal = new Intl.DateTimeFormat("es-AR", {
      timeZone: borrador.timezone,
      dateStyle: "medium",
      timeStyle: "short"
    }).format(ahora);
  } catch {
    relojLocal = "Horario no disponible";
  }

  let ejemploMoneda = `${borrador.moneda} 38.000`;
  try {
    ejemploMoneda = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: borrador.moneda,
      maximumFractionDigits: 0
    }).format(38000);
  } catch {
    ejemploMoneda = `${borrador.moneda} 38.000`;
  }

  const dias = parsearEnteroEstricto(borrador.anticipacionReservaDias);
  let horizonteTitulo = "Revisá los días";
  let horizonteDetalle = "Debe estar entre 1 y 90 días.";
  if (Number.isInteger(dias) && dias >= 1 && dias <= 90) {
    const fechaLimite = new Date(ahora.getTime() + dias * 86_400_000);
    let fechaStr = `dentro de ${dias} días`;
    try {
      fechaStr = new Intl.DateTimeFormat("es-AR", {
        timeZone: borrador.timezone,
        weekday: "long",
        day: "numeric",
        month: "short"
      }).format(fechaLimite);
    } catch {
      fechaStr = `dentro de ${dias} días`;
    }
    horizonteTitulo = `Hasta ${dias} día${dias === 1 ? "" : "s"}`;
    horizonteDetalle = `Hoy un atleta puede reservar clases hasta el ${fechaStr}.`;
  }

  const minutos = parsearEnteroEstricto(borrador.ventanaCancelacionMinutos);
  const ventanaValida =
    Number.isInteger(minutos) && minutos >= 0 && minutos <= 10080;
  const textoHumano = ventanaValida ? formatearMinutosVentana(minutos) : "";

  const equivalenciaVentana = ventanaValida
    ? `Equivale a: ${textoHumano}.`
    : "Ingresá un valor entre 0 y 10080 minutos.";

  const cancelacionTitulo = !ventanaValida
    ? "Revisá los minutos"
    : minutos === 0
      ? "En cualquier momento"
      : `${textoHumano} antes`;

  const cancelacionDetalle = !ventanaValida
    ? "Debe estar entre 0 y 10080 minutos (7 días)."
    : minutos === 0
      ? "Incluso minutos antes de empezar la clase, la cancelación devuelve el crédito."
      : `Si cancela con al menos ${textoHumano} de anticipación recupera el crédito; pasado ese límite pasa a ser cancelación tardía.`;

  return {
    relojLocal,
    zonaElegidaLabel,
    ejemploMoneda,
    horizonteTitulo,
    horizonteDetalle,
    cancelacionTitulo,
    cancelacionDetalle,
    equivalenciaVentana
  };
}

/**
 * Traduce códigos de error del servidor a copy humano sin exponer errorCode ni códigos HTTP.
 */
export function traducirErrorConfiguracionBox(errorCode?: string): string {
  if (errorCode && errorCode in MENSAJES_ERROR_SERVIDOR) {
    return (
      MENSAJES_ERROR_SERVIDOR[errorCode as ErrorCode] ?? MENSAJE_ERROR_RESPALDO
    );
  }
  return MENSAJE_ERROR_RESPALDO;
}

/**
 * Ejecuta validación local y persistencia mediante Server Action devolviendo errores limpios.
 */
export async function procesarGuardadoConfiguracion(
  boxId: string,
  borrador: BorradorConfiguracionBox,
  accionGuardar: AccionGuardarConfiguracionFn
): Promise<ResultadoGuardadoConfiguracion> {
  const validacion = validarConfiguracionBox(borrador);
  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  try {
    const res = await accionGuardar(boxId, validacion.datos);
    if (!res.ok) {
      return {
        ok: false,
        errores: {
          general: traducirErrorConfiguracionBox(res.errorCode)
        }
      };
    }
    return { ok: true, datosGuardados: validacion.datos };
  } catch {
    return {
      ok: false,
      errores: { general: MENSAJE_ERROR_RESPALDO }
    };
  }
}
