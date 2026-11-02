import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listarAuditoriaPagosApi,
  listarMorososApi
} from "@/lib/api-client";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { PanelCajaMorosos } from "./panel-caja-morosos";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
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
          Tu Afiliación en este Box no posee los roles requeridos para consultar o gestionar la Caja y el Reporte de Morosos.
        </CardContent>
      </Card>
    );
  }

  const esAdministrador = tieneAlgunRol(afiliacionActiva.roles, ["administrador"]);

  const [resMorosos, resAuditoria] = await Promise.all([
    listarMorososApi(sesion.accessToken, afiliacionActiva.boxId),
    esAdministrador
      ? listarAuditoriaPagosApi(sesion.accessToken, afiliacionActiva.boxId)
      : Promise.resolve({ ok: true as const, data: [] })
  ]);

  const morosos = resMorosos.ok ? resMorosos.data : [];
  const pagos = resAuditoria.ok ? resAuditoria.data : [];

  return (
    <PanelCajaMorosos
      boxId={afiliacionActiva.boxId}
      moneda={afiliacionActiva.box.moneda}
      esAdministrador={esAdministrador}
      morososIniciales={morosos}
      pagosIniciales={pagos}
    />
  );
}
