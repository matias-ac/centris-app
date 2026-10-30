import { cookies } from "next/headers";
import type { AfiliacionConBox } from "@centris/shared";
import { obtenerMisAfiliacionesResultadoApi } from "./api-client";
import { obtenerSesionWeb, type SesionUsuarioWeb } from "./auth";

export const COOKIE_BOX_ACTIVO = "centris_box_id";

export interface ContextoOperativoWeb {
  sesion: SesionUsuarioWeb;
  afiliaciones: AfiliacionConBox[];
  afiliacionActiva: AfiliacionConBox | null;
}

export async function fijarCookieBoxActivo(boxId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_BOX_ACTIVO, boxId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export async function limpiarCookieBoxActivo(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_BOX_ACTIVO);
}

export async function obtenerContextoOperativoWeb(): Promise<ContextoOperativoWeb | null> {
  const sesion = await obtenerSesionWeb();
  if (!sesion) {
    return null;
  }

  const resultadoAfiliaciones = await obtenerMisAfiliacionesResultadoApi(
    sesion.accessToken
  );
  if (
    !resultadoAfiliaciones.ok &&
    resultadoAfiliaciones.error.statusCode === 401
  ) {
    return null;
  }

  const afiliaciones = resultadoAfiliaciones.ok
    ? resultadoAfiliaciones.data
    : [];
  const store = await cookies();
  const boxIdCookie = store.get(COOKIE_BOX_ACTIVO)?.value;

  const afiliacionPorCookie = afiliaciones.find(
    (a) => a.boxId === boxIdCookie && a.usuarioId === sesion.usuarioId
  );

  const afiliacionActiva =
    afiliacionPorCookie ??
    (afiliaciones.length === 1 ? (afiliaciones[0] ?? null) : null);

  return {
    sesion,
    afiliaciones,
    afiliacionActiva
  };
}
