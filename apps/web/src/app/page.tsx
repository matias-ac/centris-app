import {
  EstadoSaludSchema,
  SEED_BOX_IDS,
  type EstadoSalud
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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
    consultarSalud(SEED_BOX_IDS.boxCentrisNorte),
    consultarSalud(SEED_BOX_IDS.boxCentrisSur)
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Centris — Infraestructura y Aislamiento RLS
          </h1>
          <Badge variant="emerald" data-testid="estado-rls">
            {saludSinContexto.rlsActivo
              ? "Force Row Level Security Activo"
              : "RLS Inactivo"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Diagnóstico en vivo del monorepo (Next.js + NestJS + Drizzle ORM +
          PostgreSQL 16 en Docker).
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Rol de Conexión Operativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className="text-lg font-semibold text-foreground"
              data-testid="rol-conexion"
            >
              {saludSinContexto.rolConexion}
            </p>
            <p className="text-xs text-muted-foreground">
              Privilegio Bypass RLS:{" "}
              {saludSinContexto.bypassRls ? "Sí" : "No (restringido)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sin Contexto (Fail-Closed)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className="font-display text-2xl font-bold tabular-nums text-foreground"
              data-testid="conteo-sin-contexto"
            >
              {saludSinContexto.afiliacionesVisiblesEnContexto}
            </p>
            <p className="text-xs text-muted-foreground">
              Afiliaciones visibles sin contexto de Box
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Box Centris Norte / Sur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span
                className="font-display text-2xl font-bold tabular-nums text-primary"
                data-testid="conteo-box-norte"
              >
                {saludNorte.afiliacionesVisiblesEnContexto}
              </span>
              <span className="text-xs text-muted-foreground">Norte</span>
              <span
                className="font-display text-lg font-semibold tabular-nums text-foreground"
                data-testid="conteo-box-sur"
              >
                {saludSur.afiliacionesVisiblesEnContexto}
              </span>
              <span className="text-xs text-muted-foreground">Sur</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Afiliaciones aisladas por Box activo
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
