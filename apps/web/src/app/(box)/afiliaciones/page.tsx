import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarAfiliacionesBoxApi } from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { TablaAfiliacionesBox } from "./tabla-afiliaciones-box";

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
      <Card data-testid="acceso-denegado-rol">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Acceso restringido al Administrador</CardTitle>
          <Badge variant="rose">403 Forbidden</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tu Afiliación actual no posee el rol de Administrador para gestionar
          las Afiliaciones de este Box.
        </CardContent>
      </Card>
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
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          Gestión de Afiliaciones y Roles
        </h1>
        <p className="text-sm text-muted-foreground">
          Administrá la composición de roles atómicos de los integrantes de{" "}
          {afiliacionActiva.box.nombre} o aplicá baja lógica sin afectar otros
          Boxes.
        </p>
      </header>

      <TablaAfiliacionesBox
        afiliaciones={afiliaciones}
        boxId={afiliacionActiva.boxId}
      />
    </div>
  );
}
