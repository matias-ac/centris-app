import Link from "next/link";
import { redirect } from "next/navigation";
import { tieneAlgunRol } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cerrarSesionAction } from "@/lib/actions";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { SelectorBoxHeader } from "./selector-box-header";

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

  const esAdmin = tieneAlgunRol(afiliacionActiva.roles, ["administrador"]);
  const puedeVerPlanes = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador",
    "recepcionista"
  ]);
  const puedeVerAtletas = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador",
    "recepcionista"
  ]);
  const puedeVerCaja = tieneAlgunRol(afiliacionActiva.roles, [
    "administrador",
    "recepcionista"
  ]);
  const puedeReservar = tieneAlgunRol(afiliacionActiva.roles, [
    "atleta",
    "administrador",
    "recepcionista"
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              data-testid="box-activo-nombre"
              className="font-display text-xl font-bold uppercase tracking-tight text-foreground"
            >
              {afiliacionActiva.box.nombre}
            </span>
            <div
              className="flex flex-wrap gap-1.5"
              data-testid="roles-activos-badges"
            >
              {afiliacionActiva.roles.map((rol) => (
                <Badge key={rol} variant="emerald">
                  {rol}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SelectorBoxHeader
              afiliaciones={contexto.afiliaciones}
              boxActivoId={afiliacionActiva.boxId}
            />
            <span className="text-xs text-muted-foreground">
              {contexto.sesion.nombre}
            </span>
            <form action={cerrarSesionAction}>
              <Button type="submit" variant="secondary">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 border-t border-border px-4 py-2.5">
          <Link
            href="/inicio"
            data-testid="nav-link-inicio"
            className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
          >
            Panel Operativo
          </Link>
          <Link
            href="/horarios"
            data-testid="nav-link-horarios"
            className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
          >
            Horarios recurrentes
          </Link>
          <Link
            href="/clases"
            data-testid="nav-link-clases"
            className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
          >
            Calendario de Clases
          </Link>
          {puedeReservar ? (
            <Link
              href="/reservas"
              data-testid="nav-link-reservas"
              className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
            >
              Mis Reservas
            </Link>
          ) : null}
          {puedeVerPlanes ? (
            <Link
              href="/planes"
              data-testid="nav-link-planes"
              className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
            >
              Catálogo de Planes
            </Link>
          ) : null}
          {puedeVerAtletas ? (
            <Link
              href="/atletas"
              data-testid="nav-link-atletas"
              className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
            >
              Directorio de Atletas
            </Link>
          ) : null}
          {puedeVerCaja ? (
            <Link
              href="/caja"
              data-testid="nav-link-caja"
              className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
            >
              Caja y Morosos
            </Link>
          ) : null}
          {esAdmin ? (
            <>
              <Link
                href="/afiliaciones"
                data-testid="nav-link-afiliaciones"
                className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
              >
                Afiliaciones del Box
              </Link>
              <Link
                href="/configuracion"
                data-testid="nav-link-configuracion"
                className="rounded-md px-3 py-1.5 text-[0.9375rem] font-semibold tracking-[0.01em] text-foreground hover:bg-secondary"
              >
                Configuración del Box
              </Link>
            </>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
