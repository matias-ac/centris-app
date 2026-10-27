import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { listarAtletasApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { DirectorioAtletasBox } from "./directorio-atletas-box";

export const dynamic = "force-dynamic";

export default async function AtletasPage() {
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

  const resAtletas = await listarAtletasApi(
    sesion.accessToken,
    afiliacionActiva.boxId,
    { soloActivos: false }
  );

  const atletas = resAtletas.ok ? resAtletas.data : [];

  return (
    <div className="space-y-6">
      <DirectorioAtletasBox
        boxId={afiliacionActiva.boxId}
        atletasIniciales={atletas}
      />
    </div>
  );
}
