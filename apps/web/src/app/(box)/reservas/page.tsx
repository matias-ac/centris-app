import { redirect } from "next/navigation";
import {
  obtenerFechaLocal,
  sumarDiasAFecha,
  tieneAlgunRol
} from "@centris/shared";
import {
  listarAtletasApi,
  listarClasesApi,
  listarMembresiasApi,
  listarReservasApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { ReservasAtletaView } from "./reservas-atleta-view";
import { traducirErrorReservas } from "./reservas-estado";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto || !contexto.afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { afiliacionActiva, sesion } = contexto;
  const esAtleta = tieneAlgunRol(afiliacionActiva.roles, ["atleta"]);
  const esStaffMostrador = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador",
    "recepcionista"
  ]);

  const timezone =
    afiliacionActiva.box.timezone ?? "America/Argentina/Buenos_Aires";
  const anticipacionDias = afiliacionActiva.box.anticipacionReservaDias ?? 7;
  const ventanaCancelacionMinutos =
    afiliacionActiva.box.ventanaCancelacionMinutos ?? 120;
  const ahora = new Date();
  const hoy = obtenerFechaLocal(ahora, timezone);
  const hasta = sumarDiasAFecha(hoy, anticipacionDias);

  const [resClases, resReservas, resMembresias, resAtletas] = await Promise.all([
    listarClasesApi(sesion.accessToken, afiliacionActiva.boxId, {
      desde: hoy,
      hasta
    }),
    esAtleta
      ? listarReservasApi(sesion.accessToken, afiliacionActiva.boxId, {
          afiliacionId: afiliacionActiva.id
        })
      : Promise.resolve({ ok: true as const, data: [] }),
    esAtleta
      ? listarMembresiasApi(
          sesion.accessToken,
          afiliacionActiva.boxId,
          afiliacionActiva.id
        )
      : Promise.resolve({ ok: true as const, data: [] }),
    esStaffMostrador
      ? listarAtletasApi(sesion.accessToken, afiliacionActiva.boxId, {
          soloActivos: true
        })
      : Promise.resolve({ ok: true as const, data: [] })
  ]);

  const primerError = !resClases.ok
    ? resClases.error
    : esAtleta && !resReservas.ok
      ? resReservas.error
      : esAtleta && !resMembresias.ok
        ? resMembresias.error
        : null;

  const errorCarga = primerError
    ? traducirErrorReservas(primerError.errorCode, primerError.message)
    : null;

  const clases = resClases.ok
    ? resClases.data.filter((c) => c.canceladaEn === null)
    : [];
  const misReservas = resReservas.ok ? resReservas.data : [];
  const membresias = resMembresias.ok ? resMembresias.data : [];
  const atletas = resAtletas.ok ? resAtletas.data.filter((a) => a.activo) : [];

  const membresiasActivasOFuturas = membresias.filter(
    (m) => m.bajaAnticipadaEn === null && m.fechaFin >= hoy
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
      moneda={afiliacionActiva.box.moneda}
      anticipacionReservaDias={anticipacionDias}
      ventanaCancelacionMinutos={ventanaCancelacionMinutos}
      esAtleta={esAtleta}
      esStaffMostrador={esStaffMostrador}
      clasesDisponibles={clases}
      misReservas={misReservas}
      membresias={membresias}
      membresiaVigente={membresiaVigente}
      atletas={atletas}
      errorCarga={errorCarga}
      ahoraInicialIso={ahora.toISOString()}
    />
  );
}
