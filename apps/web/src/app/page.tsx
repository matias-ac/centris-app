import { EstadoSaludSchema, type EstadoSalud } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const BOX_CENTRIS_NORTE_ID = "00000000-0000-4000-8000-000000000101";
const BOX_CENTRIS_SUR_ID = "00000000-0000-4000-8000-000000000102";

async function consultarSalud(boxId?: string): Promise<EstadoSalud> {
  const query = boxId ? `?boxId=${encodeURIComponent(boxId)}` : "";
  const response = await fetch(`${API_URL}/salud${query}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Error al consultar salud: HTTP ${response.status}`);
  }
  const data = await response.json();
  return EstadoSaludSchema.parse(data);
}

export default async function HomePage() {
  const [saludSinContexto, saludNorte, saludSur] = await Promise.all([
    consultarSalud(),
    consultarSalud(BOX_CENTRIS_NORTE_ID),
    consultarSalud(BOX_CENTRIS_SUR_ID)
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Centris — Infraestructura y Aislamiento RLS
          </h1>
          <Badge variant="emerald" data-testid="estado-rls">
            {saludSinContexto.rlsActivo
              ? "FORCE ROW LEVEL SECURITY ACTIVO"
              : "RLS INACTIVO"}
          </Badge>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          Diagnóstico en vivo del monorepo (Next.js + NestJS + Drizzle ORM +
          PostgreSQL 16 en Docker).
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Rol de Conexión Operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className="text-lg font-semibold text-white"
              data-testid="rol-conexion"
            >
              {saludSinContexto.rolConexion}
            </p>
            <p className="text-xs text-[#A1A1AA]">
              BYPASSRLS: {saludSinContexto.bypassRls ? "Sí" : "No (NOBYPASSRLS)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Sin Contexto (Fail-Closed)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className="text-2xl font-bold tabular-nums text-white"
              data-testid="conteo-sin-contexto"
            >
              {saludSinContexto.afiliacionesVisiblesEnContexto}
            </p>
            <p className="text-xs text-[#A1A1AA]">
              Afiliaciones visibles sin SET LOCAL
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Box Centris Norte / Sur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span
                className="text-2xl font-bold tabular-nums text-[#E2F800]"
                data-testid="conteo-box-norte"
              >
                {saludNorte.afiliacionesVisiblesEnContexto}
              </span>
              <span className="text-xs text-[#A1A1AA]">Norte</span>
              <span
                className="text-lg font-semibold tabular-nums text-white"
                data-testid="conteo-box-sur"
              >
                {saludSur.afiliacionesVisiblesEnContexto}
              </span>
              <span className="text-xs text-[#A1A1AA]">Sur</span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Afiliaciones aisladas por SET LOCAL app.box_id
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
