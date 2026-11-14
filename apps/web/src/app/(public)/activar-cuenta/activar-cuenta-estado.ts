import {
  ActivarCuentaSchema,
  ERROR_CODES,
  type ActivarCuentaInput
} from "@centris/shared";

export const LONGITUD_MINIMA_CONTRASENA = 8;

export interface ErroresActivacion {
  email?: string;
  password?: string;
  general?: string;
}

export type ResultadoValidacionActivacion =
  | { ok: true; datos: ActivarCuentaInput }
  | { ok: false; errores: ErroresActivacion };

export type ResultadoEnvioActivacion =
  | { ok: true; destino: string }
  | { ok: false; errores: ErroresActivacion };

export interface ReglaContrasenaEstado {
  longitud: number;
  cumpleMinimo: boolean;
  etiqueta: string;
  contador: string;
}

export interface AccionActivarCuentaFn {
  (
    email: string,
    password: string
  ): Promise<{ ok: boolean; errorCode?: string; destino?: string }>;
}

const MENSAJES_ERROR_ACTIVACION: Record<string, string> = {
  [ERROR_CODES.CUENTA_YA_ACTIVADA]:
    "Esta cuenta ya fue activada previamente. Iniciá sesión con tu correo y contraseña.",
  [ERROR_CODES.CREDENCIALES_INVALIDAS]:
    "No encontramos una cuenta pendiente de activación con ese correo. Verificá los datos con recepción.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá que el correo electrónico sea válido y que la nueva contraseña tenga al menos 8 caracteres."
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos activar tu cuenta en este momento. Intentá nuevamente en unos segundos.";

/**
 * Valida email y nueva contraseña contra ActivarCuentaSchema separando errores
 * por campo para aplicar aria-invalid de forma individual.
 */
export function validarActivacionCuenta(
  email: string,
  password: string
): ResultadoValidacionActivacion {
  const validado = ActivarCuentaSchema.safeParse({ email, password });
  if (validado.success) {
    return { ok: true, datos: validado.data };
  }

  const errores: ErroresActivacion = {};
  for (const issue of validado.error.issues) {
    const campo = issue.path[0];
    if (campo === "email" && !errores.email) {
      errores.email =
        "Ingresá el correo electrónico con el que te registraron.";
    } else if (campo === "password" && !errores.password) {
      errores.password = issue.message;
    }
  }

  if (!errores.email && !errores.password) {
    errores.general = "Revisá los datos ingresados e intentá nuevamente.";
  }

  return { ok: false, errores };
}

/**
 * Calcula en vivo el cumplimiento del requisito mínimo de contraseña para mostrar
 * el chip semántico y el contador tabular.
 */
export function evaluarReglaContrasena(
  password: string
): ReglaContrasenaEstado {
  const longitud = password.length;
  const cumpleMinimo = longitud >= LONGITUD_MINIMA_CONTRASENA;

  return {
    longitud,
    cumpleMinimo,
    etiqueta: cumpleMinimo
      ? "Cumple mínimo de 8 caracteres"
      : `Mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres`,
    contador: `${longitud} / ${LONGITUD_MINIMA_CONTRASENA}`
  };
}

/**
 * Traduce códigos de error del servidor a copy humano en español rioplatense,
 * sin exponer errorCode ni códigos HTTP en la UI.
 */
export function traducirErrorActivacion(errorCode?: string): string {
  if (errorCode && errorCode in MENSAJES_ERROR_ACTIVACION) {
    return MENSAJES_ERROR_ACTIVACION[errorCode] ?? MENSAJE_ERROR_RESPALDO;
  }
  return MENSAJE_ERROR_RESPALDO;
}

/**
 * Valida localmente y ejecuta la activación inicial contra la Server Action,
 * devolviendo el destino de navegación o errores accesibles por campo/general.
 */
export async function procesarEnvioActivacion(
  email: string,
  password: string,
  accionActivar: AccionActivarCuentaFn
): Promise<ResultadoEnvioActivacion> {
  const validacion = validarActivacionCuenta(email, password);
  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  try {
    const res = await accionActivar(
      validacion.datos.email,
      validacion.datos.password
    );
    if (!res.ok) {
      return {
        ok: false,
        errores: { general: traducirErrorActivacion(res.errorCode) }
      };
    }
    return { ok: true, destino: res.destino ?? "/inicio" };
  } catch {
    return {
      ok: false,
      errores: { general: traducirErrorActivacion() }
    };
  }
}
