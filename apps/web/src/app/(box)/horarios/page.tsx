import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import {
  listarAfiliacionesBoxApi,
  listarHorariosApi,
  listarTiposClaseApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { HorariosView } from "./horarios-view";

export const dynamic = "force-dynamic";

export default async function HorariosPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto || !contexto.afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { afiliacionActiva, sesion } = contexto;
  const esAdmin = tieneAlgunRol(afiliacionActiva.roles, ["administrador"]);

  const [resTipos, resHorarios, resAfiliaciones] = await Promise.all([
    listarTiposClaseApi(sesion.accessToken, afiliacionActiva.boxId),
    listarHorariosApi(sesion.accessToken, afiliacionActiva.boxId),
    esAdmin
      ? listarAfiliacionesBoxApi(sesion.accessToken, afiliacionActiva.boxId)
      : Promise.resolve({ ok: true as const, data: [] })
  ]);

  const tiposClase = resTipos.ok ? resTipos.data : [];
  const horarios = resHorarios.ok ? resHorarios.data : [];
  const coaches = resAfiliaciones.ok
    ? resAfiliaciones.data.filter(
        (a) => a.roles.includes("coach") && a.activo
      )
    : [];

  return (
    <div className="space-y-6">
      <HorariosView
        boxId={afiliacionActiva.boxId}
        esAdmin={esAdmin}
        tiposClaseIniciales={tiposClase}
        horariosIniciales={horarios}
        coaches={coaches}
      />
    </div>
  );
}
