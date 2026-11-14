import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import {
  listarAuditoriaPagosApi,
  listarMorososApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import {
  AccesoRestringidoCaja,
  PanelCajaMorosos
} from "./panel-caja-morosos";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
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
    return (
      <AccesoRestringidoCaja nombreBox={afiliacionActiva.box.nombre} />
    );
  }

  const esAdministrador = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador"
  ]);

  const [resMorosos, resAuditoria] = await Promise.all([
    listarMorososApi(sesion.accessToken, afiliacionActiva.boxId),
    esAdministrador
      ? listarAuditoriaPagosApi(sesion.accessToken, afiliacionActiva.boxId)
      : Promise.resolve({ ok: true as const, data: [] })
  ]);

  const morosos = resMorosos.ok ? resMorosos.data : [];
  const pagos = resAuditoria.ok ? resAuditoria.data : [];

  return (
    <PanelCajaMorosos
      boxId={afiliacionActiva.boxId}
      moneda={afiliacionActiva.box.moneda}
      esAdministrador={esAdministrador}
      morososIniciales={morosos}
      pagosIniciales={pagos}
    />
  );
}
