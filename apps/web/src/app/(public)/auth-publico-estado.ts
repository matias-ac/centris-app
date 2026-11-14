import type { ErrorCode } from "@centris/shared";
import type { ZodType } from "zod";

export interface ErroresAuthPublico {
  email?: string;
  password?: string;
  general?: string;
}

export type ResultadoValidacionAuth<TDatos> =
  | { ok: true; datos: TDatos }
  | { ok: false; errores: ErroresAuthPublico };

export type ResultadoEnvioAuth =
  | { ok: true; destino: string }
  | { ok: false; errores: ErroresAuthPublico };

export interface AccionAuthPublicoFn {
  (
    email: string,
    password: string
  ): Promise<{ ok: boolean; errorCode?: string; destino?: string }>;
}

export interface ConfigAuthPublico<TDatos extends { email: string; password: string }> {
  schema: ZodType<TDatos>;
  mensajeEmailInvalido: string;
  mensajesPorCodigo: Partial<Record<ErrorCode, string>>;
  mensajeRespaldo: string;
}

/**
 * Valida email y contraseña contra el esquema Zod recibido y separa errores
 * por campo para aplicar aria-invalid de forma individual.
 */
export function validarCamposAuth<TDatos extends { email: string; password: string }>(
  email: string,
  password: string,
  schema: ZodType<TDatos>,
  mensajeEmailInvalido: string
): ResultadoValidacionAuth<TDatos> {
  const validado = schema.safeParse({ email, password });
  if (validado.success) {
    return { ok: true, datos: validado.data };
  }

  const errores: ErroresAuthPublico = {};
  for (const issue of validado.error.issues) {
    const campo = issue.path[0];
    if (campo === "email" && !errores.email) {
      errores.email = mensajeEmailInvalido;
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
 * Traduce códigos de error del servidor a copy humano sin exponer errorCode
 * ni códigos HTTP en la interfaz.
 */
export function traducirErrorAuth(
  errorCode: string | undefined,
  mensajesPorCodigo: Partial<Record<ErrorCode, string>>,
  mensajeRespaldo: string
): string {
  if (errorCode && Object.prototype.hasOwnProperty.call(mensajesPorCodigo, errorCode)) {
    return (
      mensajesPorCodigo[errorCode as ErrorCode] ?? mensajeRespaldo
    );
  }
  return mensajeRespaldo;
}

/**
 * Ejecuta validación y envío contra una Server Action de autenticación pública,
 * devolviendo destino o errores accesibles sin propagar excepciones.
 */
export async function procesarEnvioAuth<
  TDatos extends { email: string; password: string }
>(
  datos: TDatos,
  accion: AccionAuthPublicoFn,
  mensajesPorCodigo: Partial<Record<ErrorCode, string>>,
  mensajeRespaldo: string
): Promise<ResultadoEnvioAuth> {
  try {
    const res = await accion(datos.email, datos.password);
    if (!res.ok) {
      return {
        ok: false,
        errores: {
          general: traducirErrorAuth(
            res.errorCode,
            mensajesPorCodigo,
            mensajeRespaldo
          )
        }
      };
    }
    return { ok: true, destino: res.destino ?? "/inicio" };
  } catch {
    return {
      ok: false,
      errores: { general: mensajeRespaldo }
    };
  }
}
