import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { listarAfiliacionesBoxApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import {
  AccesoRestringidoAfiliaciones,
  TablaAfiliacionesBox
} from "./tabla-afiliaciones-box";

export const dynamic = "force-dynamic";

export default async function AfiliacionesBoxPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }
  const afiliacionActiva = contexto.afiliacionActiva;
  if (!afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  if (!tieneAlgunRol(afiliacionActiva.roles, ["administrador"])) {
    return (
      <AccesoRestringidoAfiliaciones
        nombreBox={afiliacionActiva.box.nombre}
      />
    );
  }

  const res = await listarAfiliacionesBoxApi(
    contexto.sesion.accessToken,
    afiliacionActiva.boxId
  );
  const afiliaciones = res.ok ? res.data : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          Afiliaciones y permisos del Box
        </h1>
        <p className="max-w-[68ch] text-sm text-muted-foreground">
          Combiná roles para cada persona en {afiliacionActiva.box.nombre} (por
          ejemplo, Coach y Atleta al mismo tiempo) o quitá su acceso local sin
          afectar otros Boxes.
        </p>
      </header>

      <TablaAfiliacionesBox
        afiliaciones={afiliaciones}
        boxId={afiliacionActiva.boxId}
        nombreBox={afiliacionActiva.box.nombre}
      />
    </div>
  );
}
