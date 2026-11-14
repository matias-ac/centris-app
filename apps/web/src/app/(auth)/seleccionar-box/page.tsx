import { redirect } from "next/navigation";
import { cerrarSesionAction, seleccionarBoxAction } from "@/lib/actions";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { SeleccionarBoxView } from "./seleccionar-box-view";

export const dynamic = "force-dynamic";

export default async function SeleccionarBoxPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }

  return (
    <SeleccionarBoxView
      nombreUsuario={contexto.sesion.nombre}
      afiliaciones={contexto.afiliaciones}
      boxActivoId={contexto.afiliacionActiva?.boxId ?? null}
      errorCargaAfiliaciones={Boolean(contexto.errorCargaAfiliaciones)}
      onSeleccionarBox={seleccionarBoxAction}
      onCerrarSesion={cerrarSesionAction}
    />
  );
}
