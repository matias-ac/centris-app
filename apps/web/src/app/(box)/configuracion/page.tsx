import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { obtenerConfiguracionBoxApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import {
  AccesoRestringidoConfiguracion,
  FormularioConfiguracionBox
} from "./formulario-configuracion-box";

export const dynamic = "force-dynamic";

export default async function ConfiguracionBoxPage() {
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
      <AccesoRestringidoConfiguracion nombreBox={afiliacionActiva.box.nombre} />
    );
  }

  const res = await obtenerConfiguracionBoxApi(
    contexto.sesion.accessToken,
    afiliacionActiva.boxId
  );
  const box = res.ok ? res.data : afiliacionActiva.box;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          Configuración del Box
        </h1>
        <p className="max-w-[66ch] text-sm text-muted-foreground">
          Ajustá el nombre visible, la zona horaria local para clases y las
          reglas con las que tus atletas reservan o cancelan en {box.nombre}.
        </p>
      </header>

      <FormularioConfiguracionBox key={box.id} box={box} />
    </div>
  );
}
