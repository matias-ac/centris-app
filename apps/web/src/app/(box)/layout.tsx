import { redirect } from "next/navigation";
import { cerrarSesionAction, seleccionarBoxAction } from "@/lib/actions";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { formatearFechaOperativaBox } from "./navegacion-box";
import { ShellAutenticado } from "./shell-autenticado";

export const dynamic = "force-dynamic";

export default async function BoxLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }

  const afiliacionActiva = contexto.afiliacionActiva;
  if (!afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const fechaOperativaLabel = formatearFechaOperativaBox(
    afiliacionActiva.box.timezone
  );

  return (
    <ShellAutenticado
      afiliacionActiva={afiliacionActiva}
      afiliaciones={contexto.afiliaciones}
      nombreUsuario={contexto.sesion.nombre}
      fechaOperativaLabel={fechaOperativaLabel}
      onSeleccionarBox={seleccionarBoxAction}
      onCerrarSesion={cerrarSesionAction}
    >
      {children}
    </ShellAutenticado>
  );
}
