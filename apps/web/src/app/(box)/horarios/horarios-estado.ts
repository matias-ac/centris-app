import {
  ActualizarHorarioSchema,
  ActualizarTipoClaseSchema,
  CrearHorarioSchema,
  CrearTipoClaseSchema,
  DIAS_SEMANA,
  ERROR_CODES,
  HORA_LOCAL_REGEX,
  NOMBRES_DIAS_SEMANA,
  type ActualizarHorario,
  type ActualizarTipoClase,
  type CrearHorario,
  type CrearTipoClase,
  type DiaSemana,
  type ErrorCode,
  type Horario,
  type TipoClase
} from "@centris/shared";

export type FiltroDiaSemana = "TODOS" | `${DiaSemana}`;

export interface ResumenHorarios {
  totalHorariosActivos: number;
  totalTiposActivos: number;
  cuposSemanalesTotales: number;
  diasConHorarios: number;
}

export interface BorradorTipoClase {
  nombre: string;
  descripcion: string;
}

export interface ErroresTipoClaseFormulario {
  nombre?: string;
  descripcion?: string;
  general?: string;
}

export interface BorradorHorario {
  tipoClaseId: string;
  coachAfiliacionId: string;
  diaSemana: string;
  horaInicio: string;
  duracionMinutos: string;
  cuposDefault: string;
}

export interface ErroresHorarioFormulario {
  tipoClaseId?: string;
  coachAfiliacionId?: string;
  diaSemana?: string;
  horaInicio?: string;
  duracionMinutos?: string;
  cuposDefault?: string;
  general?: string;
}

export type ResultadoAccionHorarios =
  | { ok: true }
  | { ok: false; errorCode?: string; message?: string };

export type AccionCrearTipoClaseFn = (
  boxId: string,
  input: CrearTipoClase
) => Promise<ResultadoAccionHorarios>;

export type AccionActualizarTipoClaseFn = (
  boxId: string,
  tipoClaseId: string,
  input: ActualizarTipoClase
) => Promise<ResultadoAccionHorarios>;

export type AccionEliminarTipoClaseFn = (
  boxId: string,
  tipoClaseId: string
) => Promise<ResultadoAccionHorarios>;

export type AccionCrearHorarioFn = (
  boxId: string,
  input: CrearHorario
) => Promise<ResultadoAccionHorarios>;

export type AccionActualizarHorarioFn = (
  boxId: string,
  horarioId: string,
  input: ActualizarHorario
) => Promise<ResultadoAccionHorarios>;

export type AccionEliminarHorarioFn = (
  boxId: string,
  horarioId: string
) => Promise<ResultadoAccionHorarios>;

export type AccionMaterializarClasesFn = (
  boxId: string
) => Promise<ResultadoAccionHorarios>;

const MENSAJES_ERROR_HORARIOS: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "Solo un usuario con rol de Administrador puede modificar horarios o tipos de clase.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo antes de modificar los horarios.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión venció. Volvé a iniciar sesión para continuar.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá los datos ingresados antes de guardar."
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos completar la operación en este momento. Intentá nuevamente en unos segundos.";

/**
 * Extrae el formato corto HH:mm de una hora local.
 */
export function normalizarHoraCorta(hora: string): string {
  return hora.trim().slice(0, 5);
}

/**
 * Formatea una franja horaria inicio – fin a partir de la hora local y duración en minutos.
 */
export function formatearFranjaHoraria(
  horaInicio: string,
  duracionMinutos: number
): string {
  const horaCorta = normalizarHoraCorta(horaInicio);
  if (
    !HORA_LOCAL_REGEX.test(horaCorta) ||
    !Number.isFinite(duracionMinutos) ||
    duracionMinutos < 1
  ) {
    return horaCorta;
  }

  const [horasStr, minutosStr] = horaCorta.split(":");
  const totalInicio = Number(horasStr) * 60 + Number(minutosStr);
  const totalFin = (totalInicio + Math.round(duracionMinutos)) % 1440;
  const finHoras = String(Math.floor(totalFin / 60)).padStart(2, "0");
  const finMinutos = String(totalFin % 60).padStart(2, "0");

  return `${horaCorta} – ${finHoras}:${finMinutos}`;
}

/**
 * Formatea los cupos por defecto en lenguaje ubicuo.
 */
export function formatearCuposHorario(cupos: number): string {
  return `${cupos} ${cupos === 1 ? "cupo" : "cupos"}`;
}

/**
 * Devuelve únicamente los Tipos de Clase activos y no dados de baja.
 */
export function obtenerTiposClaseActivos(
  tipos: readonly TipoClase[]
): TipoClase[] {
  return tipos.filter((tc) => tc.activo && !tc.deletedAt);
}

/**
 * Agrupa los Horarios activos por día de la semana ordenados cronológicamente.
 */
export function agruparHorariosPorDia(
  horarios: readonly Horario[]
): Record<DiaSemana, Horario[]> {
  const agrupado: Record<DiaSemana, Horario[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: []
  };

  for (const horario of horarios) {
    if (!horario.activo || horario.deletedAt) {
      continue;
    }
    const dia = horario.diaSemana as DiaSemana;
    if (agrupado[dia]) {
      agrupado[dia].push(horario);
    }
  }

  for (const dia of DIAS_SEMANA) {
    agrupado[dia].sort((a, b) =>
      normalizarHoraCorta(a.horaInicio).localeCompare(
        normalizarHoraCorta(b.horaInicio)
      )
    );
  }

  return agrupado;
}

/**
 * Cuenta cuántos horarios semanales activos usan cada Tipo de Clase.
 */
export function contarHorariosPorTipoClase(
  horarios: readonly Horario[]
): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const horario of horarios) {
    if (!horario.activo || horario.deletedAt) {
      continue;
    }
    conteo[horario.tipoClaseId] = (conteo[horario.tipoClaseId] ?? 0) + 1;
  }
  return conteo;
}

/**
 * Calcula los KPIs de resumen de la plantilla semanal del Box.
 */
export function calcularResumenHorarios(
  horarios: readonly Horario[],
  tipos: readonly TipoClase[]
): ResumenHorarios {
  const activos = horarios.filter((h) => h.activo && !h.deletedAt);
  const tiposActivos = obtenerTiposClaseActivos(tipos);
  const diasUnicos = new Set(activos.map((h) => h.diaSemana));
  const cuposSemanalesTotales = activos.reduce(
    (acc, h) => acc + h.cuposDefault,
    0
  );

  return {
    totalHorariosActivos: activos.length,
    totalTiposActivos: tiposActivos.length,
    cuposSemanalesTotales,
    diasConHorarios: diasUnicos.size
  };
}

/**
 * Devuelve la lista de días a mostrar según el chip de filtro seleccionado.
 */
export function filtrarDiasVisibles(filtro: FiltroDiaSemana): DiaSemana[] {
  if (filtro === "TODOS") {
    return [...DIAS_SEMANA];
  }
  const diaNum = Number(filtro) as DiaSemana;
  return DIAS_SEMANA.includes(diaNum) ? [diaNum] : [...DIAS_SEMANA];
}

/**
 * Construye el borrador del formulario para crear o editar un Tipo de Clase.
 */
export function crearBorradorTipoClase(
  tipo?: TipoClase | null
): BorradorTipoClase {
  if (!tipo) {
    return { nombre: "", descripcion: "" };
  }
  return {
    nombre: tipo.nombre,
    descripcion: tipo.descripcion ?? ""
  };
}

/**
 * Valida localmente los campos del Tipo de Clase contra CrearTipoClaseSchema.
 */
export function validarBorradorTipoClaseLocal(
  borrador: BorradorTipoClase
):
  | { ok: true; data: CrearTipoClase }
  | { ok: false; errores: ErroresTipoClaseFormulario } {
  const nombreLimpio = borrador.nombre.trim();
  const descripcionLimpia = borrador.descripcion.trim();

  const validado = CrearTipoClaseSchema.safeParse({
    nombre: nombreLimpio,
    descripcion: descripcionLimpia ? descripcionLimpia : undefined
  });

  if (!validado.success) {
    const errores: ErroresTipoClaseFormulario = {};
    for (const issue of validado.error.issues) {
      const campo = issue.path[0];
      if (campo === "nombre" && !errores.nombre) {
        errores.nombre = "Ingresá un nombre para el Tipo de Clase.";
      } else if (campo === "descripcion" && !errores.descripcion) {
        errores.descripcion = issue.message;
      } else if (!errores.general) {
        errores.general = issue.message;
      }
    }
    return { ok: false, errores };
  }

  return { ok: true, data: validado.data };
}

/**
 * Construye el borrador del formulario para crear o editar un Horario recurrente.
 */
export function crearBorradorHorario(
  horario?: Horario | null,
  defaults?: { tipoClaseId?: string; coachAfiliacionId?: string }
): BorradorHorario {
  if (!horario) {
    return {
      tipoClaseId: defaults?.tipoClaseId ?? "",
      coachAfiliacionId: defaults?.coachAfiliacionId ?? "",
      diaSemana: "1",
      horaInicio: "07:00",
      duracionMinutos: "60",
      cuposDefault: "16"
    };
  }

  return {
    tipoClaseId: horario.tipoClaseId,
    coachAfiliacionId: horario.coachAfiliacionId,
    diaSemana: String(horario.diaSemana),
    horaInicio: normalizarHoraCorta(horario.horaInicio),
    duracionMinutos: String(horario.duracionMinutos),
    cuposDefault: String(horario.cuposDefault)
  };
}

/**
 * Valida localmente el borrador de Horario contra CrearHorarioSchema.
 */
export function validarBorradorHorarioLocal(
  borrador: BorradorHorario
):
  | { ok: true; data: CrearHorario }
  | { ok: false; errores: ErroresHorarioFormulario } {
  const errores: ErroresHorarioFormulario = {};

  if (!borrador.tipoClaseId.trim()) {
    errores.tipoClaseId = "Seleccioná un Tipo de Clase.";
  }
  if (!borrador.coachAfiliacionId.trim()) {
    errores.coachAfiliacionId = "Seleccioná un Coach por defecto.";
  }
  if (!borrador.horaInicio.trim()) {
    errores.horaInicio = "Indicá la hora de inicio.";
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const validado = CrearHorarioSchema.safeParse({
    tipoClaseId: borrador.tipoClaseId,
    coachAfiliacionId: borrador.coachAfiliacionId,
    diaSemana: Number(borrador.diaSemana),
    horaInicio: normalizarHoraCorta(borrador.horaInicio),
    duracionMinutos: Number(borrador.duracionMinutos),
    cuposDefault: Number(borrador.cuposDefault)
  });

  if (!validado.success) {
    for (const issue of validado.error.issues) {
      const campo = issue.path[0];
      if (campo === "tipoClaseId" && !errores.tipoClaseId) {
        errores.tipoClaseId = "Seleccioná un Tipo de Clase válido.";
      } else if (campo === "coachAfiliacionId" && !errores.coachAfiliacionId) {
        errores.coachAfiliacionId = "Seleccioná un Coach válido.";
      } else if (campo === "diaSemana" && !errores.diaSemana) {
        errores.diaSemana = "Elegí un día de lunes a domingo.";
      } else if (campo === "horaInicio" && !errores.horaInicio) {
        errores.horaInicio = "Ingresá una hora válida (formato 24 hs, ej. 07:00).";
      } else if (campo === "duracionMinutos" && !errores.duracionMinutos) {
        errores.duracionMinutos = "La duración debe ser de al menos 1 minuto.";
      } else if (campo === "cuposDefault" && !errores.cuposDefault) {
        errores.cuposDefault = "Indicá al menos 1 cupo disponible.";
      } else if (!errores.general) {
        errores.general = issue.message;
      }
    }
    return { ok: false, errores };
  }

  return { ok: true, data: validado.data };
}

/**
 * Traduce códigos de error del servidor a mensajes claros sin jerga técnica ni HTTP.
 */
export function traducirErrorHorarios(
  errorCode?: string,
  message?: string
): string {
  if (errorCode && errorCode in MENSAJES_ERROR_HORARIOS) {
    return (
      MENSAJES_ERROR_HORARIOS[errorCode as ErrorCode] ?? MENSAJE_ERROR_RESPALDO
    );
  }

  const mensajeLimpio = message?.trim();
  const contieneJergaTecnica =
    !mensajeLimpio ||
    /\b(401|403|404|409|422|500|Forbidden|Unauthorized|SQLSTATE|ERROR_[A-Z_]+|[A-Z]{2,}_[A-Z_]+)\b/.test(
      mensajeLimpio
    );

  return contieneJergaTecnica ? MENSAJE_ERROR_RESPALDO : mensajeLimpio;
}

async function ejecutarAccionFormulario<
  TErrores extends { general?: string }
>(
  ejecutarFn: () => Promise<ResultadoAccionHorarios>,
  mensajeExito: string
): Promise<{ ok: true; mensajeExito: string } | { ok: false; errores: TErrores }> {
  const res = await ejecutarFn();
  if (!res.ok) {
    return {
      ok: false,
      errores: {
        general: traducirErrorHorarios(res.errorCode, res.message)
      } as TErrores
    };
  }

  return { ok: true, mensajeExito };
}

/**
 * Valida y persiste la creación o edición de un Tipo de Clase.
 */
export async function procesarGuardadoTipoClase(
  boxId: string,
  tipoEditandoId: string | null,
  borrador: BorradorTipoClase,
  crearFn: AccionCrearTipoClaseFn,
  actualizarFn: AccionActualizarTipoClaseFn
): Promise<
  | { ok: true; mensajeExito: string }
  | { ok: false; errores: ErroresTipoClaseFormulario }
> {
  const local = validarBorradorTipoClaseLocal(borrador);
  if (!local.ok) {
    return { ok: false, errores: local.errores };
  }

  if (tipoEditandoId) {
    const validadoEdicion = ActualizarTipoClaseSchema.safeParse({
      nombre: local.data.nombre,
      descripcion: local.data.descripcion ?? null
    });
    if (!validadoEdicion.success) {
      return {
        ok: false,
        errores: { general: "Revisá los datos del Tipo de Clase." }
      };
    }

    return ejecutarAccionFormulario(
      () => actualizarFn(boxId, tipoEditandoId, validadoEdicion.data),
      `El Tipo de Clase "${local.data.nombre}" fue actualizado.`
    );
  }

  return ejecutarAccionFormulario(
    () => crearFn(boxId, local.data),
    `El Tipo de Clase "${local.data.nombre}" se agregó al catálogo.`
  );
}

/**
 * Ejecuta la baja lógica de un Tipo de Clase traduciendo errores al español.
 */
export async function procesarBajaTipoClase(
  boxId: string,
  tipo: Pick<TipoClase, "id" | "nombre">,
  eliminarFn: AccionEliminarTipoClaseFn
): Promise<
  { ok: true; mensajeExito: string } | { ok: false; error: string }
> {
  const res = await eliminarFn(boxId, tipo.id);
  if (!res.ok) {
    return {
      ok: false,
      error: traducirErrorHorarios(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    mensajeExito: `El Tipo de Clase "${tipo.nombre}" fue dado de baja del catálogo.`
  };
}

/**
 * Valida y persiste la creación o edición de un Horario recurrente.
 */
export async function procesarGuardadoHorario(
  boxId: string,
  horarioEditandoId: string | null,
  borrador: BorradorHorario,
  crearFn: AccionCrearHorarioFn,
  actualizarFn: AccionActualizarHorarioFn
): Promise<
  | { ok: true; mensajeExito: string }
  | { ok: false; errores: ErroresHorarioFormulario }
> {
  const local = validarBorradorHorarioLocal(borrador);
  if (!local.ok) {
    return { ok: false, errores: local.errores };
  }

  const diaNombre =
    NOMBRES_DIAS_SEMANA[local.data.diaSemana as DiaSemana] ?? "la semana";

  if (horarioEditandoId) {
    const validadoEdicion = ActualizarHorarioSchema.safeParse(local.data);
    if (!validadoEdicion.success) {
      return {
        ok: false,
        errores: { general: "Revisá los datos del Horario antes de guardar." }
      };
    }

    return ejecutarAccionFormulario(
      () => actualizarFn(boxId, horarioEditandoId, validadoEdicion.data),
      `Horario de ${diaNombre} a las ${local.data.horaInicio} actualizado.`
    );
  }

  return ejecutarAccionFormulario(
    () => crearFn(boxId, local.data),
    `Horario de ${diaNombre} a las ${local.data.horaInicio} guardado. Ya podés generar las próximas clases.`
  );
}

/**
 * Ejecuta la baja lógica de un Horario recurrente traduciendo errores.
 */
export async function procesarBajaHorario(
  boxId: string,
  horario: Pick<Horario, "id" | "horaInicio" | "diaSemana">,
  eliminarFn: AccionEliminarHorarioFn
): Promise<
  { ok: true; mensajeExito: string } | { ok: false; error: string }
> {
  const res = await eliminarFn(boxId, horario.id);
  if (!res.ok) {
    return {
      ok: false,
      error: traducirErrorHorarios(res.errorCode, res.message)
    };
  }

  const hora = normalizarHoraCorta(horario.horaInicio);
  return {
    ok: true,
    mensajeExito: `El Horario de las ${hora} fue dado de baja de la plantilla semanal.`
  };
}

/**
 * Genera las próximas Clases en el Calendario a partir de los Horarios activos.
 */
export async function procesarMaterializacionClases(
  boxId: string,
  materializarFn: AccionMaterializarClasesFn
): Promise<
  { ok: true; mensajeExito: string } | { ok: false; error: string }
> {
  const res = await materializarFn(boxId);
  if (!res.ok) {
    return {
      ok: false,
      error: traducirErrorHorarios(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    mensajeExito:
      "Se generaron las próximas clases en el Calendario según la plantilla semanal."
  };
}
