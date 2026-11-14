import {
  ERROR_CODES,
  LoginSchema,
  type ErrorCode,
  type LoginInput
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

export type ErroresLogin = ErroresAuthPublico;
export type ResultadoValidacionLogin = ResultadoValidacionAuth<LoginInput>;
export type ResultadoEnvioLogin = ResultadoEnvioAuth;
export type AccionLoginFn = AccionAuthPublicoFn;

const MENSAJES_ERROR_AUTENTICACION: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.CREDENCIALES_INVALIDAS]:
    "El correo o la contraseña no coinciden, o tu cuenta todavía no fue activada.",
  [ERROR_CODES.VALIDACION_FALLIDA]:
    "Revisá que el correo electrónico sea válido y que la contraseña tenga al menos 8 caracteres.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión expiró. Ingresá nuevamente con tu correo y contraseña."
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos iniciar sesión en este momento. Intentá nuevamente en unos segundos.";

/**
 * Valida credenciales contra LoginSchema y separa los errores por campo para
 * aplicar aria-invalid de forma individual sin marcar campos válidos.
 */
export function validarCredencialesLogin(
  email: string,
  password: string
): ResultadoValidacionLogin {
  return validarCamposAuth(
    email,
    password,
    LoginSchema,
    "Ingresá un correo electrónico válido."
  );
}

/**
 * Traduce códigos de error del servidor a copy humano en español rioplatense,
 * evitando exponer identificadores técnicos o códigos HTTP en la UI.
 */
export function traducirErrorAutenticacion(errorCode?: string): string {
  return traducirErrorAuth(
    errorCode,
    MENSAJES_ERROR_AUTENTICACION,
    MENSAJE_ERROR_RESPALDO
  );
}

/**
 * Ejecuta validación local y envío al servidor devolviendo un resultado uniforme
 * de navegación o errores accesibles sin exponer excepciones crudas.
 */
export async function procesarEnvioLogin(
  email: string,
  password: string,
  accionLogin: AccionLoginFn
): Promise<ResultadoEnvioLogin> {
  const validacion = validarCredencialesLogin(email, password);
  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  return procesarEnvioAuth(
    validacion.datos,
    accionLogin,
    MENSAJES_ERROR_AUTENTICACION,
    MENSAJE_ERROR_RESPALDO
  );
}
