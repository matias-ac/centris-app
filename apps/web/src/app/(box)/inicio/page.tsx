import { redirect } from "next/navigation";
import { obtenerResumenPanelApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { InicioBentoView } from "./inicio-bento-view";
import { traducirErrorPanel } from "./inicio-estado";

export const dynamic = "force-dynamic";

export default async function InicioBoxPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }
  const afiliacionActiva = contexto.afiliacionActiva;
  if (!afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const res = await obtenerResumenPanelApi(
    contexto.sesion.accessToken,
    afiliacionActiva.boxId
  );

  return (
    <InicioBentoView
      roles={afiliacionActiva.roles}
      resumen={res.ok ? res.data : null}
      errorCarga={
        res.ok ? null : traducirErrorPanel(res.error.errorCode, res.error.message)
      }
    />
  );
}
