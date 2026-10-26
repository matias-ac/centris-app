import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";

export const dynamic = "force-dynamic";

export default async function InicioBoxPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }
  const afiliacionActiva = contexto.afiliacionActiva;
  if (!afiliacionActiva) {
    redirect("/seleccionar-box");
  }

  const { roles, box } = afiliacionActiva;
  const tieneAdmin = tieneAlgunRol(roles, ["administrador"]);
  const tieneRecepcion = tieneAlgunRol(roles, ["recepcionista"]);
  const tieneCoach = tieneAlgunRol(roles, ["coach"]);
  const tieneAtleta = tieneAlgunRol(roles, ["atleta"]);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          Centro Operativo — {box.nombre}
        </h1>
        <p className="text-sm text-muted-foreground">
          Zona horaria:{" "}
          <span className="font-medium text-foreground">{box.timezone}</span> ·
          Moneda:{" "}
          <span className="font-medium text-foreground">{box.moneda}</span> ·
          Anticipación de reserva:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {box.anticipacionReservaDias} días
          </span>{" "}
          · Ventana de cancelación:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {box.ventanaCancelacionMinutos} min
          </span>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {tieneAdmin ? (
          <Card data-testid="panel-rol-administrador">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Dirección y Configuración</CardTitle>
              <Badge variant="emerald">Administrador</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Control total de configuración del Box, catálogo de Planes,
              Horarios recurrentes, Afiliaciones del equipo y auditoría de
              Pagos y Anulaciones.
            </CardContent>
          </Card>
        ) : null}

        {tieneRecepcion ? (
          <Card data-testid="panel-rol-recepcionista">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Mostrador y Recepción</CardTitle>
              <Badge variant="amber">Recepcionista</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Gestión de directorio de Atletas, alta en mostrador, asignación
              de Membresías, registro de Pagos y creación de Reservas en
              mostrador.
            </CardContent>
          </Card>
        ) : null}

        {tieneCoach ? (
          <Card data-testid="panel-rol-coach">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Piso de Entrenamiento</CardTitle>
              <Badge variant="emerald">Coach</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consulta de Clases del día, nómina de Atletas con Reserva
              confirmada y marcado de Asistencia dentro de la ventana de 24 hs.
            </CardContent>
          </Card>
        ) : null}

        {tieneAtleta ? (
          <Card data-testid="panel-rol-atleta">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Autogestión de Reservas</CardTitle>
              <Badge variant="zinc">Atleta</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Reserva y cancelación de Clases dentro del horizonte de
              anticipación del Box y consulta de vigencia de tu Membresía.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
