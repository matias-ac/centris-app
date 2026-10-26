import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { listarPlanesApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { CatalogoPlanesBox } from "./catalogo-planes-box";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto || !contexto.afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { afiliacionActiva, sesion } = contexto;
  const tieneAcceso = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador",
    "recepcionista"
  ]);

  if (!tieneAcceso) {
    redirect("/inicio");
  }

  const esAdmin = tieneAlgunRol(afiliacionActiva.roles, ["administrador"]);
  const resPlanes = await listarPlanesApi(
    sesion.accessToken,
    afiliacionActiva.boxId
  );
  const planes = resPlanes.ok ? resPlanes.data : [];

  return (
    <div className="space-y-6">
      <CatalogoPlanesBox
        boxId={afiliacionActiva.boxId}
        moneda={afiliacionActiva.box.moneda}
        planesIniciales={planes}
        esAdmin={esAdmin}
      />
    </div>
  );
}
