"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import {
  ActivarCuentaSchema,
  ActualizarConfiguracionBoxSchema,
  ActualizarPlanSchema,
  ActualizarRolesAfiliacionSchema,
  CrearAtletaSchema,
  ActualizarAtletaSchema,
  CrearPlanSchema,
  ERROR_CODES,
  LoginSchema,
  type ActualizarAtleta,
  type ActualizarPlanInput,
  type CrearAtleta,
  type CrearPlanInput,
  type RolAfiliacion,
  type SesionAuth
} from "@centris/shared";
import {
  activarCuentaApi,
  actualizarAtletaApi,
  actualizarConfiguracionBoxApi,
  actualizarPlanApi,
  actualizarRolesAfiliacionApi,
  crearAtletaApi,
  crearPlanApi,
  eliminarAfiliacionApi,
  eliminarAtletaApi,
  eliminarPlanApi,
  iniciarSesionApi,
  obtenerMisAfiliacionesApi
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

