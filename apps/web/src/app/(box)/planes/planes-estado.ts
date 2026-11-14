import {
  ActualizarPlanSchema,
  CrearPlanSchema,
  ERROR_CODES,
  type ActualizarPlanInput,
  type CrearPlan,
  type CrearPlanInput,
  type ErrorCode,
  type ModalidadCreditos,
  type Plan
} from "@centris/shared";

export type FiltroEstadoPlan = "TODOS" | "ACTIVOS" | "INACTIVOS";
export type FiltroModalidadPlan = "TODAS" | ModalidadCreditos;

export interface MetaModalidadPlan {
  label: string;
  badgeVariant: "mint" | "amber" | "zinc";
  optionLabel: string;
  labelCreditos: string;
  hint: string;
}

export interface KpisPlanes {
  total: number;
  activos: number;
  inactivos: number;
  precioMinActivo: number | null;
  precioMaxActivo: number | null;
  modalidadesActivas: number;
}

export interface FiltrosCatalogoPlanes {
  busqueda: string;
  estado: FiltroEstadoPlan;
  modalidad: FiltroModalidadPlan;
}

export interface BorradorPlan {
  nombre: string;
  precioBase: string;
  duracionDias: string;
  modalidadCreditos: ModalidadCreditos;
  creditosPorPeriodo: string;
}

export interface ErroresPlanFormulario {
  nombre?: string;
  precioBase?: string;
  duracionDias?: string;
  creditosPorPeriodo?: string;
  general?: string;
}

export type ResultadoAccionPlan =
  | { ok: true }
  | { ok: false; errorCode?: string; message?: string };

export type AccionCrearPlanFn = (
  boxId: string,
  input: CrearPlanInput
) => Promise<ResultadoAccionPlan>;

export type AccionActualizarPlanFn = (
  boxId: string,
  planId: string,
  input: ActualizarPlanInput
) => Promise<ResultadoAccionPlan>;

export type AccionEliminarPlanFn = (
  boxId: string,
  planId: string
) => Promise<ResultadoAccionPlan>;

const METADATA_MODALIDADES: Record<ModalidadCreditos, MetaModalidadPlan> = {
  SEMANAL: {
    label: "Créditos semanales",
    badgeVariant: "zinc",
    optionLabel: "Créditos semanales (se renuevan los lunes)",
    labelCreditos: "Créditos por semana",
    hint: "Cantidad máxima de reservas por semana calendario (lunes a domingo)."
  },
  VIGENCIA_TOTAL: {
    label: "Bolsa por vigencia",
    badgeVariant: "amber",
    optionLabel: "Bolsa total para toda la vigencia",
    labelCreditos: "Créditos totales del período",
    hint: "Total de clases disponibles para consumir durante toda la vigencia."
  },
  ILIMITADO: {
    label: "Ilimitado",
    badgeVariant: "mint",
    optionLabel: "Ilimitado (sin límite de clases)",
    labelCreditos: "",
    hint: "Sin límite de clases durante toda la vigencia del plan."
  }
};

const MENSAJES_ERROR_PLAN: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "Solo un usuario con rol de Administrador puede crear, editar o dar de baja planes.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo antes de modificar el catálogo de planes.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión venció. Volvé a iniciar sesión para continuar.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá los datos ingresados del plan antes de guardar."
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos completar la operación en este momento. Intentá nuevamente en unos segundos.";

/**
 * Devuelve etiquetas humanas y metadatos visuales para cada modalidad de créditos.
 */
export function obtenerMetaModalidadPlan(
  modalidad: ModalidadCreditos
): MetaModalidadPlan {
  return METADATA_MODALIDADES[modalidad];
}

/**
 * Formatea un importe en la moneda del Box con separadores locales es-AR.
 */
export function formatearPrecioPlan(monto: number, moneda: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0
    }).format(monto);
  } catch {
    return `$ ${monto.toLocaleString("es-AR")}`;
  }
}

/**
 * Resume los créditos de un plan en español claro para el catálogo.
 */
export function resumirCreditosPlan(
  plan: Pick<Plan, "modalidadCreditos" | "creditosPorPeriodo">
): string {
  if (plan.modalidadCreditos === "ILIMITADO") {
    return "Sin tope de clases";
  }
  const cantidad = plan.creditosPorPeriodo ?? 0;
  const unidad = cantidad === 1 ? "clase" : "clases";
  if (plan.modalidadCreditos === "SEMANAL") {
    return `${cantidad} ${unidad} por semana`;
  }
  return `${cantidad} ${unidad} totales`;
}

/**
 * Explica en lenguaje natural cómo se consumen los créditos y la vigencia del plan.
 */
export function explicarReglaPlan(
  plan: Pick<Plan, "duracionDias" | "modalidadCreditos" | "creditosPorPeriodo">
): string {
  const dias = Math.max(1, plan.duracionDias);
  const etiquetaDias = dias === 1 ? "1 día" : `${dias} días`;

  if (plan.modalidadCreditos === "ILIMITADO") {
    return `Clases ilimitadas durante ${etiquetaDias} desde la activación.`;
  }

  const cantidad = Math.max(1, plan.creditosPorPeriodo ?? 1);
  const etiquetaClases = cantidad === 1 ? "1 clase" : `${cantidad} clases`;

  if (plan.modalidadCreditos === "SEMANAL") {
    return `${etiquetaClases} por semana durante ${etiquetaDias}. Se renuevan cada lunes.`;
  }

  return `${etiquetaClases} en total para repartir libremente en ${etiquetaDias}.`;
}

/**
 * Calcula los KPIs de resumen del catálogo de planes.
 */
export function calcularKpisPlanes(planes: readonly Plan[]): KpisPlanes {
  const activos = planes.filter((plan) => plan.activo);
  const precios = activos.map((plan) => plan.precioBase);

  return {
    total: planes.length,
    activos: activos.length,
    inactivos: planes.length - activos.length,
    precioMinActivo: precios.length > 0 ? Math.min(...precios) : null,
    precioMaxActivo: precios.length > 0 ? Math.max(...precios) : null,
    modalidadesActivas: new Set(activos.map((plan) => plan.modalidadCreditos))
      .size
  };
}

/**
 * Filtra los planes por nombre, estado activo/inactivo y modalidad de créditos.
 */
export function filtrarPlanes(
  planes: readonly Plan[],
  filtros: FiltrosCatalogoPlanes
): Plan[] {
  const consulta = filtros.busqueda.trim().toLowerCase();

  return planes.filter((plan) => {
    if (consulta && !plan.nombre.toLowerCase().includes(consulta)) {
      return false;
    }
    if (filtros.estado === "ACTIVOS" && !plan.activo) {
      return false;
    }
    if (filtros.estado === "INACTIVOS" && plan.activo) {
      return false;
    }
    if (
      filtros.modalidad !== "TODAS" &&
      plan.modalidadCreditos !== filtros.modalidad
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Construye el borrador del formulario para crear o editar un plan.
 */
export function crearBorradorPlan(plan?: Plan | null): BorradorPlan {
  if (!plan) {
    return {
      nombre: "",
      precioBase: "",
      duracionDias: "30",
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: "3"
    };
  }

  return {
    nombre: plan.nombre,
    precioBase: String(plan.precioBase),
    duracionDias: String(plan.duracionDias),
    modalidadCreditos: plan.modalidadCreditos,
    creditosPorPeriodo: plan.creditosPorPeriodo
      ? String(plan.creditosPorPeriodo)
      : "3"
  };
}

/**
 * Valida localmente los campos del formulario contra CrearPlanSchema.
 */
export function validarBorradorPlanLocal(
  borrador: BorradorPlan
):
  | { ok: true; data: CrearPlan }
  | { ok: false; errores: ErroresPlanFormulario } {
  const errores: ErroresPlanFormulario = {};

  if (borrador.nombre.trim().length === 0) {
    errores.nombre = "Ingresá un nombre claro para el plan.";
  }

  if (borrador.precioBase.trim().length === 0) {
    errores.precioBase = "Indicá el precio base del plan.";
  }

  if (borrador.duracionDias.trim().length === 0) {
    errores.duracionDias = "Indicá la vigencia en días.";
  }

  if (
    borrador.modalidadCreditos !== "ILIMITADO" &&
    borrador.creditosPorPeriodo.trim().length === 0
  ) {
    errores.creditosPorPeriodo = "Indicá cuántos créditos incluye el plan.";
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const validado = CrearPlanSchema.safeParse({
    nombre: borrador.nombre,
    precioBase: Number(borrador.precioBase),
    duracionDias: Number(borrador.duracionDias),
    modalidadCreditos: borrador.modalidadCreditos,
    creditosPorPeriodo:
      borrador.modalidadCreditos === "ILIMITADO"
        ? null
        : Number(borrador.creditosPorPeriodo)
  });

  if (!validado.success) {
    for (const issue of validado.error.issues) {
      const campo = issue.path[0];
      if (campo === "nombre" && !errores.nombre) {
        errores.nombre = issue.message;
      } else if (campo === "precioBase" && !errores.precioBase) {
        errores.precioBase = "Ingresá un monto entero igual o mayor a 0.";
      } else if (campo === "duracionDias" && !errores.duracionDias) {
        errores.duracionDias = "La vigencia debe ser de al menos 1 día.";
      } else if (
        campo === "creditosPorPeriodo" &&
        !errores.creditosPorPeriodo
      ) {
        errores.creditosPorPeriodo =
          "Indicá al menos 1 crédito para esta modalidad.";
      } else if (!errores.general) {
        errores.general = issue.message;
      }
    }
    return { ok: false, errores };
  }

  return { ok: true, data: validado.data };
}

/**
 * Traduce códigos de error de la API a mensajes claros sin exponer detalles técnicos.
 */
export function traducirErrorPlan(errorCode?: string): string {
  if (errorCode && errorCode in MENSAJES_ERROR_PLAN) {
    return MENSAJES_ERROR_PLAN[errorCode as ErrorCode] ?? MENSAJE_ERROR_RESPALDO;
  }
  return MENSAJE_ERROR_RESPALDO;
}

/**
 * Valida y persiste la creación o edición de un plan.
 */
export async function procesarGuardadoPlan(
  boxId: string,
  planEditandoId: string | null,
  borrador: BorradorPlan,
  crearPlanFn: AccionCrearPlanFn,
  actualizarPlanFn: AccionActualizarPlanFn
): Promise<
  | { ok: true; mensajeExito: string }
  | { ok: false; errores: ErroresPlanFormulario; general?: string }
> {
  const local = validarBorradorPlanLocal(borrador);
  if (!local.ok) {
    return {
      ok: false,
      errores: local.errores,
      general: local.errores.general
    };
  }

  if (planEditandoId) {
    const validadoEdicion = ActualizarPlanSchema.safeParse(local.data);
    if (!validadoEdicion.success) {
      return {
        ok: false,
        errores: { general: "Revisá los datos de actualización del plan." },
        general: "Revisá los datos de actualización del plan."
      };
    }

    const res = await actualizarPlanFn(
      boxId,
      planEditandoId,
      validadoEdicion.data
    );
    if (!res.ok) {
      const mensaje = traducirErrorPlan(res.errorCode);
      return { ok: false, errores: { general: mensaje }, general: mensaje };
    }

    return {
      ok: true,
      mensajeExito: `El plan "${local.data.nombre}" fue actualizado.`
    };
  }

  const res = await crearPlanFn(boxId, local.data);
  if (!res.ok) {
    const mensaje = traducirErrorPlan(res.errorCode);
    return { ok: false, errores: { general: mensaje }, general: mensaje };
  }

  return {
    ok: true,
    mensajeExito: `El plan "${local.data.nombre}" fue creado en el catálogo.`
  };
}

/**
 * Alterna el estado activo/inactivo de un plan traduciendo errores al español.
 */
export async function procesarAlternarActivoPlan(
  boxId: string,
  plan: Plan,
  actualizarPlanFn: AccionActualizarPlanFn
): Promise<
  { ok: true; mensajeExito: string } | { ok: false; error: string }
> {
  const nuevoEstado = !plan.activo;
  const res = await actualizarPlanFn(boxId, plan.id, { activo: nuevoEstado });
  if (!res.ok) {
    return { ok: false, error: traducirErrorPlan(res.errorCode) };
  }

  return {
    ok: true,
    mensajeExito: nuevoEstado
      ? `El plan "${plan.nombre}" quedó activo para asignar membresías.`
      : `El plan "${plan.nombre}" quedó inactivo.`
  };
}

/**
 * Aplica la baja de un plan del catálogo sin exponer códigos técnicos.
 */
export async function procesarBajaPlan(
  boxId: string,
  plan: Plan,
  eliminarPlanFn: AccionEliminarPlanFn
): Promise<
  { ok: true; mensajeExito: string } | { ok: false; error: string }
> {
  const res = await eliminarPlanFn(boxId, plan.id);
  if (!res.ok) {
    return { ok: false, error: traducirErrorPlan(res.errorCode) };
  }

  return {
    ok: true,
    mensajeExito: `El plan "${plan.nombre}" fue dado de baja del catálogo.`
  };
}
