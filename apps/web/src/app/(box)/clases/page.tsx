import { redirect } from "next/navigation";
import {
  esCoachSinPermisosStaff,
  obtenerFechaLocal,
  sumarDiasAFecha,
  tieneAlgunRol
} from "@centris/shared";
import {
  listarAfiliacionesBoxApi,
  listarAtletasApi,
  listarClasesApi,
  listarReservasApi
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
  const esCoach = tieneAlgunRol(afiliacionActiva.roles, ["coach"]);
  const esAtleta = tieneAlgunRol(afiliacionActiva.roles, ["atleta"]);
  const esSoloCoach = esCoachSinPermisosStaff(afiliacionActiva.roles);

  const timezone =
    afiliacionActiva.box.timezone ?? "America/Argentina/Buenos_Aires";
  const ahora = new Date();
  const hoy = obtenerFechaLocal(ahora, timezone);
  const desde = sumarDiasAFecha(hoy, -2);
  const hasta = sumarDiasAFecha(hoy, 14);

  const [resClases, resAfiliaciones, resAtletas, resMisReservas] =
    await Promise.all([
      listarClasesApi(sesion.accessToken, afiliacionActiva.boxId, {
        desde,
        hasta,
        coachAfiliacionId: esSoloCoach ? afiliacionActiva.id : undefined
      }),
      esAdmin
        ? listarAfiliacionesBoxApi(sesion.accessToken, afiliacionActiva.boxId)
        : Promise.resolve({ ok: true as const, data: [] }),
      esAdmin || esRecep
        ? listarAtletasApi(sesion.accessToken, afiliacionActiva.boxId)
        : Promise.resolve({ ok: true as const, data: [] }),
      esAtleta
        ? listarReservasApi(sesion.accessToken, afiliacionActiva.boxId, {
            afiliacionId: afiliacionActiva.id,
            estado: "CONFIRMADA"
          })
        : Promise.resolve({ ok: true as const, data: [] })
    ]);

  const clases = resClases.ok ? resClases.data : [];
  const coaches = resAfiliaciones.ok
    ? resAfiliaciones.data.filter(
        (a) => a.roles.includes("coach") && a.activo
      )
    : [];
  const atletas = resAtletas.ok
    ? resAtletas.data.filter((a) => a.activo)
    : [];
  const misReservasClaseIds = resMisReservas.ok
    ? resMisReservas.data.map((r) => r.claseId)
    : [];

  return (
    <div className="space-y-6">
      <ClasesView
        boxId={afiliacionActiva.boxId}
        timezone={timezone}
        esAdmin={esAdmin}
        esRecep={esRecep}
        esCoach={esCoach}
        esAtleta={esAtleta}
        afiliacionActivaId={afiliacionActiva.id}
        clasesIniciales={clases}
        coaches={coaches}
        atletas={atletas}
        misReservasClaseIds={misReservasClaseIds}
        fechaDesdeInicial={hoy}
        fechaHastaInicial={hasta}
        ahoraInicialIso={ahora.toISOString()}
      />
    </div>
  );
}
