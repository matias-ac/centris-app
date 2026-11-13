"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarCheck2,
  Clock,
  CreditCard,
  DollarSign,
  Home,
  Menu,
  Settings,
  UserPlus,
  Users,
  X
} from "lucide-react";
import type { AfiliacionConBox } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  esRutaActiva,
  obtenerEtiquetaRol,
  obtenerInicialesUsuario,
  resolverNavegacionPorRoles,
  type IconoNavegacionId,
  type ItemNavegacionBox
} from "./navegacion-box";
import { SelectorBoxHeader } from "./selector-box-header";

const ICONOS_NAVEGACION: Record<
  IconoNavegacionId,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  inicio: Home,
  horarios: Clock,
  clases: Calendar,
  reservas: CalendarCheck2,
  planes: CreditCard,
  atletas: Users,
  caja: DollarSign,
  afiliaciones: UserPlus,
  configuracion: Settings
};

export interface ShellAutenticadoProps {
  afiliacionActiva: AfiliacionConBox;
  afiliaciones: AfiliacionConBox[];
  nombreUsuario: string;
  fechaOperativaLabel: string;
  onSeleccionarBox: (boxId: string) => Promise<void>;
  onCerrarSesion: () => Promise<void>;
  pathnameActual?: string;
  children: React.ReactNode;
}

function EnlaceSidebar({
  item,
  activo,
  onNavigate
}: {
  item: ItemNavegacionBox;
  activo: boolean;
  onNavigate: () => void;
}) {
  const Icono = ICONOS_NAVEGACION[item.id];

  return (
    <Link
      href={item.href}
      data-testid={item.testId}
      aria-current={activo ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-full px-3.5 py-2.5 text-[0.9375rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        activo
          ? "bg-primary text-primary-foreground font-semibold"
          : "text-muted-foreground font-medium hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icono className="h-[18px] w-[18px] shrink-0" aria-hidden={true} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/**
 * Shell operativo Dark Bento Cockpit con sidebar vertical fijo en desktop (>= 1024px)
 * y drawer táctil en móvil (< 1024px), preservando testids transversales E2E.
 */
export function ShellAutenticado({
  afiliacionActiva,
  afiliaciones,
  nombreUsuario,
  fechaOperativaLabel,
  onSeleccionarBox,
  onCerrarSesion,
  pathnameActual,
  children
}: ShellAutenticadoProps) {
  const pathnameRouter = usePathname();
  const pathname = pathnameActual ?? pathnameRouter ?? "/inicio";
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const navegacion = resolverNavegacionPorRoles(afiliacionActiva.roles);
  const iniciales = obtenerInicialesUsuario(nombreUsuario);

  useEffect(() => {
    if (!drawerAbierto) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerAbierto(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerAbierto]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] bg-background text-foreground">
      {drawerAbierto ? (
        <div
          aria-hidden="true"
          data-testid="sidebar-backdrop-movil"
          onClick={() => setDrawerAbierto(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        aria-label="Menú principal del Box"
        className={cn(
          "flex-col justify-between gap-5 border-r border-border bg-card px-3.5 py-5",
          drawerAbierto
            ? "fixed inset-y-0 left-0 z-50 flex w-[272px] overflow-y-auto shadow-2xl lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[248px] lg:shrink-0 lg:shadow-none"
            : "hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:shrink-0"
        )}
      >
        <div className="flex min-h-0 flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-border px-2.5 pb-3.5">
            <Link
              href="/inicio"
              onClick={() => setDrawerAbierto(false)}
              className="flex items-center gap-2.5 text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-primary text-base font-bold text-primary-foreground">
                C
              </span>
              <span>Centris</span>
            </Link>

            <Button
              type="button"
              variant="iconCircle"
              aria-label="Cerrar menú"
              onClick={() => setDrawerAbierto(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden={true} />
            </Button>
          </div>

          <nav aria-label="Secciones del Box" className="flex flex-col gap-1.5">
            {navegacion.principal.map((item) => (
              <EnlaceSidebar
                key={item.id}
                item={item}
                activo={esRutaActiva(pathname, item.href)}
                onNavigate={() => setDrawerAbierto(false)}
              />
            ))}
          </nav>
        </div>

        {navegacion.pie.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3.5">
            {navegacion.pie.map((item) => (
              <EnlaceSidebar
                key={item.id}
                item={item}
                activo={esRutaActiva(pathname, item.href)}
                onNavigate={() => setDrawerAbierto(false)}
              />
            ))}
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 lg:px-7">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="iconCircle"
              aria-label="Abrir menú de navegación"
              aria-expanded={drawerAbierto}
              data-testid="btn-menu-movil"
              onClick={() => setDrawerAbierto(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden={true} />
            </Button>

            <div className="inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-primary"
              />
              <span
                data-testid="box-activo-nombre"
                className="truncate text-sm font-medium text-foreground"
              >
                {afiliacionActiva.box.nombre}
              </span>
            </div>

            {afiliaciones.length > 1 ? (
              <SelectorBoxHeader
                afiliaciones={afiliaciones}
                boxActivoId={afiliacionActiva.boxId}
                onSeleccionarBox={onSeleccionarBox}
              />
            ) : null}

            <div className="hidden min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-xs text-muted-foreground tabular-nums sm:inline-flex">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden={true} />
              <span>{fechaOperativaLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex min-h-11 flex-wrap items-center gap-2.5 rounded-full border border-border bg-card px-3 py-1.5">
              <span
                aria-hidden="true"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary"
              >
                {iniciales}
              </span>
              <span className="text-sm font-medium text-foreground">
                {nombreUsuario}
              </span>
              <div
                className="flex flex-wrap items-center gap-1.5"
                data-testid="roles-activos-badges"
              >
                {afiliacionActiva.roles.map((rol) => {
                  const info = obtenerEtiquetaRol(rol);
                  return (
                    <Badge key={rol} variant={info.variant}>
                      {info.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <form action={onCerrarSesion}>
              <Button type="submit" variant="secondary">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-7 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
