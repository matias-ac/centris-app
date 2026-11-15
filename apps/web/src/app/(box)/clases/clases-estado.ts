import {
  CancelarClaseSchema,
  CrearReservaSchema,
  ERROR_CODES,
  EditarClaseSchema,
  RegistrarAsistenciaSchema,
  evaluarVentanaCorreccionAsistencia,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type Clase,
  type CrearReserva,
  type EditarClase,
  type CancelarClase,
  type RegistrarAsistencia
} from "@centris/shared";

export interface VentanaAsistenciaUI {
  estado: "PERMITIDA" | "NO_INICIADA" | "VENCIDA";
  motivo: string | null;
  activa: boolean;
  limiteCorreccion: Date;
}

export interface ResultadoAccionClases {
  ok: boolean;
  message?: string;
  errorCode?: string;
}

export type ResultadoOperacionClases =
  | { ok: true; message: string }
  | { ok: false; error: string; errorCode?: string };

export interface PestanaDiaClase {
  value: string;
  label: string;
  count: number;
}

export interface OpcionFiltroClase {
  value: string;
  label: string;
}

export type VarianteBadgeClase = "mint" | "amber" | "coral" | "zinc";

export interface EstadoClaseEvaluado {
  cancelada: boolean;
  enCurso: boolean;
  finalizada: boolean;
  llena: boolean;
  ocupadas: number;
  cupos: number;
  porcentajeOcupacion: number;
  ventanaAsistencia: VentanaAsistenciaUI;
  badge: {
    label: string;
    variant: VarianteBadgeClase;
  };
}

export interface FiltrosClases {
  fechaSeleccionada: string;
  tipoClaseSeleccionado: string;
  coachSeleccionado: string;
  ocultarInactivas: boolean;
  timezone: string;
  ahora: Date;
  soloCoachAfiliacionId?: string;
}

export interface ResumenClases {
  totalClases: number;
  cuposOcupados: number;
  cuposTotales: number;
  clasesEnCurso: number;
}

const MENSAJES_ERROR_CLASES: Record<string, string> = {
  [ERROR_CODES.CUPO_MENOR_A_RESERVAS]:
    "El nuevo cupo no puede ser menor a las reservas confirmadas actuales.",
  [ERROR_CODES.CUPO_AGOTADO]:
    "Esta clase alcanzó el cupo máximo de participantes.",
  [ERROR_CODES.SIN_CREDITOS_DISPONIBLES]:
    "Este atleta no tiene créditos disponibles en su membresía.",
  [ERROR_CODES.MEMBRESIA_NO_VIGENTE]:
    "Este atleta no cuenta con una membresía vigente.",
  [ERROR_CODES.CLASE_CANCELADA]:
    "Esta clase fue cancelada y no admite nuevas acciones.",
  [ERROR_CODES.CLASE_NO_INICIADA]:
    "La asistencia solo puede registrarse una vez iniciada la clase.",
  [ERROR_CODES.VENTANA_CORRECCION_VENCIDA]:
    "Venció la ventana de 24 h para corregir la asistencia.",
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "No tenés permisos para realizar esta acción.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá los datos ingresados antes de continuar."
};

const PATRON_JERGA_TECNICA =
  /\b(400|401|403|404|409|422|500|Forbidden|Unauthorized|SQLSTATE|ERROR_CODES|[A-Z]{3,}_[A-Z0-9_]+)\b/i;

function capitalizarInicial(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatearHoraLocal(isoString: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(isoString));
}

function formatearFechaCortaLocal(fechaLocal: string, timezone: string): string {
  const fechaRef = new Date(`${fechaLocal}T12:00:00.000Z`);
  const texto = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(fechaRef);
  return capitalizarInicial(texto.replace(",", ""));
}

/**
 * Convierte un timestamp ISO o Date a fecha local YYYY-MM-DD en la zona horaria del Box.
 */
export function obtenerFechaClaseLocal(
  isoString: Date | string,
  timezone: string
): string {
  return obtenerFechaLocal(new Date(isoString), timezone);
}

/**
 * Formatea el rango horario de una clase en formato HH:mm - HH:mm dentro de la zona del Box.
 */
export function formatearRangoHorarioClase(
  inicioIso: Date | string,
  finIso: Date | string,
  timezone: string
): string {
  return `${formatearHoraLocal(inicioIso, timezone)} - ${formatearHoraLocal(finIso, timezone)}`;
}

/**
 * Formatea la fecha de una clase para mostrarla de forma legible en tarjetas y drawers.
 */
export function formatearFechaClaseLegible(
  isoString: Date | string,
  timezone: string
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(isoString));
}

/**
 * Construye las pestañas diarias de la agenda manteniendo "Todos los días" al inicio y "Hoy" presente.
 */
export function construirPestanasDiasClases(
  clases: Clase[],
  hoyLocal: string,
  timezone: string
): PestanaDiaClase[] {
  const conteos = new Map<string, number>();
  for (const clase of clases) {
    const fecha = obtenerFechaClaseLocal(clase.inicio, timezone);
    conteos.set(fecha, (conteos.get(fecha) ?? 0) + 1);
  }

  const fechasUnicas = new Set<string>([hoyLocal, ...conteos.keys()]);
  const fechasOrdenadas = Array.from(fechasUnicas).sort((a, b) =>
    a.localeCompare(b)
  );
  const ayerLocal = sumarDiasAFecha(hoyLocal, -1);
  const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

  const pestanasDias: PestanaDiaClase[] = fechasOrdenadas.map((fecha) => {
    const corta = formatearFechaCortaLocal(fecha, timezone);
    let label = corta;
    if (fecha === hoyLocal) {
      label = `Hoy · ${corta}`;
    } else if (fecha === ayerLocal) {
      label = `Ayer · ${corta}`;
    } else if (fecha === mananaLocal) {
      label = `Mañana · ${corta}`;
    }
    return {
      value: fecha,
      label,
      count: conteos.get(fecha) ?? 0
    };
  });

  return [
    {
      value: "TODOS",
      label: "Todos los días",
      count: clases.length
    },
    ...pestanasDias
  ];
}

/**
 * Genera opciones únicas para filtrar por disciplina / tipo de clase.
 */
export function construirOpcionesFiltroTipos(
  clases: Clase[]
): OpcionFiltroClase[] {
  const mapa = new Map<string, string>();
  for (const clase of clases) {
    mapa.set(clase.tipoClaseId, clase.tipoClaseNombre ?? "Clase");
  }
  const opciones = Array.from(mapa.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  return [{ value: "TODOS", label: "Todas" }, ...opciones];
}

/**
 * Genera opciones únicas para filtrar por coach asignado.
 */
export function construirOpcionesFiltroCoaches(
  clases: Clase[]
): OpcionFiltroClase[] {
  const mapa = new Map<string, string>();
  for (const clase of clases) {
    if (clase.coachAfiliacionId) {
      mapa.set(clase.coachAfiliacionId, clase.coachNombre ?? "Coach");
    }
  }
  const opciones = Array.from(mapa.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  return [{ value: "TODOS", label: "Todos" }, ...opciones];
}

/**
 * Evalúa estado operativo, ocupación y badge semántico para una clase.
 */
export function evaluarEstadoClase(
  clase: Clase,
  contexto: {
    ahora: Date;
    esAtleta: boolean;
    reservadaPorMi: boolean;
  }
): EstadoClaseEvaluado {
  const cancelada = Boolean(clase.canceladaEn);
  const inicioMs = new Date(clase.inicio).getTime();
  const finMs = new Date(clase.fin).getTime();
  const ahoraMs = contexto.ahora.getTime();
  const enCurso = !cancelada && ahoraMs >= inicioMs && ahoraMs <= finMs;
  const finalizada = !cancelada && ahoraMs > finMs;

  const ocupadas = Math.max(0, clase.reservasConfirmadas ?? 0);
  const cupos = Math.max(0, clase.cupos);
  const llena = !cancelada && cupos > 0 && ocupadas >= cupos;
  const porcentajeOcupacion =
    cupos > 0 ? Math.min(100, Math.round((ocupadas / cupos) * 100)) : 0;
  const resVentana = evaluarVentanaCorreccionAsistencia({
    claseInicio: clase.inicio,
    claseFin: clase.fin,
    ahora: contexto.ahora
  });
  const ventanaAsistencia: VentanaAsistenciaUI = resVentana.activa
    ? {
        estado: "PERMITIDA",
        motivo: null,
        activa: true,
        limiteCorreccion: resVentana.limiteCorreccion
      }
    : resVentana.noIniciada
      ? {
          estado: "NO_INICIADA",
          motivo:
            "La asistencia se habilita cuando comienza la clase.",
          activa: false,
          limiteCorreccion: resVentana.limiteCorreccion
        }
      : {
          estado: "VENCIDA",
          motivo:
            "Venció la ventana de 24 h para corregir la asistencia de esta clase.",
          activa: false,
          limiteCorreccion: resVentana.limiteCorreccion
        };
  const ultimosCupos =
    !cancelada &&
    !finalizada &&
    !llena &&
    cupos - ocupadas > 0 &&
    cupos - ocupadas <= 3;

  let badge: EstadoClaseEvaluado["badge"];
  if (cancelada) {
    badge = { label: "Clase Cancelada", variant: "coral" };
  } else if (enCurso) {
    badge = { label: "En curso", variant: "mint" };
  } else if (finalizada) {
    badge = { label: "Finalizada", variant: "zinc" };
  } else if (llena) {
    badge = { label: "Cupo agotado", variant: "coral" };
  } else if (contexto.esAtleta && contexto.reservadaPorMi) {
    badge = { label: "Tenés lugar", variant: "mint" };
  } else if (ultimosCupos) {
    badge = { label: "Últimos cupos", variant: "amber" };
  } else {
    badge = { label: "Programada", variant: "mint" };
  }

  return {
    cancelada,
    enCurso,
    finalizada,
    llena,
    ocupadas,
    cupos,
    porcentajeOcupacion,
    ventanaAsistencia,
    badge
  };
}

/**
 * Filtra clases por día local, disciplina, coach, rol de coach exclusivo y visibilidad de inactivas.
 */
export function filtrarClases(
  clases: Clase[],
  filtros: FiltrosClases
): Clase[] {
  const ahoraMs = filtros.ahora.getTime();
  return clases.filter((clase) => {
    if (
      filtros.soloCoachAfiliacionId &&
      clase.coachAfiliacionId !== filtros.soloCoachAfiliacionId
    ) {
      return false;
    }
    if (filtros.fechaSeleccionada !== "TODOS") {
      const fechaClase = obtenerFechaClaseLocal(clase.inicio, filtros.timezone);
      if (fechaClase !== filtros.fechaSeleccionada) {
        return false;
      }
    }
    if (
      filtros.tipoClaseSeleccionado !== "TODOS" &&
      clase.tipoClaseId !== filtros.tipoClaseSeleccionado
    ) {
      return false;
    }
    if (
      filtros.coachSeleccionado !== "TODOS" &&
      clase.coachAfiliacionId !== filtros.coachSeleccionado
    ) {
      return false;
    }
    if (filtros.ocultarInactivas) {
      const cancelada = Boolean(clase.canceladaEn);
      const finalizada = new Date(clase.fin).getTime() < ahoraMs;
      if (cancelada || finalizada) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Calcula métricas resumidas para el encabezado contextual de la vista filtrada.
 */
export function calcularResumenClases(
  clasesVisibles: Clase[],
  ahora: Date
): ResumenClases {
  let cuposOcupados = 0;
  let cuposTotales = 0;
  let clasesEnCurso = 0;
  const ahoraMs = ahora.getTime();

  for (const clase of clasesVisibles) {
    if (clase.canceladaEn) continue;
    cuposOcupados += Math.max(0, clase.reservasConfirmadas ?? 0);
    cuposTotales += Math.max(0, clase.cupos);
    const inicioMs = new Date(clase.inicio).getTime();
    const finMs = new Date(clase.fin).getTime();
    if (ahoraMs >= inicioMs && ahoraMs <= finMs) {
      clasesEnCurso += 1;
    }
  }

  return {
    totalClases: clasesVisibles.length,
    cuposOcupados,
    cuposTotales,
    clasesEnCurso
  };
}

/**
 * Traduce códigos de error del dominio a mensajes en español claros sin jerga HTTP ni SQL.
 */
export function traducirErrorClases(
  errorCode?: string,
  message?: string
): string {
  if (errorCode && MENSAJES_ERROR_CLASES[errorCode]) {
    return MENSAJES_ERROR_CLASES[errorCode];
  }
  const limpio = message?.trim();
  if (limpio && !PATRON_JERGA_TECNICA.test(limpio)) {
    return limpio;
  }
  return "No pudimos completar la operación. Intentá nuevamente.";
}

/**
 * Genera próximas clases materializadas desde los horarios configurados del Box.
 */
export async function procesarMaterializacionDesdeClases(
  boxId: string,
  materializarFn: (
    boxId: string,
    fechaReferencia?: string
  ) => Promise<ResultadoAccionClases>,
  fechaReferencia?: string
): Promise<ResultadoOperacionClases> {
  const res = await materializarFn(boxId, fechaReferencia);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.errorCode,
      error: traducirErrorClases(res.errorCode, res.message)
    };
  }
  return {
    ok: true,
    message: res.message ?? "Próximas clases generadas."
  };
}

/**
 * Valida y aplica cambios puntuales de coach o cupos sobre una clase materializada.
 */
export async function procesarEdicionClase(
  boxId: string,
  clase: Clase,
  valores: {
    esAdmin: boolean;
    coachAfiliacionId: string;
    cuposTexto: string;
  },
  editarFn: (
    boxId: string,
    claseId: string,
    input: EditarClase
  ) => Promise<ResultadoAccionClases>
): Promise<ResultadoOperacionClases> {
  const cupos = Number.parseInt(valores.cuposTexto, 10);
  if (!Number.isInteger(cupos) || cupos <= 0) {
    return {
      ok: false,
      error: "Ingresá un cupo numérico mayor a 0."
    };
  }

  const reservasConfirmadas = clase.reservasConfirmadas ?? 0;
  if (cupos < reservasConfirmadas) {
    return {
      ok: false,
      errorCode: ERROR_CODES.CUPO_MENOR_A_RESERVAS,
      error: `El nuevo cupo (${cupos}) no puede ser menor a las ${reservasConfirmadas} reservas confirmadas actuales.`
    };
  }

  const payload: EditarClase = {};
  if (
    valores.esAdmin &&
    valores.coachAfiliacionId &&
    valores.coachAfiliacionId !== clase.coachAfiliacionId
  ) {
    payload.coachAfiliacionId = valores.coachAfiliacionId;
  }
  if (cupos !== clase.cupos) {
    payload.cupos = cupos;
  }

  if (Object.keys(payload).length === 0) {
    return {
      ok: false,
      error: "Modificá el coach o el cupo antes de guardar."
    };
  }

  const validacion = EditarClaseSchema.safeParse(payload);
  if (!validacion.success) {
    return {
      ok: false,
      error:
        validacion.error.issues[0]?.message ??
        "Revisá los datos de la clase antes de guardar."
    };
  }

  const res = await editarFn(boxId, clase.id, validacion.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.errorCode,
      error: traducirErrorClases(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    message: "Clase actualizada correctamente."
  };
}

/**
 * Valida motivo y ejecuta la cancelación de una clase puntual.
 */
export async function procesarCancelacionClase(
  boxId: string,
  claseId: string,
  motivoTexto: string,
  cancelarFn: (
    boxId: string,
    claseId: string,
    input: CancelarClase
  ) => Promise<ResultadoAccionClases>
): Promise<ResultadoOperacionClases> {
  const motivoLimpio = motivoTexto.trim();
  if (motivoLimpio.length < 3) {
    return {
      ok: false,
      error: "Ingresá un motivo de cancelación de al menos 3 caracteres."
    };
  }
  const validacion = CancelarClaseSchema.safeParse({
    motivoCancelacion: motivoLimpio
  });
  if (!validacion.success) {
    return {
      ok: false,
      error:
        validacion.error.issues[0]?.message ??
        "Ingresá un motivo de cancelación de al menos 3 caracteres."
    };
  }

  const res = await cancelarFn(boxId, claseId, validacion.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.errorCode,
      error: traducirErrorClases(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    message: "Clase cancelada. Los atletas inscriptos recuperaron sus créditos."
  };
}

/**
 * Inscribe a un atleta en mostrador validando campos y conservando errorCode para guías contextuales.
 */
export async function procesarWalkinClase(
  boxId: string,
  claseId: string,
  afiliacionId: string,
  crearReservaFn: (
    boxId: string,
    input: CrearReserva
  ) => Promise<ResultadoAccionClases>
): Promise<ResultadoOperacionClases> {
  const validacion = CrearReservaSchema.safeParse({ claseId, afiliacionId });
  if (!validacion.success) {
    return {
      ok: false,
      error:
        validacion.error.issues[0]?.message ??
        "Seleccioná un atleta válido para inscribir."
    };
  }

  const res = await crearReservaFn(boxId, validacion.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.errorCode,
      error: traducirErrorClases(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    message: "Atleta inscripto en mostrador correctamente."
  };
}

/**
 * Registra o corrige la asistencia de una reserva confirmada.
 */
export async function procesarCambioAsistencia(
  boxId: string,
  reservaId: string,
  presente: boolean,
  registrarFn: (
    boxId: string,
    reservaId: string,
    input: RegistrarAsistencia
  ) => Promise<ResultadoAccionClases>
): Promise<ResultadoOperacionClases> {
  const validacion = RegistrarAsistenciaSchema.safeParse({ presente });
  if (!validacion.success) {
    return {
      ok: false,
      error: "Datos de asistencia inválidos."
    };
  }

  const res = await registrarFn(boxId, reservaId, validacion.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.errorCode,
      error: traducirErrorClases(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    message: presente
      ? "Asistencia registrada como presente."
      : "Asistencia registrada como ausente."
  };
}
