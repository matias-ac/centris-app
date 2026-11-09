import { redirect } from "next/navigation";
import { obtenerFechaLocal, sumarDiasAFecha } from "@centris/shared";
import {
  listarClasesApi,
  listarMembresiasApi,
  listarReservasApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { ReservasAtletaView } from "./reservas-atleta-view";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto || !contexto.afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { afiliacionActiva, sesion } = contexto;
  const timezone =
    afiliacionActiva.box.timezone ?? "America/Argentina/Buenos_Aires";
  const anticipacionDias = afiliacionActiva.box.anticipacionReservaDias ?? 7;
  const hoy = obtenerFechaLocal(new Date(), timezone);
  const hasta = sumarDiasAFecha(hoy, anticipacionDias);

  const [resClases, resReservas, resMembresias] = await Promise.all([
    listarClasesApi(sesion.accessToken, afiliacionActiva.boxId, {
      desde: hoy,
      hasta
    }),
    listarReservasApi(sesion.accessToken, afiliacionActiva.boxId, {
      afiliacionId: afiliacionActiva.id
    }),
    listarMembresiasApi(
      sesion.accessToken,
      afiliacionActiva.boxId,
      afiliacionActiva.id
    )
  ]);

  const clases = resClases.ok
    ? resClases.data.filter((c) => c.canceladaEn === null)
    : [];
  const misReservas = resReservas.ok ? resReservas.data : [];
  const membresias = resMembresias.ok ? resMembresias.data : [];

  const membresiasActivasOFuturas = membresias.filter(
    (m) => m.fechaFin >= hoy
  );
  const membresiaVigente =
    membresiasActivasOFuturas.find(
      (m) => m.fechaInicio <= hoy && m.fechaFin >= hoy
    ) ??
    membresiasActivasOFuturas[0] ??
    null;

  return (
    <ReservasAtletaView
      boxId={afiliacionActiva.boxId}
      timezone={timezone}
      anticipacionReservaDias={anticipacionDias}
      clasesDisponibles={clases}
      misReservas={misReservas}
      membresiaVigente={membresiaVigente}
    />
  );
}
