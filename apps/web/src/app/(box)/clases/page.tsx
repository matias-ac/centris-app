import { redirect } from "next/navigation";
import {
  obtenerFechaLocal,
  sumarDiasAFecha,
  tieneAlgunRol
} from "@centris/shared";
import {
  listarAfiliacionesBoxApi,
  listarClasesApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { ClasesView } from "./clases-view";

export const dynamic = "force-dynamic";

export default async function ClasesPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto || !contexto.afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { afiliacionActiva, sesion } = contexto;
  const esAdmin = tieneAlgunRol(afiliacionActiva.roles, ["administrador"]);
  const esRecep = tieneAlgunRol(afiliacionActiva.roles, ["recepcionista"]);

  const timezone = afiliacionActiva.box.timezone ?? "America/Argentina/Buenos_Aires";
  const hoy = obtenerFechaLocal(new Date(), timezone);
  const hasta = sumarDiasAFecha(hoy, 14);

  const [resClases, resAfiliaciones] = await Promise.all([
    listarClasesApi(sesion.accessToken, afiliacionActiva.boxId, {
      desde: hoy,
      hasta
    }),
    esAdmin || esRecep
      ? listarAfiliacionesBoxApi(sesion.accessToken, afiliacionActiva.boxId)
      : Promise.resolve({ ok: true as const, data: [] })
  ]);

  const clases = resClases.ok ? resClases.data : [];
  const coaches = resAfiliaciones.ok
    ? resAfiliaciones.data.filter(
        (a) => a.roles.includes("coach") && a.activo
      )
    : [];
  const atletas = resAfiliaciones.ok
    ? resAfiliaciones.data.filter(
        (a) => a.roles.includes("atleta") && a.activo
      )
    : [];

  return (
    <div className="space-y-6">
      <ClasesView
        boxId={afiliacionActiva.boxId}
        timezone={timezone}
        esAdmin={esAdmin}
        esRecep={esRecep}
        clasesIniciales={clases}
        coaches={coaches}
        atletas={atletas}
        fechaDesdeInicial={hoy}
        fechaHastaInicial={hasta}
      />
    </div>
  );
}
