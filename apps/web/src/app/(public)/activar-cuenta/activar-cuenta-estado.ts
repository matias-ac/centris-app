import {
  ActivarCuentaSchema,
  ERROR_CODES,
  type ActivarCuentaInput,
  type ErrorCode
} from "@centris/shared";
import {
  procesarEnvioAuth,
  traducirErrorAuth,
  validarCamposAuth,
  type AccionAuthPublicoFn,
  type ErroresAuthPublico,
  type ResultadoEnvioAuth,
  type ResultadoValidacionAuth
} from "../auth-publico-estado";

export const LONGITUD_MINIMA_CONTRASENA = 8;

export type ErroresActivacion = ErroresAuthPublico;
export type ResultadoValidacionActivacion =
  ResultadoValidacionAuth<ActivarCuentaInput>;
export type ResultadoEnvioActivacion = ResultadoEnvioAuth;
export type AccionActivarCuentaFn = AccionAuthPublicoFn;

export interface ReglaContrasenaEstado {
  longitud: number;
  cumpleMinimo: boolean;
  etiqueta: string;
  contador: string;
}

const MENSAJE_EMAIL_INVALIDO =
  "Ingresá el correo electrónico con el que te registraron.";

const MENSAJES_ERROR_ACTIVACION: Partial<Record<ErrorCode, string>> = {
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
  return validarCamposAuth(
    email,
    password,
    ActivarCuentaSchema,
    MENSAJE_EMAIL_INVALIDO
  );
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
  return traducirErrorAuth(
    errorCode,
    MENSAJES_ERROR_ACTIVACION,
    MENSAJE_ERROR_RESPALDO
  );
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

  return procesarEnvioAuth(
    validacion.datos,
    accionActivar,
    MENSAJES_ERROR_ACTIVACION,
    MENSAJE_ERROR_RESPALDO
  );
}
