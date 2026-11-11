import {
  AfiliacionConBoxSchema,
  AfiliacionConUsuarioSchema,
  AfiliacionSchema,
  AtletaSchema,
  BoxSchema,
  ClaseSchema,
  ErrorResponseSchema,
  HorarioSchema,
  MembresiaSchema,
  PagoSchema,
  PlanSchema,
  ReservaSchema,
  SesionAuthSchema,
  TipoClaseSchema,
  type ActivarCuentaInput,
  type ActualizarAtleta,
  type ActualizarConfiguracionBox,
  type ActualizarHorario,
  type ActualizarPlanInput,
  type ActualizarTipoClase,
  type AjustarCreditosExtra,
  type AjustarPrecioMembresia,
  type Afiliacion,
  type AfiliacionConBox,
  type AfiliacionConUsuario,
  type AnularPago,
  type Atleta,
  type BajaAnticipada,
  type Box,
  type CancelarClase,
  type Clase,
  type CrearAtleta,
  type CrearHorario,
  type CrearMembresia,
  type CrearPago,
  type CrearPlanInput,
  type CrearReserva,
  type CrearTipoClase,
  type EditarClase,
  type ErrorResponse,
  type FiltroAtletas,
  type FiltroClases,
  type FiltroMorosos,
  type FiltroReservas,
  type RegistrarAsistencia,
  type Horario,
  type LoginInput,
  type Membresia,
  type Moroso,
  type Pago,
  type PagoConRegistrador,
  type Plan,
  type Reserva,
  type RolAfiliacion,
  type SesionAuth,
  type TipoClase
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

export async function obtenerMisAfiliacionesResultadoApi(
  accessToken: string
): Promise<ResultadoApi<AfiliacionConBox[]>> {
  const response = await fetch(`${API_URL}/afiliaciones/mias`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: z.array(AfiliacionConBoxSchema).parse(json) };
}

export async function obtenerMisAfiliacionesApi(
  accessToken: string
): Promise<AfiliacionConBox[]> {
  const resultado = await obtenerMisAfiliacionesResultadoApi(accessToken);
  return resultado.ok ? resultado.data : [];
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

export async function listarAtletasApi(
  accessToken: string,
  boxId: string,
  filtro?: FiltroAtletas
): Promise<ResultadoApi<Atleta[]>> {
  const params = new URLSearchParams();
  if (filtro?.buscar) {
    params.set("buscar", filtro.buscar);
  }
  if (filtro?.soloActivos !== undefined) {
    params.set("soloActivos", String(filtro.soloActivos));
  }

  const queryString = params.toString();
  const url = `${API_URL}/atletas${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
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
  return { ok: true, data: z.array(AtletaSchema).parse(json) };
}

export async function obtenerAtletaApi(
  accessToken: string,
  boxId: string,
  atletaId: string
): Promise<ResultadoApi<Atleta>> {
  const response = await fetch(`${API_URL}/atletas/${atletaId}`, {
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
  return { ok: true, data: AtletaSchema.parse(json) };
}

export async function crearAtletaApi(
  accessToken: string,
  boxId: string,
  input: CrearAtleta
): Promise<ResultadoApi<Atleta>> {
  const response = await fetch(`${API_URL}/atletas`, {
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
  return { ok: true, data: AtletaSchema.parse(json) };
}

export async function actualizarAtletaApi(
  accessToken: string,
  boxId: string,
  atletaId: string,
  input: ActualizarAtleta
): Promise<ResultadoApi<Atleta>> {
  const response = await fetch(`${API_URL}/atletas/${atletaId}`, {
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
  return { ok: true, data: AtletaSchema.parse(json) };
}

export async function eliminarAtletaApi(
  accessToken: string,
  boxId: string,
  atletaId: string
): Promise<ResultadoApi<{ eliminada: boolean; id: string }>> {
  const response = await fetch(`${API_URL}/atletas/${atletaId}`, {
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



async function llamarMembresiasApi(
  accessToken: string,
  boxId: string,
  ruta: string,
  opciones: { method?: string; body?: unknown } = {}
): Promise<ResultadoApi<unknown>> {
  const response = await fetch(`${API_URL}/membresias${ruta}`, {
    method: opciones.method ?? "GET",
    headers: {
      ...(opciones.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }
  return { ok: true, data: await response.json() };
}

function comoMembresia(res: ResultadoApi<unknown>): ResultadoApi<Membresia> {
  return res.ok ? { ok: true, data: MembresiaSchema.parse(res.data) } : res;
}

export async function listarMembresiasApi(
  accessToken: string,
  boxId: string,
  afiliacionId?: string
): Promise<ResultadoApi<Membresia[]>> {
  const ruta = afiliacionId
    ? `?afiliacionId=${encodeURIComponent(afiliacionId)}`
    : "";
  const res = await llamarMembresiasApi(accessToken, boxId, ruta);
  return res.ok
    ? { ok: true, data: z.array(MembresiaSchema).parse(res.data) }
    : res;
}

export async function asignarMembresiaApi(
  accessToken: string,
  boxId: string,
  input: CrearMembresia
): Promise<ResultadoApi<Membresia>> {
  return comoMembresia(
    await llamarMembresiasApi(accessToken, boxId, "", {
      method: "POST",
      body: input
    })
  );
}

export async function ajustarCreditosExtraApi(
  accessToken: string,
  boxId: string,
  membresiaId: string,
  input: AjustarCreditosExtra
): Promise<ResultadoApi<Membresia>> {
  return comoMembresia(
    await llamarMembresiasApi(
      accessToken,
      boxId,
      `/${membresiaId}/creditos-extra`,
      { method: "PATCH", body: input }
    )
  );
}

export async function ajustarPrecioMembresiaApi(
  accessToken: string,
  boxId: string,
  membresiaId: string,
  input: AjustarPrecioMembresia
): Promise<ResultadoApi<Membresia>> {
  return comoMembresia(
    await llamarMembresiasApi(accessToken, boxId, `/${membresiaId}/precio`, {
      method: "PATCH",
      body: input
    })
  );
}

export async function bajaAnticipadaApi(
  accessToken: string,
  boxId: string,
  membresiaId: string,
  input: BajaAnticipada
): Promise<ResultadoApi<Membresia>> {
  return comoMembresia(
    await llamarMembresiasApi(
      accessToken,
      boxId,
      `/${membresiaId}/baja-anticipada`,
      { method: "POST", body: input }
    )
  );
}

// ============================================================================
// Tipos de Clase
// ============================================================================

export async function listarTiposClaseApi(
  accessToken: string,
  boxId: string
): Promise<ResultadoApi<TipoClase[]>> {
  const response = await fetch(`${API_URL}/tipos-clase`, {
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
  return { ok: true, data: z.array(TipoClaseSchema).parse(json) };
}

export async function crearTipoClaseApi(
  accessToken: string,
  boxId: string,
  input: CrearTipoClase
): Promise<ResultadoApi<TipoClase>> {
  const response = await fetch(`${API_URL}/tipos-clase`, {
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
  return { ok: true, data: TipoClaseSchema.parse(json) };
}

export async function actualizarTipoClaseApi(
  accessToken: string,
  boxId: string,
  tipoClaseId: string,
  input: ActualizarTipoClase
): Promise<ResultadoApi<TipoClase>> {
  const response = await fetch(`${API_URL}/tipos-clase/${tipoClaseId}`, {
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
  return { ok: true, data: TipoClaseSchema.parse(json) };
}

export async function eliminarTipoClaseApi(
  accessToken: string,
  boxId: string,
  tipoClaseId: string
): Promise<ResultadoApi<{ success: boolean; id: string }>> {
  const response = await fetch(`${API_URL}/tipos-clase/${tipoClaseId}`, {
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
  return { ok: true, data: json };
}

// ============================================================================
// Horarios Recurrentes
// ============================================================================

export async function listarHorariosApi(
  accessToken: string,
  boxId: string
): Promise<ResultadoApi<Horario[]>> {
  const response = await fetch(`${API_URL}/horarios`, {
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
  return { ok: true, data: z.array(HorarioSchema).parse(json) };
}

export async function crearHorarioApi(
  accessToken: string,
  boxId: string,
  input: CrearHorario
): Promise<ResultadoApi<Horario>> {
  const response = await fetch(`${API_URL}/horarios`, {
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
  return { ok: true, data: HorarioSchema.parse(json) };
}

export async function actualizarHorarioApi(
  accessToken: string,
  boxId: string,
  horarioId: string,
  input: ActualizarHorario
): Promise<ResultadoApi<Horario>> {
  const response = await fetch(`${API_URL}/horarios/${horarioId}`, {
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
  return { ok: true, data: HorarioSchema.parse(json) };
}

export async function eliminarHorarioApi(
  accessToken: string,
  boxId: string,
  horarioId: string
): Promise<ResultadoApi<{ success: boolean; id: string }>> {
  const response = await fetch(`${API_URL}/horarios/${horarioId}`, {
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
  return { ok: true, data: json };
}

// ============================================================================
// Caja y Pagos Inmutables
// ============================================================================

export async function registrarPagoApi(
  accessToken: string,
  boxId: string,
  input: CrearPago
): Promise<ResultadoApi<Pago>> {
  const response = await fetch(`${API_URL}/pagos`, {
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
  return { ok: true, data: PagoSchema.parse(json) };
}

export async function obtenerEstadoMembresiaApi(
  accessToken: string,
  boxId: string,
  membresiaId: string
): Promise<
  ResultadoApi<{
    membresiaId: string;
    precio: number;
    pagos: PagoConRegistrador[];
    totalPagado: number;
    saldo: number;
    esMoroso: boolean;
  }>
> {
  const response = await fetch(`${API_URL}/pagos/membresia/${membresiaId}`, {
    method: "GET",
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
  return { ok: true, data: json };
}

export async function anularPagoApi(
  accessToken: string,
  boxId: string,
  pagoId: string,
  input: AnularPago
): Promise<ResultadoApi<Pago>> {
  const response = await fetch(`${API_URL}/pagos/${pagoId}/anular`, {
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
  return { ok: true, data: PagoSchema.parse(json) };
}

export async function listarMorososApi(
  accessToken: string,
  boxId: string,
  filtro?: FiltroMorosos
): Promise<ResultadoApi<Moroso[]>> {
  const query = new URLSearchParams();
  if (filtro?.busqueda) {
    query.set("busqueda", filtro.busqueda);
  }
  const queryString = query.toString();
  const url = `${API_URL}/pagos/morosos${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
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
  return { ok: true, data: json };
}

export async function listarAuditoriaPagosApi(
  accessToken: string,
  boxId: string
): Promise<ResultadoApi<PagoConRegistrador[]>> {
  const response = await fetch(`${API_URL}/pagos/auditoria`, {
    method: "GET",
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
  return { ok: true, data: json };
}

export async function listarClasesApi(
  accessToken: string,
  boxId: string,
  filtro?: FiltroClases
): Promise<ResultadoApi<Clase[]>> {
  const query = new URLSearchParams();
  if (filtro?.desde) query.set("desde", filtro.desde);
  if (filtro?.hasta) query.set("hasta", filtro.hasta);
  if (filtro?.coachAfiliacionId) {
    query.set("coachAfiliacionId", filtro.coachAfiliacionId);
  }
  const queryString = query.toString();
  const url = `${API_URL}/clases${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
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
  return { ok: true, data: z.array(ClaseSchema).parse(json) };
}

export async function obtenerClaseApi(
  accessToken: string,
  boxId: string,
  claseId: string
): Promise<ResultadoApi<Clase>> {
  const response = await fetch(`${API_URL}/clases/${claseId}`, {
    method: "GET",
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
  return { ok: true, data: ClaseSchema.parse(json) };
}

export async function editarClaseApi(
  accessToken: string,
  boxId: string,
  claseId: string,
  input: EditarClase
): Promise<ResultadoApi<Clase>> {
  const response = await fetch(`${API_URL}/clases/${claseId}`, {
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
  return { ok: true, data: ClaseSchema.parse(json) };
}

export async function materializarClasesApi(
  accessToken: string,
  boxId: string,
  fechaReferencia?: string
): Promise<ResultadoApi<{ clasesCreadas: number }>> {
  const response = await fetch(`${API_URL}/clases/materializar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Box-Id": boxId
    },
    body: JSON.stringify({ fechaReferencia }),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, error: await parsearErrorHttp(response) };
  }

  const json = await response.json();
  return { ok: true, data: json };
}

export async function listarReservasApi(
  accessToken: string,
  boxId: string,
  filtro?: FiltroReservas
): Promise<ResultadoApi<Reserva[]>> {
  const query = new URLSearchParams();
  if (filtro?.afiliacionId) query.set("afiliacionId", filtro.afiliacionId);
  if (filtro?.claseId) query.set("claseId", filtro.claseId);
  if (filtro?.estado) query.set("estado", filtro.estado);
  if (filtro?.desde) query.set("desde", filtro.desde);
  if (filtro?.hasta) query.set("hasta", filtro.hasta);
  const queryString = query.toString();
  const url = `${API_URL}/reservas${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
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
  return { ok: true, data: z.array(ReservaSchema).parse(json) };
}

export async function crearReservaApi(
  accessToken: string,
  boxId: string,
  input: CrearReserva
): Promise<ResultadoApi<Reserva>> {
  const response = await fetch(`${API_URL}/reservas`, {
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
  return { ok: true, data: ReservaSchema.parse(json) };
}

export async function cancelarReservaApi(
  accessToken: string,
  boxId: string,
  reservaId: string
): Promise<ResultadoApi<Reserva>> {
  const response = await fetch(`${API_URL}/reservas/${reservaId}/cancelar`, {
    method: "POST",
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
  return { ok: true, data: ReservaSchema.parse(json) };
}

export async function cancelarClaseApi(
  accessToken: string,
  boxId: string,
  claseId: string,
  input: CancelarClase
): Promise<ResultadoApi<Clase>> {
  const response = await fetch(`${API_URL}/clases/${claseId}/cancelar`, {
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
  return { ok: true, data: ClaseSchema.parse(json) };
}

export async function registrarAsistenciaApi(
  accessToken: string,
  boxId: string,
  reservaId: string,
  input: RegistrarAsistencia
): Promise<ResultadoApi<Reserva>> {
  const response = await fetch(`${API_URL}/reservas/${reservaId}/asistencia`, {
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
  return { ok: true, data: ReservaSchema.parse(json) };
}



