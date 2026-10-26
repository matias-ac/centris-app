import {
  AfiliacionConBoxSchema,
  AfiliacionConUsuarioSchema,
  AfiliacionSchema,
  BoxSchema,
  ErrorResponseSchema,
  PlanSchema,
  SesionAuthSchema,
  type ActivarCuentaInput,
  type ActualizarConfiguracionBox,
  type ActualizarPlanInput,
  type Afiliacion,
  type AfiliacionConBox,
  type AfiliacionConUsuario,
  type Box,
  type CrearPlanInput,
  type ErrorResponse,
  type LoginInput,
  type Plan,
  type RolAfiliacion,
  type SesionAuth
} from "@centris/shared";
import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ResultadoApi<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorResponse };

async function parsearErrorHttp(response: Response): Promise<ErrorResponse> {
  try {
    const json = await response.json();
    const parsed = ErrorResponseSchema.safeParse(json);
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Continúa a respuesta de respaldo
  }
  return {
    statusCode: response.status >= 400 ? response.status : 500,
    errorCode: "ERROR_INTERNO",
    message: `Error HTTP ${response.status}`,
    details: null
  };
}

export async function iniciarSesionApi(
  input: LoginInput
): Promise<ResultadoApi<SesionAuth>> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: SesionAuthSchema.parse(json) };
}

export async function activarCuentaApi(
  input: ActivarCuentaInput
): Promise<ResultadoApi<SesionAuth>> {
  const response = await fetch(`${API_URL}/auth/activar-cuenta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: SesionAuthSchema.parse(json) };
}

export async function obtenerMisAfiliacionesApi(
  accessToken: string
): Promise<AfiliacionConBox[]> {
  const response = await fetch(`${API_URL}/afiliaciones/mias`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json();
  return z.array(AfiliacionConBoxSchema).parse(json);
}

export async function obtenerConfiguracionBoxApi(
  accessToken: string,
  boxId: string
): Promise<ResultadoApi<Box>> {
  const response = await fetch(`${API_URL}/boxes/configuracion`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: BoxSchema.parse(json) };
}

export async function actualizarConfiguracionBoxApi(
  accessToken: string,
  boxId: string,
  input: ActualizarConfiguracionBox
): Promise<ResultadoApi<Box>> {
  const response = await fetch(`${API_URL}/boxes/configuracion`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: BoxSchema.parse(json) };
}

export async function listarAfiliacionesBoxApi(
  accessToken: string,
  boxId: string
): Promise<ResultadoApi<AfiliacionConUsuario[]>> {
  const response = await fetch(`${API_URL}/afiliaciones`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: z.array(AfiliacionConUsuarioSchema).parse(json) };
}

export async function actualizarRolesAfiliacionApi(
  accessToken: string,
  boxId: string,
  afiliacionId: string,
  roles: RolAfiliacion[]
): Promise<ResultadoApi<Afiliacion>> {
  const response = await fetch(`${API_URL}/afiliaciones/${afiliacionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    body: JSON.stringify({ roles }),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: AfiliacionSchema.parse(json) };
}

export async function eliminarAfiliacionApi(
  accessToken: string,
  boxId: string,
  afiliacionId: string
): Promise<ResultadoApi<{ eliminada: boolean; id: string }>> {
  const response = await fetch(`${API_URL}/afiliaciones/${afiliacionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: json as { eliminada: boolean; id: string } };
}

export async function listarPlanesApi(
  accessToken: string,
  boxId: string
): Promise<ResultadoApi<Plan[]>> {
  const response = await fetch(`${API_URL}/planes`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: z.array(PlanSchema).parse(json) };
}

export async function crearPlanApi(
  accessToken: string,
  boxId: string,
  input: CrearPlanInput
): Promise<ResultadoApi<Plan>> {
  const response = await fetch(`${API_URL}/planes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: PlanSchema.parse(json) };
}

export async function actualizarPlanApi(
  accessToken: string,
  boxId: string,
  planId: string,
  input: ActualizarPlanInput
): Promise<ResultadoApi<Plan>> {
  const response = await fetch(`${API_URL}/planes/${planId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: PlanSchema.parse(json) };
}

export async function eliminarPlanApi(
  accessToken: string,
  boxId: string,
  planId: string
): Promise<ResultadoApi<{ success: boolean; id: string }>> {
  const response = await fetch(`${API_URL}/planes/${planId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: json as { success: boolean; id: string } };
}

