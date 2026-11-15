"use client";

import { AlertCircle, CheckCircle2, Search } from "lucide-react";
import type { Atleta, Clase } from "@centris/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SideDrawer } from "@/components/ui/side-drawer";
import { cn } from "@/lib/utils";
import {
  formatearDiaCortoEsAr,
  formatearRangoHorarioReserva
} from "./reservas-estado";

export interface DrawerReservaMostradorProps {
  clase: Clase | null;
  timezone: string;
  hoyLocal: string;
  busquedaAtleta: string;
  onBusquedaChange: (valor: string) => void;
  atletasFiltrados: readonly Atleta[];
  atletaSeleccionadoId: string;
  onSeleccionarAtleta: (atletaId: string) => void;
  enviando: boolean;
  errorInline: { mensaje: string; errorCode?: string } | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Panel lateral de mostrador para Recepcionista / Administrador al inscribir un atleta.
 */
export function DrawerReservaMostrador({
  clase,
  timezone,
  hoyLocal,
  busquedaAtleta,
  onBusquedaChange,
  atletasFiltrados,
  atletaSeleccionadoId,
  onSeleccionarAtleta,
  enviando,
  errorInline,
  onClose,
  onSubmit
}: DrawerReservaMostradorProps) {
  const ocupacion = clase ? clase.reservasConfirmadas ?? 0 : 0;

  return (
    <SideDrawer
      open={clase !== null}
      onClose={onClose}
      testId="drawer-reserva-mostrador"
      title="Reservar para atleta en mostrador"
      description={
        clase
          ? `${clase.tipoClaseNombre ?? "Clase"} · ${formatearDiaCortoEsAr(clase.inicio, timezone, hoyLocal)} ${formatearRangoHorarioReserva(clase.inicio, clase.fin, timezone)}`
          : undefined
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-reserva-mostrador"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={enviando || !atletaSeleccionadoId}
          >
            {enviando ? "Reservando..." : "Confirmar reserva"}
          </Button>
        </div>
      }
    >
      <form id="form-reserva-mostrador" onSubmit={onSubmit} className="space-y-4">
        {errorInline && (
          <div
            role="alert"
            data-testid="alerta-error-reserva"
            data-error-code={errorInline.errorCode ?? ""}
            className="flex items-start gap-2.5 rounded-2xl border border-[#FF6D6D]/45 bg-[#FF6D6D]/10 p-3.5 text-sm text-foreground"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6D6D]"
              aria-hidden="true"
            />
            <p className="leading-snug">{errorInline.mensaje}</p>
          </div>
        )}

        {clase && (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3 text-sm">
            <span className="text-muted-foreground">Cupos actuales</span>
            <span className="font-semibold tabular-nums text-foreground">
              {ocupacion} / {clase.cupos}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="buscar-atleta-mostrador"
            className="block text-sm font-medium text-foreground"
          >
            Buscar atleta
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="buscar-atleta-mostrador"
              type="search"
              value={busquedaAtleta}
              onChange={(e) => onBusquedaChange(e.target.value)}
              placeholder="Nombre o email del atleta..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">
            Seleccionar atleta
          </span>
          {atletasFiltrados.length === 0 ? (
            <p className="rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
              No encontramos atletas activos que coincidan con tu búsqueda.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {atletasFiltrados.map((atleta) => {
                const elegido = atletaSeleccionadoId === atleta.id;
                return (
                  <button
                    key={atleta.id}
                    type="button"
                    onClick={() => onSeleccionarAtleta(atleta.id)}
                    aria-pressed={elegido}
                    className={cn(
                      "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      elegido
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-[#3A3C42]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {atleta.nombre}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {atleta.email}
                      </p>
                    </div>
                    {elegido && (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </SideDrawer>
  );
}
