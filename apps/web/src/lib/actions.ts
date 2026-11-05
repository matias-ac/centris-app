"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import type { ZodTypeAny, z } from "zod";
import {
  ActivarCuentaSchema,
  ActualizarConfiguracionBoxSchema,
  ActualizarPlanSchema,
  ActualizarRolesAfiliacionSchema,
  AjustarCreditosExtraSchema,
  AjustarPrecioMembresiaSchema,
  BajaAnticipadaSchema,
  CrearMembresiaSchema,
  CrearAtletaSchema,
  ActualizarAtletaSchema,
  ActualizarHorarioSchema,
  ActualizarTipoClaseSchema,
  AnularPagoSchema,
  CrearHorarioSchema,
  CrearPagoSchema,
  CrearPlanSchema,
  CrearTipoClaseSchema,
  EditarClaseSchema,
  ERROR_CODES,
  LoginSchema,
  type ActualizarAtleta,
  type ActualizarHorario,
  type ActualizarPlanInput,
  type ActualizarTipoClase,
  type AjustarCreditosExtra,
  type AjustarPrecioMembresia,
  type AnularPago,
  type BajaAnticipada,
  type CrearAtleta,
  type CrearHorario,
  type CrearMembresia,
  type CrearPago,
  type CrearPlanInput,
  type CrearTipoClase,
  type EditarClase,
  type RolAfiliacion,
  type SesionAuth
} from "@centris/shared";
import {
  activarCuentaApi,
  actualizarAtletaApi,
  actualizarHorarioApi,
  actualizarTipoClaseApi,
  ajustarCreditosExtraApi,
  ajustarPrecioMembresiaApi,
  anularPagoApi,
  asignarMembresiaApi,
  bajaAnticipadaApi,
  actualizarConfiguracionBoxApi,
  actualizarPlanApi,
  actualizarRolesAfiliacionApi,
  crearAtletaApi,
  crearHorarioApi,
  crearPlanApi,
  crearTipoClaseApi,
  editarClaseApi,
  eliminarAfiliacionApi,
  eliminarAtletaApi,
  eliminarHorarioApi,
  eliminarPlanApi,
  eliminarTipoClaseApi,
  iniciarSesionApi,
  materializarClasesApi,
  obtenerMisAfiliacionesApi,
  registrarPagoApi,
  type ResultadoApi
} from "./api-client";
import {
  autenticarConSesion,
  cerrarSesionNextAuth,
  obtenerSesionWeb
} from "./auth";
import {
  fijarCookieBoxActivo,
  limpiarCookieBoxActivo
} from "./contexto-box";

export interface ResultadoAccion {
  ok: boolean;
  errorCode?: string;
  message?: string;
  destino?: string;
}

async function establecerSesionYDestino(
  sesion: SesionAuth
): Promise<ResultadoAccion> {
  try {
    await limpiarCookieBoxActivo();
    await autenticarConSesion(sesion);
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        errorCode: ERROR_CODES.CREDENCIALES_INVALIDAS,
        message:
          "Credenciales inválidas o cuenta pendiente de activación inicial."
      };
    }
    throw err;
  }

  const afiliaciones = await obtenerMisAfiliacionesApi(sesion.accessToken);
  if (afiliaciones.length === 1 && afiliaciones[0]) {
    await fijarCookieBoxActivo(afiliaciones[0].boxId);
    return { ok: true, destino: "/inicio" };
  }

  return { ok: true, destino: "/seleccionar-box" };
}

export async function iniciarSesionAction(
  email: string,
  password: string
): Promise<ResultadoAccion> {
  const validado = LoginSchema.safeParse({ email, password });
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message: validado.error.issues[0]?.message ?? "Datos inválidos."
    };
  }

  const resultado = await iniciarSesionApi(validado.data);
  if (!resultado.ok) {
    return {
      ok: false,
      errorCode: resultado.error.errorCode,
      message: resultado.error.message
    };
  }

  return establecerSesionYDestino(resultado.data);
}

export async function activarCuentaAction(
  email: string,
  password: string
): Promise<ResultadoAccion> {
  const validado = ActivarCuentaSchema.safeParse({ email, password });
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message: validado.error.issues[0]?.message ?? "Datos inválidos."
    };
  }

  const resultado = await activarCuentaApi(validado.data);
  if (!resultado.ok) {
    return {
      ok: false,
      errorCode: resultado.error.errorCode,
      message: resultado.error.message
    };
  }

  return establecerSesionYDestino(resultado.data);
}

export async function seleccionarBoxAction(boxId: string): Promise<void> {
  await fijarCookieBoxActivo(boxId);
  revalidatePath("/", "layout");
}

export async function cerrarSesionAction(): Promise<void> {
  await limpiarCookieBoxActivo();
  await cerrarSesionNextAuth();
}

export async function guardarConfiguracionBoxAction(
  boxId: string,
  input: unknown
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = ActualizarConfiguracionBoxSchema.safeParse(input);
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message:
        validado.error.issues[0]?.message ??
        "Verificá los campos del formulario."
    };
  }

  const res = await actualizarConfiguracionBoxApi(
    sesion.accessToken,
    boxId,
    validado.data
  );
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function guardarRolesAfiliacionAction(
  boxId: string,
  afiliacionId: string,
  roles: RolAfiliacion[]
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = ActualizarRolesAfiliacionSchema.safeParse({ roles });
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message:
        validado.error.issues[0]?.message ??
        "La Afiliación debe conservar al menos un rol."
    };
  }

  const res = await actualizarRolesAfiliacionApi(
    sesion.accessToken,
    boxId,
    afiliacionId,
    validado.data.roles
  );
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function bajaAfiliacionAction(
  boxId: string,
  afiliacionId: string
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const res = await eliminarAfiliacionApi(
    sesion.accessToken,
    boxId,
    afiliacionId
  );
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function crearPlanAction(
  boxId: string,
  input: CrearPlanInput
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = CrearPlanSchema.safeParse(input);
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message:
        validado.error.issues[0]?.message ??
        "Datos del plan inválidos."
    };
  }

  const res = await crearPlanApi(sesion.accessToken, boxId, validado.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function actualizarPlanAction(
  boxId: string,
  planId: string,
  input: ActualizarPlanInput
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = ActualizarPlanSchema.safeParse(input);
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message:
        validado.error.issues[0]?.message ??
        "Datos de actualización del plan inválidos."
    };
  }

  const res = await actualizarPlanApi(
    sesion.accessToken,
    boxId,
    planId,
    validado.data
  );
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarPlanAction(
  boxId: string,
  planId: string
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const res = await eliminarPlanApi(sesion.accessToken, boxId, planId);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function crearAtletaAction(
  boxId: string,
  input: CrearAtleta
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = CrearAtletaSchema.safeParse(input);
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message:
        validado.error.issues[0]?.message ??
        "Datos de alta de atleta inválidos."
    };
  }

  const res = await crearAtletaApi(sesion.accessToken, boxId, validado.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function actualizarAtletaAction(
  boxId: string,
  atletaId: string,
  input: ActualizarAtleta
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = ActualizarAtletaSchema.safeParse(input);
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message:
        validado.error.issues[0]?.message ??
        "Datos de actualización del atleta inválidos."
    };
  }

  const res = await actualizarAtletaApi(
    sesion.accessToken,
    boxId,
    atletaId,
    validado.data
  );
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarAtletaAction(
  boxId: string,
  atletaId: string
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const res = await eliminarAtletaApi(sesion.accessToken, boxId, atletaId);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}


async function ejecutarAccionConValidacion<S extends ZodTypeAny>(
  esquema: S,
  entrada: unknown,
  mensajeInvalido: string,
  llamar: (
    accessToken: string,
    datos: z.output<S>
  ) => Promise<ResultadoApi<unknown>>
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return {
      ok: false,
      errorCode: ERROR_CODES.VALIDACION_FALLIDA,
      message: validado.error.issues[0]?.message ?? mensajeInvalido
    };
  }

  const res = await llamar(sesion.accessToken, validado.data);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

async function ejecutarAccionAutenticada(
  llamar: (accessToken: string) => Promise<ResultadoApi<unknown>>
): Promise<ResultadoAccion> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return {
      ok: false,
      errorCode: ERROR_CODES.NO_AUTENTICADO,
      message: "Debés iniciar sesión."
    };
  }

  const res = await llamar(sesion.accessToken);
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error.errorCode,
      message: res.error.message
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

const ejecutarAccionMembresia = ejecutarAccionConValidacion;

export async function asignarMembresiaAction(
  boxId: string,
  input: CrearMembresia
): Promise<ResultadoAccion> {
  return ejecutarAccionMembresia(
    CrearMembresiaSchema,
    input,
    "Datos de la Membresía inválidos.",
    (token, datos) => asignarMembresiaApi(token, boxId, datos)
  );
}

export async function ajustarCreditosExtraAction(
  boxId: string,
  membresiaId: string,
  input: AjustarCreditosExtra
): Promise<ResultadoAccion> {
  return ejecutarAccionMembresia(
    AjustarCreditosExtraSchema,
    input,
    "Créditos extra inválidos.",
    (token, datos) => ajustarCreditosExtraApi(token, boxId, membresiaId, datos)
  );
}

export async function ajustarPrecioMembresiaAction(
  boxId: string,
  membresiaId: string,
  input: AjustarPrecioMembresia
): Promise<ResultadoAccion> {
  return ejecutarAccionMembresia(
    AjustarPrecioMembresiaSchema,
    input,
    "Precio inválido.",
    (token, datos) => ajustarPrecioMembresiaApi(token, boxId, membresiaId, datos)
  );
}

export async function bajaAnticipadaAction(
  boxId: string,
  membresiaId: string,
  input: BajaAnticipada
): Promise<ResultadoAccion> {
  return ejecutarAccionMembresia(
    BajaAnticipadaSchema,
    input,
    "Fecha de fin inválida.",
    (token, datos) => bajaAnticipadaApi(token, boxId, membresiaId, datos)
  );
}

// ============================================================================
// Tipos de Clase Actions
// ============================================================================

export async function crearTipoClaseAction(
  boxId: string,
  input: CrearTipoClase
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    CrearTipoClaseSchema,
    input,
    "Datos del Tipo de Clase inválidos.",
    (token, datos) => crearTipoClaseApi(token, boxId, datos)
  );
}

export async function actualizarTipoClaseAction(
  boxId: string,
  tipoClaseId: string,
  input: ActualizarTipoClase
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    ActualizarTipoClaseSchema,
    input,
    "Datos del Tipo de Clase inválidos.",
    (token, datos) => actualizarTipoClaseApi(token, boxId, tipoClaseId, datos)
  );
}

export async function eliminarTipoClaseAction(
  boxId: string,
  tipoClaseId: string
): Promise<ResultadoAccion> {
  return ejecutarAccionAutenticada((token) =>
    eliminarTipoClaseApi(token, boxId, tipoClaseId)
  );
}

// ============================================================================
// Horarios Actions
// ============================================================================

export async function crearHorarioAction(
  boxId: string,
  input: CrearHorario
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    CrearHorarioSchema,
    input,
    "Datos del Horario inválidos.",
    (token, datos) => crearHorarioApi(token, boxId, datos)
  );
}

export async function actualizarHorarioAction(
  boxId: string,
  horarioId: string,
  input: ActualizarHorario
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    ActualizarHorarioSchema,
    input,
    "Datos del Horario inválidos.",
    (token, datos) => actualizarHorarioApi(token, boxId, horarioId, datos)
  );
}

export async function eliminarHorarioAction(
  boxId: string,
  horarioId: string
): Promise<ResultadoAccion> {
  return ejecutarAccionAutenticada((token) =>
    eliminarHorarioApi(token, boxId, horarioId)
  );
}

// ============================================================================
// Pagos y Caja Actions
// ============================================================================

export async function registrarPagoAction(
  boxId: string,
  input: CrearPago
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    CrearPagoSchema,
    input,
    "Datos del Pago inválidos.",
    (token, datos) => registrarPagoApi(token, boxId, datos)
  );
}

export async function anularPagoAction(
  boxId: string,
  pagoId: string,
  input: AnularPago
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    AnularPagoSchema,
    input,
    "Motivo de anulación inválido.",
    (token, datos) => anularPagoApi(token, boxId, pagoId, datos)
  );
}

// ============================================================================
// Clases y Materialización Actions
// ============================================================================

export async function editarClaseAction(
  boxId: string,
  claseId: string,
  input: EditarClase
): Promise<ResultadoAccion> {
  return ejecutarAccionConValidacion(
    EditarClaseSchema,
    input,
    "Datos de edición de Clase inválidos.",
    (token, datos) => editarClaseApi(token, boxId, claseId, datos)
  );
}

export async function materializarClasesAction(
  boxId: string,
  fechaReferencia?: string
): Promise<ResultadoAccion> {
  return ejecutarAccionAutenticada((token) =>
    materializarClasesApi(token, boxId, fechaReferencia)
  );
}



