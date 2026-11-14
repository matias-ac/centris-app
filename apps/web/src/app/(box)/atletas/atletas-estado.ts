import {
  ActualizarAtletaSchema,
  CrearAtletaSchema,
  ERROR_CODES,
  calcularSaldoMembresia,
  type Atleta,
  type ErrorCode,
  type MedioPago,
  type Membresia,
  type Moroso,
  type PagoConRegistrador,
  type Plan
} from "@centris/shared";
import {
  actualizarAtletaAction,
  crearAtletaAction,
  eliminarAtletaAction,
  type ResultadoAccion
} from "@/lib/actions";
import { obtenerInicialesUsuario } from "@/lib/identidad-ui";

export type FiltroDirectorioAtletas =
  | "ACTIVOS"
  | "AL_DIA"
  | "MOROSOS"
  | "SIN_MEMBRESIA"
  | "TODOS";

export type EstadoMembresiaPrincipal =
  | "VIGENTE"
  | "FUTURA"
  | "VENCIDA"
  | "BAJA_ANTICIPADA"
  | "SIN_MEMBRESIA";

export interface ResumenAtletaDirectorio {
  atleta: Atleta;
  iniciales: string;
  membresiaPrincipal: Membresia | null;
  nombrePlanPrincipal: string | null;
  estadoMembresiaPrincipal: EstadoMembresiaPrincipal;
  tienePlanVigenteOFuturo: boolean;
  saldoTotal: number;
  esMoroso: boolean;
}

export interface KpisAtletas {
  activos: number;
  conPlanVigente: number;
  alDia: number;
  morosos: number;
  sinMembresia: number;
  todos: number;
}

export interface FiltrosDirectorioAtletas {
  busqueda: string;
  filtro: FiltroDirectorioAtletas;
}

const ETIQUETAS_MEDIO_PAGO: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro"
};

const MENSAJES_ERROR_ATLETA: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "Tu afiliación no tiene permisos de Recepción o Administración para realizar esta operación.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo antes de continuar.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión venció. Volvé a iniciar sesión para continuar.",
  [ERROR_CODES.MEMBRESIA_SUPERPUESTA]:
    "La vigencia elegida se superpone con otra membresía de este atleta.",
  [ERROR_CODES.PAGO_YA_ANULADO]:
    "Este pago ya fue anulado y no puede volver a anularse."
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos completar la operación en este momento. Revisá los datos e intentá nuevamente.";

/**
 * Clasifica una Membresía en relación con la fecha calendario del Box.
 */
export function clasificarEstadoMembresia(
  membresia: Pick<Membresia, "fechaInicio" | "fechaFin" | "bajaAnticipadaEn">,
  fechaHoyBox: string
): Exclude<EstadoMembresiaPrincipal, "SIN_MEMBRESIA"> {
  if (membresia.fechaInicio > fechaHoyBox) {
    return "FUTURA";
  }
  if (membresia.fechaFin >= fechaHoyBox) {
    return "VIGENTE";
  }
  if (membresia.bajaAnticipadaEn) {
    return "BAJA_ANTICIPADA";
  }
  return "VENCIDA";
}

function seleccionarMembresiaPrincipal(
  membresiasAtleta: readonly Membresia[],
  fechaHoyBox: string
): Membresia | null {
  if (membresiasAtleta.length === 0) {
    return null;
  }

  const vigentes = membresiasAtleta.filter(
    (m) => m.fechaInicio <= fechaHoyBox && m.fechaFin >= fechaHoyBox
  );
  if (vigentes.length > 0) {
    return vigentes[0] ?? null;
  }

  const futuras = [...membresiasAtleta]
    .filter((m) => m.fechaInicio > fechaHoyBox)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  if (futuras.length > 0) {
    return futuras[0] ?? null;
  }

  const pasadas = [...membresiasAtleta].sort((a, b) =>
    b.fechaFin.localeCompare(a.fechaFin)
  );
  return pasadas[0] ?? null;
}

/**
 * Construye el resumen operativo y contable de cada Atleta para el directorio.
 */
export function construirResumenesAtletas(params: {
  atletas: readonly Atleta[];
  planes: readonly Plan[];
  membresias: readonly Membresia[];
  pagosPorMembresia?: Record<string, PagoConRegistrador[]>;
  morosos?: readonly Moroso[];
  fechaHoyBox: string;
}): ResumenAtletaDirectorio[] {
  const {
    atletas,
    planes,
    membresias,
    pagosPorMembresia = {},
    morosos = [],
    fechaHoyBox
  } = params;

  const planesPorId = new Map(planes.map((p) => [p.id, p]));
  const morososPorAfiliacion = new Map(
    morosos.map((m) => [m.afiliacionId, m.totalDeuda])
  );
  const membresiasPorAfiliacion = new Map<string, Membresia[]>();

  for (const membresia of membresias) {
    const lista = membresiasPorAfiliacion.get(membresia.afiliacionId) ?? [];
    lista.push(membresia);
    membresiasPorAfiliacion.set(membresia.afiliacionId, lista);
  }

  return atletas.map((atleta) => {
    const listaMembresias =
      membresiasPorAfiliacion.get(atleta.afiliacionId) ?? [];
    const principal = seleccionarMembresiaPrincipal(
      listaMembresias,
      fechaHoyBox
    );
    const estadoPrincipal: EstadoMembresiaPrincipal = principal
      ? clasificarEstadoMembresia(principal, fechaHoyBox)
      : "SIN_MEMBRESIA";

    const saldoCalculado = listaMembresias.reduce((acc, membresia) => {
      const pagos = pagosPorMembresia[membresia.id] ?? [];
      return acc + calcularSaldoMembresia(membresia.precio, pagos);
    }, 0);

    const deudaReportada = morososPorAfiliacion.get(atleta.afiliacionId) ?? 0;
    const tienePagosCargados = listaMembresias.some(
      (m) => m.id in pagosPorMembresia
    );
    const saldoTotal = tienePagosCargados
      ? saldoCalculado
      : Math.max(saldoCalculado, deudaReportada);

    return {
      atleta,
      iniciales: obtenerInicialesUsuario(atleta.nombre),
      membresiaPrincipal: principal,
      nombrePlanPrincipal: principal
        ? (planesPorId.get(principal.planId)?.nombre ?? "Plan asignado")
        : null,
      estadoMembresiaPrincipal: estadoPrincipal,
      tienePlanVigenteOFuturo:
        estadoPrincipal === "VIGENTE" || estadoPrincipal === "FUTURA",
      saldoTotal,
      esMoroso: saldoTotal > 0
    };
  });
}

function esResumenAlDia(resumen: ResumenAtletaDirectorio): boolean {
  return (
    resumen.atleta.activo &&
    !resumen.esMoroso &&
    resumen.tienePlanVigenteOFuturo
  );
}

/**
 * Calcula los KPIs y contadores de filtros del directorio de atletas.
 */
export function calcularKpisAtletas(
  resumenes: readonly ResumenAtletaDirectorio[]
): KpisAtletas {
  const activos = resumenes.filter((r) => r.atleta.activo);
  const conPlanVigente = activos.filter((r) => r.tienePlanVigenteOFuturo);
  const morosos = activos.filter((r) => r.esMoroso);
  const alDia = activos.filter(esResumenAlDia);
  const sinMembresia = activos.filter((r) => !r.tienePlanVigenteOFuturo);

  return {
    activos: activos.length,
    conPlanVigente: conPlanVigente.length,
    alDia: alDia.length,
    morosos: morosos.length,
    sinMembresia: sinMembresia.length,
    todos: resumenes.length
  };
}

/**
 * Filtra los atletas por estado comercial/afiliación y búsqueda por nombre o email.
 */
export function filtrarAtletasDirectorio(
  resumenes: readonly ResumenAtletaDirectorio[],
  filtros: FiltrosDirectorioAtletas
): ResumenAtletaDirectorio[] {
  const consulta = filtros.busqueda.trim().toLowerCase();

  return resumenes.filter((resumen) => {
    const { atleta, esMoroso, tienePlanVigenteOFuturo } = resumen;

    if (filtros.filtro === "ACTIVOS" && !atleta.activo) {
      return false;
    }
    if (filtros.filtro === "AL_DIA" && !esResumenAlDia(resumen)) {
      return false;
    }
    if (filtros.filtro === "MOROSOS" && (!atleta.activo || !esMoroso)) {
      return false;
    }
    if (
      filtros.filtro === "SIN_MEMBRESIA" &&
      (!atleta.activo || tienePlanVigenteOFuturo)
    ) {
      return false;
    }

    if (consulta) {
      const coincide =
        atleta.nombre.toLowerCase().includes(consulta) ||
        atleta.email.toLowerCase().includes(consulta);
      if (!coincide) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Resuelve el Atleta asociado al parámetro ?afiliacionId= de la URL.
 */
export function resolverAtletaDeepLink(
  atletas: readonly Atleta[],
  afiliacionIdInicial?: string | null
): Atleta | null {
  const id = afiliacionIdInicial?.trim();
  if (!id) {
    return null;
  }
  return (
    atletas.find((a) => a.afiliacionId === id || a.id === id) ?? null
  );
}

/**
 * Formatea condiciones de créditos de una Membresía en español humano sin enums crudos.
 */
export function formatearCondicionesMembresia(
  membresia: Pick<Membresia, "modalidadCreditos" | "creditosPorPeriodo">
): string {
  if (membresia.modalidadCreditos === "ILIMITADO") {
    return "Ilimitado";
  }
  if (membresia.modalidadCreditos === "SEMANAL") {
    return `${membresia.creditosPorPeriodo ?? 0} por semana`;
  }
  return `${membresia.creditosPorPeriodo ?? 0} totales`;
}

/**
 * Devuelve la etiqueta humana de un medio de pago.
 */
export function formatearMedioPagoHumano(medioPago: MedioPago): string {
  return ETIQUETAS_MEDIO_PAGO[medioPago];
}

/**
 * Traduce códigos técnicos de API/dominio a mensajes claros en español rioplatense.
 */
export function traducirErrorAtleta(
  errorCode?: string,
  message?: string
): string {
  if (errorCode && errorCode in MENSAJES_ERROR_ATLETA) {
    return MENSAJES_ERROR_ATLETA[errorCode as ErrorCode] ?? MENSAJE_ERROR_RESPALDO;
  }

  const mensajeLimpio = message?.trim();
  const contieneJergaTecnica =
    !mensajeLimpio ||
    /\b(401|403|404|409|422|500|Forbidden|Unauthorized|SQLSTATE|[A-Z]{2,}_[A-Z_]+)\b/.test(
      mensajeLimpio
    );

  return contieneJergaTecnica ? MENSAJE_ERROR_RESPALDO : mensajeLimpio;
}

interface EsquemaParseable<T> {
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ message?: string }> } };
}

type RespuestaMutacionAtleta =
  | { ok: true; mensajeExito: string }
  | { ok: false; error: string };

async function ejecutarMutacionValidada<T>(
  esquema: EsquemaParseable<T>,
  input: unknown,
  mensajeValidacionDefecto: string,
  invocar: (datos: T) => Promise<ResultadoAccion>,
  construirExito: (datos: T) => string
): Promise<RespuestaMutacionAtleta> {
  const validacion = esquema.safeParse(input);
  if (!validacion.success) {
    return {
      ok: false,
      error: validacion.error.issues[0]?.message ?? mensajeValidacionDefecto
    };
  }

  const res = await invocar(validacion.data);
  if (!res.ok) {
    return { ok: false, error: traducirErrorAtleta(res.errorCode, res.message) };
  }

  return { ok: true, mensajeExito: construirExito(validacion.data) };
}

/**
 * Valida y ejecuta el alta de un Atleta en mostrador.
 */
export async function procesarAltaAtleta(
  boxId: string,
  input: { nombre: string; email: string }
): Promise<RespuestaMutacionAtleta> {
  return ejecutarMutacionValidada(
    CrearAtletaSchema,
    input,
    "Revisá el nombre y correo electrónico del atleta.",
    (datos) => crearAtletaAction(boxId, datos),
    (datos) => `${datos.nombre} quedó registrado como atleta del Box.`
  );
}

/**
 * Valida y ejecuta la edición de datos operativos de un Atleta.
 */
export async function procesarEdicionAtleta(
  boxId: string,
  atletaId: string,
  input: { nombre: string; activo: boolean }
): Promise<RespuestaMutacionAtleta> {
  return ejecutarMutacionValidada(
    ActualizarAtletaSchema,
    input,
    "Revisá los datos de edición del atleta.",
    (datos) => actualizarAtletaAction(boxId, atletaId, datos),
    (datos) => `Los datos de ${datos.nombre ?? "atleta"} fueron actualizados.`
  );
}

/**
 * Ejecuta la baja lógica / desactivación de un Atleta en el Box.
 */
export async function procesarBajaAtleta(
  boxId: string,
  atleta: Pick<Atleta, "id" | "nombre">
): Promise<RespuestaMutacionAtleta> {
  const res = await eliminarAtletaAction(boxId, atleta.id);
  if (!res.ok) {
    return { ok: false, error: traducirErrorAtleta(res.errorCode, res.message) };
  }

  return {
    ok: true,
    mensajeExito: `${atleta.nombre} pasó a estado inactivo en este Box.`
  };
}
