import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    return (
      <Card data-testid="acceso-denegado-rol">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-xl uppercase tracking-tight text-foreground">
            Acceso restringido a Recepción y Administración
          </CardTitle>
          <Badge variant="rose">403 Forbidden</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tu Afiliación en este Box no posee los roles requeridos para consultar o gestionar el Directorio de Atletas.
        </CardContent>
      </Card>
    );
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
