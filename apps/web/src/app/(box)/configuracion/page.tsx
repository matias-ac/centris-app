import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerConfiguracionBoxApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { FormularioConfiguracionBox } from "./formulario-configuracion-box";

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
      <Card data-testid="acceso-denegado-rol">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Acceso restringido al Administrador</CardTitle>
          <Badge variant="rose">403 Forbidden</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tu Afiliación actual en {afiliacionActiva.box.nombre} no posee el rol
          de Administrador requerido para modificar la configuración general del
          Box.
        </CardContent>
      </Card>
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
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          Configuración del Box
        </h1>
        <p className="text-sm text-muted-foreground">
          Definí la zona horaria IANA, moneda ISO y ventanas operativas de{" "}
          {box.nombre}.
        </p>
      </header>

      <FormularioConfiguracionBox key={box.id} box={box} />
    </div>
  );
}
