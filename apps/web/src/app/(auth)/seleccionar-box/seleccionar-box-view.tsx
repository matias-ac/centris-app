"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AfiliacionConBox } from "@centris/shared";
import { obtenerInicialesUsuario } from "@/app/(box)/navegacion-box";
import { Button } from "@/components/ui/button";
import { BENTO_TITLE_CLASSES } from "@/components/ui/card";
import { SelectorBoxCard } from "./selector-box-card";

export interface SeleccionarBoxViewProps {
  nombreUsuario: string;
  afiliaciones: AfiliacionConBox[];
  boxActivoId: string | null;
  errorCargaAfiliaciones?: boolean;
  onSeleccionarBox: (boxId: string) => Promise<void>;
  onCerrarSesion: () => Promise<void>;
}

function AccionesEstadoSinBoxes({
  onCerrarSesion,
  onActualizar,
  actualizando
}: {
  onCerrarSesion: () => Promise<void>;
  onActualizar: () => void;
  actualizando: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <form action={onCerrarSesion}>
        <Button type="submit" variant="secondary">
          Cerrar sesión
        </Button>
      </form>
      <Button
        type="button"
        variant="primary"
        onClick={onActualizar}
        disabled={actualizando}
      >
        <RefreshCw
          className={actualizando ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          aria-hidden={true}
        />
        <span>{actualizando ? "Actualizando..." : "Actualizar listado"}</span>
      </Button>
    </div>
  );
}

/**
 * Vista completa Dark Bento Cockpit para la selección de Box activo según
 * las afiliaciones del usuario autenticado.
 */
export function SeleccionarBoxView({
  nombreUsuario,
  afiliaciones,
  boxActivoId,
  errorCargaAfiliaciones = false,
  onSeleccionarBox,
  onCerrarSesion
}: SeleccionarBoxViewProps) {
  const router = useRouter();
  const [actualizando, startRefresh] = useTransition();
  const iniciales = obtenerInicialesUsuario(nombreUsuario);

  function handleActualizarListado() {
    startRefresh(() => {
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1020px] flex-col gap-7 px-5 pt-7 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3.5 border-b border-border pb-[18px]">
        <Link
          href={boxActivoId ? "/inicio" : "/seleccionar-box"}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-xl text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[1.0625rem] font-semibold text-primary-foreground"
          >
            C
          </span>
          <span>Centris</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary"
            >
              {iniciales}
            </span>
            <span>{nombreUsuario}</span>
          </div>

          <form action={onCerrarSesion}>
            <Button type="submit" variant="secondary">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          Seleccioná tu Box
        </h1>
        <p className="max-w-[66ch] text-[0.9375rem] leading-[1.5] text-muted-foreground">
          Hola, {nombreUsuario}. Elegí con qué Box querés operar ahora; podés
          volver a cambiarlo desde el encabezado en cualquier momento.
        </p>
      </div>

      {errorCargaAfiliaciones ? (
        <section
          role="alert"
          data-testid="error-cargar-boxes"
          aria-label="Error al cargar tus Boxes"
          className="flex max-w-[620px] flex-col gap-3.5 rounded-3xl border border-[#FF6D6D]/28 bg-card p-6 sm:p-8"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle
              className="h-5 w-5 shrink-0 text-[#FF6D6D]"
              aria-hidden={true}
            />
            <h2 className={BENTO_TITLE_CLASSES}>
              No pudimos cargar tus Boxes
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ocurrió un inconveniente temporal al consultar tus afiliaciones.
            Intentá actualizar el listado o cerrá sesión y volvé a ingresar.
          </p>
          <AccionesEstadoSinBoxes
            onCerrarSesion={onCerrarSesion}
            onActualizar={handleActualizarListado}
            actualizando={actualizando}
          />
        </section>
      ) : afiliaciones.length === 0 ? (
        <section
          data-testid="sin-afiliaciones-box"
          aria-label="Sin afiliaciones activas"
          className="flex max-w-[620px] flex-col gap-3.5 rounded-3xl border border-dashed border-border bg-card p-6 sm:p-8"
        >
          <h2 className={BENTO_TITLE_CLASSES}>
            No tenés afiliaciones activas
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tu cuenta todavía no está vinculada a ningún Box. Si recién te diste
            de alta o creés que es un error, consultá en recepción o cerrá
            sesión para probar con otro correo.
          </p>
          <AccionesEstadoSinBoxes
            onCerrarSesion={onCerrarSesion}
            onActualizar={handleActualizarListado}
            actualizando={actualizando}
          />
        </section>
      ) : (
        <section
          aria-label="Boxes disponibles"
          className="grid grid-cols-1 gap-[18px] sm:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]"
        >
          {afiliaciones.map((afiliacion) => (
            <SelectorBoxCard
              key={afiliacion.id}
              afiliacion={afiliacion}
              esActivo={afiliacion.boxId === boxActivoId}
              onSeleccionarBox={onSeleccionarBox}
            />
          ))}
        </section>
      )}
    </main>
  );
}
