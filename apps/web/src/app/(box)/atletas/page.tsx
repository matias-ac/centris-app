import { redirect } from "next/navigation";
import { obtenerFechaLocal, tieneAlgunRol, type PagoConRegistrador } from "@centris/shared";
import {
  listarAtletasApi,
  listarMembresiasApi,
  listarMorososApi,
  listarPlanesApi,
  obtenerEstadoMembresiaApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import {
  AccesoRestringidoAtletas,
  DirectorioAtletasBox
} from "./directorio-atletas-box";

export const dynamic = "force-dynamic";

interface AtletasPageProps {
  searchParams?: Promise<{ afiliacionId?: string }>;
}

export default async function AtletasPage({ searchParams }: AtletasPageProps) {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }
  if (!contexto.afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { afiliacionActiva, sesion } = contexto;
  const tieneAcceso = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador",
    "recepcionista"
  ]);

  if (!tieneAcceso) {
    return <AccesoRestringidoAtletas nombreBox={afiliacionActiva.box.nombre} />;
  }

  const params = (await searchParams) ?? {};
  const timezone =
    afiliacionActiva.box.timezone ?? "America/Argentina/Buenos_Aires";
  const fechaHoyBox = obtenerFechaLocal(new Date(), timezone);

  const [resAtletas, resPlanes, resMembresias, resMorosos] = await Promise.all([
    listarAtletasApi(sesion.accessToken, afiliacionActiva.boxId, {
      soloActivos: false
    }),
    listarPlanesApi(sesion.accessToken, afiliacionActiva.boxId),
    listarMembresiasApi(sesion.accessToken, afiliacionActiva.boxId),
    listarMorososApi(sesion.accessToken, afiliacionActiva.boxId)
  ]);

  const atletas = resAtletas.ok ? resAtletas.data : [];
  const planes = resPlanes.ok ? resPlanes.data : [];
  const membresias = resMembresias.ok ? resMembresias.data : [];
  const morosos = resMorosos.ok ? resMorosos.data : [];

  const estadosMembresias = await Promise.all(
    membresias.map((m) =>
      obtenerEstadoMembresiaApi(sesion.accessToken, afiliacionActiva.boxId, m.id)
    )
  );

  const pagosPorMembresia: Record<string, PagoConRegistrador[]> = {};
  for (let i = 0; i < membresias.length; i++) {
    const m = membresias[i];
    const estado = estadosMembresias[i];
    if (m && estado && estado.ok) {
      pagosPorMembresia[m.id] = estado.data.pagos;
    }
  }

  return (
    <div className="space-y-6">
      <DirectorioAtletasBox
        boxId={afiliacionActiva.boxId}
        moneda={afiliacionActiva.box.moneda}
        esAdministrador={afiliacionActiva.roles.includes("administrador")}
        fechaHoyBox={fechaHoyBox}
        afiliacionIdInicial={params.afiliacionId ?? null}
        atletasIniciales={atletas}
        planes={planes}
        membresias={membresias}
        morosos={morosos}
        pagosPorMembresia={pagosPorMembresia}
      />
    </div>
  );
}
