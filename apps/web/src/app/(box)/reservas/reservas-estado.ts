import {
  CrearReservaSchema,
  ERROR_CODES,
  ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO,
  calcularDisponibilidadCreditos,
  evaluarVentanaCancelacion,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type Atleta,
  type Clase,
  type EstadoReserva,
  type Membresia,
  type Reserva,
  type ResultadoDisponibilidadCreditos
} from "@centris/shared";

export type VarianteBadgeReservas = "mint" | "amber" | "coral" | "zinc";

export interface ResultadoAccionReservas {
  ok: boolean;
  message?: string;
  errorCode?: string;
}

export type ResultadoOperacionReservas =
  | { ok: true; message: string }
  | { ok: false; error: string; errorCode?: string };

export interface ResumenMembresiaAtletaUI {
  membresiaVigente: Membresia | null;
  disponibilidadActual: ResultadoDisponibilidadCreditos | null;
  saldoPendienteTotal: number;
  esMoroso: boolean;
  etiquetaModalidad: string;
  esFutura: boolean;
}

export interface ProximaReservaUI {
  reserva: Reserva;
  enCurso: boolean;
  enVentanaTardia: boolean;
  horaLimiteSinCargo: string;
  diaLabel: string;
  rangoHorario: string;
}

export interface ItemHistorialReservaUI {
  reserva: Reserva;
  etiqueta: string;
  variante: VarianteBadgeReservas;
  detalle: string;
  diaLabel: string;
  rangoHorario: string;
  esAsistenciaPresente: boolean;
  esAusencia: boolean;
}

export interface PestanaDiaReservas {
  value: string;
  label: string;
  count: number;
}

export interface OpcionTipoReservas {
  value: string;
  label: string;
  count: number;
}

export interface EstadoTarjetaClaseUI {
  ocupadas: number;
  cupos: number;
  libres: number;
  porcentajeOcupacion: number;
  pasada: boolean;
  enCurso: boolean;
  llena: boolean;
  yaReservada: boolean;
  superpuesta: boolean;
  puedeReservar: boolean;
  motivoBloqueo: string | null;
  badge: {
    label: string;
    variant: VarianteBadgeReservas;
  };
}

const ETIQUETA_MODALIDAD: Record<Membresia["modalidadCreditos"], string> = {
  SEMANAL: "Semanal",
  VIGENCIA_TOTAL: "Vigencia total",
  ILIMITADO: "Ilimitado"
};

const MENSAJES_ERROR_RESERVAS: Record<string, string> = {
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión expiró. Volvé a iniciar sesión para continuar.",
  [ERROR_CODES.CUPO_AGOTADO]:
    "Esta clase alcanzó el cupo máximo. Si alguien cancela, el lugar se libera al instante.",
  [ERROR_CODES.SIN_CREDITOS_DISPONIBLES]:
    "Agotaste tus créditos disponibles para este período.",
  [ERROR_CODES.MEMBRESIA_NO_VIGENTE]:
    "No tenés una membresía vigente para la fecha de esta clase.",
  [ERROR_CODES.SUPERPOSICION_HORARIA]:
    "Ya tenés otra reserva confirmada que se superpone con este horario.",
  [ERROR_CODES.FUERA_DE_ANTICIPACION]:
    "Esta clase todavía está fuera de los días habilitados para reservar.",
  [ERROR_CODES.CLASE_CANCELADA]:
    "Esta clase fue cancelada por el box y no admite reservas.",
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "No tenés permisos para realizar esta acción.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá los datos seleccionados antes de confirmar."
};

const PATRON_JERGA_TECNICA =
  /\b(400|401|403|404|409|422|500|Forbidden|Unauthorized|SQLSTATE|ERROR_CODES|[A-Z]{3,}_[A-Z0-9_]+)\b/i;

function capitalizarInicial(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Traduce códigos de error del dominio a mensajes claros en español cotidiano sin jerga HTTP.
 */
export function traducirErrorReservas(
  errorCode?: string | null,
  rawMessage?: string | null
): string {
  if (errorCode && MENSAJES_ERROR_RESERVAS[errorCode]) {
    return MENSAJES_ERROR_RESERVAS[errorCode];
  }

  const limpio = (rawMessage ?? "").trim();
  if (!limpio || PATRON_JERGA_TECNICA.test(limpio)) {
    return "No pudimos completar la operación. Intentá nuevamente en unos segundos.";
  }

  return limpio;
}

/**
 * Formatea una fecha calendario `YYYY-MM-DD` a `DD/MM/YYYY` sin desplazamientos horarios.
 */
export function formatearFechaCortaEsAr(fechaYmd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaYmd);
  if (!match) return fechaYmd;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatearFechaRangoEsAr(
  fechaInicioYmd: string,
  fechaFinYmd: string
): string {
  return `${formatearFechaCortaEsAr(fechaInicioYmd)} al ${formatearFechaCortaEsAr(fechaFinYmd)}`;
}

export function formatearHoraClaseEsAr(
  isoString: string | Date,
  timezone: string
): string {
  const d = typeof isoString === "string" ? new Date(isoString) : isoString;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}

export function formatearRangoHorarioReserva(
  inicio: string | Date,
  fin: string | Date,
  timezone: string
): string {
  return `${formatearHoraClaseEsAr(inicio, timezone)} – ${formatearHoraClaseEsAr(fin, timezone)}`;
}

export function formatearDiaCortoEsAr(
  isoString: string | Date,
  timezone: string,
  hoyLocal: string
): string {
  const fechaObj =
    typeof isoString === "string" ? new Date(isoString) : isoString;
  const fechaLocal = obtenerFechaLocal(fechaObj, timezone);
  return formatearDiaTabLabel(fechaLocal, hoyLocal, timezone);
}

export function formatearDiaTabLabel(
  fechaYmd: string,
  hoyLocal: string,
  timezone: string
): string {
  const mananaLocal = sumarDiasAFecha(hoyLocal, 1);
  const fechaRef = new Date(`${fechaYmd}T12:00:00.000Z`);
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).formatToParts(fechaRef);

  const weekday = capitalizarInicial(
    partes.find((p) => p.type === "weekday")?.value.replace(/\./g, "").trim() ??
      ""
  );
  const day = partes.find((p) => p.type === "day")?.value ?? "";
  const month = partes.find((p) => p.type === "month")?.value ?? "";
  const base = `${weekday} ${day}/${month}`.trim();

  if (fechaYmd === hoyLocal) return `Hoy · ${base}`;
  if (fechaYmd === mananaLocal) return `Mañana · ${base}`;
  return base;
}

export function seleccionarMembresiaVigente(
  membresias: readonly Membresia[],
  hoyLocal: string
): Membresia | null {
  const activasOFuturas = membresias.filter(
    (m) => m.bajaAnticipadaEn === null && m.fechaFin >= hoyLocal
  );
  const vigenteHoy =
    activasOFuturas.find(
      (m) => m.fechaInicio <= hoyLocal && m.fechaFin >= hoyLocal
    ) ?? null;
  return vigenteHoy ?? activasOFuturas[0] ?? null;
}

/**
 * Calcula créditos disponibles en la zona horaria del Box y saldo pendiente total (ADR 0006).
 */
export function evaluarResumenMembresiaAtleta({
  membresias,
  misReservas,
  hoyLocal,
  timezone
}: {
  membresias: readonly Membresia[];
  misReservas: readonly Reserva[];
  hoyLocal: string;
  timezone: string;
}): ResumenMembresiaAtletaUI {
  const membresiaVigente = seleccionarMembresiaVigente(membresias, hoyLocal);

  const saldoPendienteTotal = membresias.reduce(
    (acc, m) => acc + Math.max(0, m.saldo ?? 0),
    0
  );

  if (!membresiaVigente) {
    return {
      membresiaVigente: null,
      disponibilidadActual: null,
      saldoPendienteTotal,
      esMoroso: saldoPendienteTotal > 0,
      etiquetaModalidad: "Sin membresía",
      esFutura: false
    };
  }

  const fechaObjetivo =
    membresiaVigente.fechaInicio > hoyLocal
      ? membresiaVigente.fechaInicio
      : hoyLocal;

  const disponibilidadActual = calcularDisponibilidadCreditos({
    modalidadCreditos: membresiaVigente.modalidadCreditos,
    creditosPorPeriodo: membresiaVigente.creditosPorPeriodo,
    creditosExtra: membresiaVigente.creditosExtra,
    fechasClasesConsumidas: misReservas
      .filter(
        (r) =>
          r.membresiaId === membresiaVigente.id &&
          ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO.includes(r.estado) &&
          r.claseInicio !== undefined
      )
      .map((r) => obtenerFechaLocal(new Date(r.claseInicio!), timezone)),
    fechaClaseObjetivo: fechaObjetivo
  });

  return {
    membresiaVigente,
    disponibilidadActual,
    saldoPendienteTotal,
    esMoroso: saldoPendienteTotal > 0,
    etiquetaModalidad: ETIQUETA_MODALIDAD[membresiaVigente.modalidadCreditos],
    esFutura: membresiaVigente.fechaInicio > hoyLocal
  };
}

const ETIQUETA_CANCELADA_UI: Record<
  Exclude<EstadoReserva, "CONFIRMADA">,
  { etiqueta: string; variante: VarianteBadgeReservas; detalle: string }
> = {
  CANCELADA: {
    etiqueta: "Cancelada",
    variante: "zinc",
    detalle: "Cancelada en término · Crédito devuelto"
  },
  CANCELADA_TARDIA: {
    etiqueta: "Cancelación tardía",
    variante: "amber",
    detalle: "Cancelada fuera de término · Crédito consumido"
  },
  CANCELADA_POR_BOX: {
    etiqueta: "Cancelada por el Box",
    variante: "coral",
    detalle: "Clase cancelada por el Box · Crédito devuelto"
  }
};

function describirLimiteCancelacion(
  claseInicio: Date,
  ventanaCancelacionMinutos: number,
  timezone: string
): string {
  const limite = new Date(
    claseInicio.getTime() - ventanaCancelacionMinutos * 60_000
  );
  const hora = formatearHoraClaseEsAr(limite, timezone);
  const diaLimite = obtenerFechaLocal(limite, timezone);
  const diaClase = obtenerFechaLocal(claseInicio, timezone);

  if (diaLimite === diaClase) {
    return hora;
  }

  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).formatToParts(limite);
  const wd =
    partes.find((p) => p.type === "weekday")?.value.replace(/\./g, "").trim() ??
    "";
  return `${hora} del ${wd} ${partes.find((p) => p.type === "day")?.value ?? ""}/${partes.find((p) => p.type === "month")?.value ?? ""}`.trim();
}

/**
 * Separa reservas futuras activas de reservas pasadas (Presente / Ausencia) o canceladas.
 */
export function clasificarReservasAtleta(
  misReservas: readonly Reserva[],
  timezone: string,
  ahora: Date,
  ventanaCancelacionMinutos: number
): {
  proximas: ProximaReservaUI[];
  historial: ItemHistorialReservaUI[];
} {
  const hoyLocal = obtenerFechaLocal(ahora, timezone);
  const proximas: ProximaReservaUI[] = [];
  const historial: ItemHistorialReservaUI[] = [];

  for (const reserva of misReservas) {
    const inicio = reserva.claseInicio ? new Date(reserva.claseInicio) : null;
    const fin = reserva.claseFin ? new Date(reserva.claseFin) : null;
    const diaLabel = inicio
      ? formatearDiaCortoEsAr(inicio, timezone, hoyLocal)
      : "Fecha por confirmar";
    const rangoHorario =
      inicio && fin ? formatearRangoHorarioReserva(inicio, fin, timezone) : "";

    const esFuturaActiva =
      reserva.estado === "CONFIRMADA" &&
      !reserva.ausenciaConsolidada &&
      reserva.asistenciaMarcadaEn === null &&
      (!fin || fin.getTime() > ahora.getTime());

    if (esFuturaActiva) {
      const enCurso = Boolean(
        inicio &&
          inicio.getTime() <= ahora.getTime() &&
          (!fin || fin.getTime() > ahora.getTime())
      );
      const evaluacion =
        inicio && !enCurso
          ? evaluarVentanaCancelacion({
              claseInicio: inicio,
              ahora,
              ventanaCancelacionMinutos
            })
          : { permitida: false, esTardia: false };

      proximas.push({
        reserva,
        enCurso,
        enVentanaTardia: !enCurso && evaluacion.permitida && evaluacion.esTardia,
        horaLimiteSinCargo:
          inicio && !enCurso
            ? describirLimiteCancelacion(
                inicio,
                ventanaCancelacionMinutos,
                timezone
              )
            : "",
        diaLabel,
        rangoHorario
      });
      continue;
    }

    if (reserva.estado !== "CONFIRMADA") {
      const info = ETIQUETA_CANCELADA_UI[reserva.estado];
      historial.push({
        reserva,
        etiqueta: info.etiqueta,
        variante: info.variante,
        detalle: info.detalle,
        diaLabel,
        rangoHorario,
        esAsistenciaPresente: false,
        esAusencia: false
      });
      continue;
    }

    if (reserva.asistenciaMarcadaEn !== null) {
      historial.push({
        reserva,
        etiqueta: "Presente",
        variante: "mint",
        detalle: "Asistencia registrada en clase",
        diaLabel,
        rangoHorario,
        esAsistenciaPresente: true,
        esAusencia: false
      });
    } else if (reserva.ausenciaConsolidada) {
      historial.push({
        reserva,
        etiqueta: "Ausencia",
        variante: "coral",
        detalle: "No registraste asistencia · Crédito consumido",
        diaLabel,
        rangoHorario,
        esAsistenciaPresente: false,
        esAusencia: true
      });
    } else {
      historial.push({
        reserva,
        etiqueta: "Finalizada",
        variante: "zinc",
        detalle: "Clase finalizada · Asistencia pendiente de cierre",
        diaLabel,
        rangoHorario,
        esAsistenciaPresente: false,
        esAusencia: false
      });
    }
  }

  proximas.sort((a, b) => {
    const tA = a.reserva.claseInicio
      ? new Date(a.reserva.claseInicio).getTime()
      : 0;
    const tB = b.reserva.claseInicio
      ? new Date(b.reserva.claseInicio).getTime()
      : 0;
    return tA - tB;
  });

  historial.sort((a, b) => {
    const tA = new Date(a.reserva.claseInicio ?? a.reserva.updatedAt).getTime();
    const tB = new Date(b.reserva.claseInicio ?? b.reserva.updatedAt).getTime();
    return tB - tA;
  });

  return { proximas, historial };
}

export function construirPestanasDiasReservas(
  clases: readonly Clase[],
  hoyLocal: string,
  anticipacionDias: number,
  timezone: string
): PestanaDiaReservas[] {
  const conteoPorDia = new Map<string, number>();
  conteoPorDia.set(hoyLocal, 0);

  for (const clase of clases) {
    const dia = obtenerFechaLocal(new Date(clase.inicio), timezone);
    if (dia >= hoyLocal) {
      conteoPorDia.set(dia, (conteoPorDia.get(dia) ?? 0) + 1);
    }
  }

  // Asegurar al menos mañana si existe dentro del horizonte
  const mananaLocal = sumarDiasAFecha(hoyLocal, 1);
  if (anticipacionDias >= 1 && !conteoPorDia.has(mananaLocal)) {
    conteoPorDia.set(mananaLocal, 0);
  }

  const diasOrdenados = Array.from(conteoPorDia.keys()).sort();
  const pestanas: PestanaDiaReservas[] = diasOrdenados.map((dia) => ({
    value: dia,
    label: formatearDiaTabLabel(dia, hoyLocal, timezone),
    count: conteoPorDia.get(dia) ?? 0
  }));

  pestanas.push({
    value: "TODOS",
    label: "Todas",
    count: clases.length
  });

  return pestanas;
}

export function construirOpcionesTipoReservas(
  clases: readonly Clase[]
): OpcionTipoReservas[] {
  const conteo = new Map<string, number>();
  for (const clase of clases) {
    const tipo = clase.tipoClaseNombre ?? "Clase";
    conteo.set(tipo, (conteo.get(tipo) ?? 0) + 1);
  }

  const ordenados = Array.from(conteo.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "es")
  );

  return [
    { value: "TODAS", label: "Todas", count: clases.length },
    ...ordenados.map(([tipo, count]) => ({
      value: tipo,
      label: tipo,
      count
    }))
  ];
}

export function filtrarClasesReservas(
  clases: readonly Clase[],
  filtros: {
    diaSeleccionado: string;
    tipoSeleccionado: string;
    timezone: string;
  }
): Clase[] {
  return clases
    .filter((clase) => {
      if (filtros.diaSeleccionado !== "TODOS") {
        const diaClase = obtenerFechaLocal(
          new Date(clase.inicio),
          filtros.timezone
        );
        if (diaClase !== filtros.diaSeleccionado) return false;
      }
      if (filtros.tipoSeleccionado !== "TODAS") {
        const tipo = clase.tipoClaseNombre ?? "Clase";
        if (tipo !== filtros.tipoSeleccionado) return false;
      }
      return true;
    })
    .sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    );
}

/**
 * Evalúa cupos, vigencia, créditos y superposición horaria para una tarjeta de clase.
 * Nunca bloquea por deuda pendiente / estado Moroso (ADR 0006).
 */
export function evaluarEstadoTarjetaClase(
  clase: Clase,
  contexto: {
    ahora: Date;
    claseIdsReservadas: ReadonlySet<string>;
    reservasActivas: readonly Reserva[];
    disponibilidad: ResultadoDisponibilidadCreditos | null;
    tieneMembresiaVigente: boolean;
  }
): EstadoTarjetaClaseUI {
  const ocupadas = clase.reservasConfirmadas ?? 0;
  const cupos = Math.max(1, clase.cupos);
  const libres = Math.max(0, clase.cupos - ocupadas);
  const porcentajeOcupacion = Math.min(100, Math.round((ocupadas / cupos) * 100));

  const inicioMs = new Date(clase.inicio).getTime();
  const finMs = new Date(clase.fin).getTime();
  const ahoraMs = contexto.ahora.getTime();

  const pasada = finMs <= ahoraMs || inicioMs <= ahoraMs;
  const enCurso = inicioMs <= ahoraMs && finMs > ahoraMs;
  const yaReservada = contexto.claseIdsReservadas.has(clase.id);
  const llena = ocupadas >= clase.cupos;

  const superpuesta = contexto.reservasActivas.some((r) => {
    if (
      r.estado !== "CONFIRMADA" ||
      r.claseId === clase.id ||
      !r.claseInicio ||
      !r.claseFin
    ) {
      return false;
    }
    const rInicio = new Date(r.claseInicio).getTime();
    const rFin = new Date(r.claseFin).getTime();
    return rInicio < finMs && rFin > inicioMs;
  });

  const sinCreditos =
    contexto.tieneMembresiaVigente &&
    contexto.disponibilidad !== null &&
    !contexto.disponibilidad.disponible;

  let badge: EstadoTarjetaClaseUI["badge"] = {
    label: `${libres} libres`,
    variant: "mint"
  };

  if (pasada) {
    badge = {
      label: enCurso ? "En curso" : "Finalizada",
      variant: "zinc"
    };
  } else if (yaReservada) {
    badge = { label: "Ya reservada", variant: "mint" };
  } else if (llena) {
    badge = { label: "Cupo agotado", variant: "coral" };
  } else if (libres <= 3) {
    badge = { label: `Últimos ${libres}`, variant: "amber" };
  }

  let motivoBloqueo: string | null = null;
  if (pasada) {
    motivoBloqueo = enCurso ? "Clase en curso" : "Horario finalizado";
  } else if (yaReservada) {
    motivoBloqueo = "Ya tenés tu lugar";
  } else if (llena) {
    motivoBloqueo = "Sin cupos · Sin lista de espera";
  } else if (!contexto.tieneMembresiaVigente) {
    motivoBloqueo = "Requiere membresía vigente";
  } else if (sinCreditos) {
    motivoBloqueo = "Sin créditos disponibles";
  }

  return {
    ocupadas,
    cupos: clase.cupos,
    libres,
    porcentajeOcupacion,
    pasada,
    enCurso,
    llena,
    yaReservada,
    superpuesta,
    puedeReservar: motivoBloqueo === null,
    motivoBloqueo,
    badge
  };
}

async function ejecutarOperacionReservas(
  ejecutar: () => Promise<ResultadoAccionReservas>,
  mensajeExito: string
): Promise<ResultadoOperacionReservas> {
  const res = await ejecutar();
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.errorCode,
      error: traducirErrorReservas(res.errorCode, res.message)
    };
  }

  return { ok: true, message: mensajeExito };
}

export async function procesarReservaAtleta(
  boxId: string,
  claseId: string,
  ejecutar: (
    boxId: string,
    input: { claseId: string }
  ) => Promise<ResultadoAccionReservas>
): Promise<ResultadoOperacionReservas> {
  const validado = CrearReservaSchema.safeParse({ claseId });
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      error: "No pudimos identificar la clase seleccionada."
    };
  }

  return ejecutarOperacionReservas(
    () => ejecutar(boxId, { claseId: validado.data.claseId }),
    "Listo: tu lugar quedó reservado."
  );
}

export async function procesarCancelacionAtleta(
  boxId: string,
  reservaId: string,
  esTardia: boolean,
  ejecutar: (
    boxId: string,
    reservaId: string
  ) => Promise<ResultadoAccionReservas>
): Promise<ResultadoOperacionReservas> {
  return ejecutarOperacionReservas(
    () => ejecutar(boxId, reservaId),
    esTardia
      ? "Cancelación tardía registrada: liberaste el lugar sin devolución de crédito."
      : "Reserva cancelada: liberaste el lugar y recuperaste tu crédito."
  );
}

export async function procesarReservaMostrador(
  boxId: string,
  claseId: string,
  afiliacionId: string,
  ejecutar: (
    boxId: string,
    input: { claseId: string; afiliacionId: string }
  ) => Promise<ResultadoAccionReservas>
): Promise<ResultadoOperacionReservas> {
  const validado = CrearReservaSchema.safeParse({ claseId, afiliacionId });
  if (!validado.success || !validado.data.afiliacionId) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      error: "Seleccioná un atleta válido para anotar en mostrador."
    };
  }

  return ejecutarOperacionReservas(
    () =>
      ejecutar(boxId, {
        claseId: validado.data.claseId,
        afiliacionId: validado.data.afiliacionId!
      }),
    "Atleta anotado correctamente en la clase."
  );
}

export function formatearVentanaCancelacionHumana(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) {
    return horas === 1 ? "1 hora" : `${horas} horas`;
  }
  return `${horas} h ${resto} min`;
}

export function filtrarAtletasMostrador(
  atletas: readonly Atleta[],
  busqueda: string
): Atleta[] {
  const q = busqueda.trim().toLowerCase();
  const activos = atletas.filter((a) => a.activo);
  if (!q) return activos;
  return activos.filter(
    (a) =>
      a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
  );
}
