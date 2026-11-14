import { ERROR_CODES, LoginSchema, type LoginInput } from "@centris/shared";

export interface ErroresLogin {
  email?: string;
  password?: string;
  general?: string;
}

export type ResultadoValidacionLogin =
  | { ok: true; datos: LoginInput }
  | { ok: false; errores: ErroresLogin };

export type ResultadoEnvioLogin =
  | { ok: true; destino: string }
  | { ok: false; errores: ErroresLogin };

export interface AccionLoginFn {
  (
    email: string,
    password: string
  ): Promise<{ ok: boolean; errorCode?: string; destino?: string }>;
}

const MENSAJES_ERROR_AUTENTICACION: Record<string, string> = {
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
  const validado = LoginSchema.safeParse({ email, password });
  if (validado.success) {
    return { ok: true, datos: validado.data };
  }

  const errores: ErroresLogin = {};
  for (const issue of validado.error.issues) {
    const campo = issue.path[0];
    if (campo === "email" && !errores.email) {
      errores.email = "Ingresá un correo electrónico válido.";
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
 * Traduce códigos de error del servidor a copy humano en español rioplatense,
 * evitando exponer identificadores técnicos o códigos HTTP en la UI.
 */
export function traducirErrorAutenticacion(errorCode?: string): string {
  if (errorCode && errorCode in MENSAJES_ERROR_AUTENTICACION) {
    return MENSAJES_ERROR_AUTENTICACION[errorCode] ?? MENSAJE_ERROR_RESPALDO;
  }
  return MENSAJE_ERROR_RESPALDO;
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

  try {
    const res = await accionLogin(
      validacion.datos.email,
      validacion.datos.password
    );
    if (!res.ok) {
      return {
        ok: false,
        errores: { general: traducirErrorAutenticacion(res.errorCode) }
      };
    }
    return { ok: true, destino: res.destino ?? "/inicio" };
  } catch {
    return {
      ok: false,
      errores: { general: traducirErrorAutenticacion() }
    };
  }
}
