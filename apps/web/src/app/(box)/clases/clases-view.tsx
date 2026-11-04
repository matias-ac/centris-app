"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Dumbbell,
  RefreshCw,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AfiliacionConUsuario, Clase } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarClaseAction, materializarClasesAction } from "@/lib/actions";

interface ClasesViewProps {
  boxId: string;
  timezone: string;
  esAdmin: boolean;
  esRecep: boolean;
  clasesIniciales: Clase[];
  coaches: AfiliacionConUsuario[];
  fechaDesdeInicial: string;
  fechaHastaInicial: string;
}

function formatearHora(isoString: string | Date, timezone: string): string {
  const d = typeof isoString === "string" ? new Date(isoString) : isoString;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}

function formatearFecha(isoString: string | Date, timezone: string): string {
  const d = typeof isoString === "string" ? new Date(isoString) : isoString;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric"
  }).format(d);
}

export function ClasesView({
  boxId,
  timezone,
  esAdmin,
  esRecep,
  clasesIniciales,
  coaches
}: ClasesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [claseEnEdicion, setClaseEnEdicion] = useState<Clase | null>(null);
  const [coachSeleccionado, setCoachSeleccionado] = useState("");
  const [cuposEdicion, setCuposEdicion] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  function abrirEdicion(clase: Clase) {
    setClaseEnEdicion(clase);
    setCoachSeleccionado(clase.coachAfiliacionId);
    setCuposEdicion(clase.cupos.toString());
    setErrorMsg(null);
    setExitoMsg(null);
  }

  function handleMaterializar() {
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await materializarClasesAction(boxId);
      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al materializar Clases.");
      } else {
        setExitoMsg("Clases materializadas correctamente según el horizonte del Box.");
        router.refresh();
      }
    });
  }

  function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!claseEnEdicion) return;

    setErrorMsg(null);
    setExitoMsg(null);

    const payload: { coachAfiliacionId?: string; cupos?: number } = {};

    if (esAdmin && coachSeleccionado && coachSeleccionado !== claseEnEdicion.coachAfiliacionId) {
      payload.coachAfiliacionId = coachSeleccionado;
    }

    const cuposNum = parseInt(cuposEdicion, 10);
    if (!isNaN(cuposNum) && cuposNum !== claseEnEdicion.cupos) {
      payload.cupos = cuposNum;
    }

    if (Object.keys(payload).length === 0) {
      setClaseEnEdicion(null);
      return;
    }

    startTransition(async () => {
      const res = await editarClaseAction(boxId, claseEnEdicion.id, payload);

      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al editar la Clase.");
      } else {
        setExitoMsg("Clase actualizada correctamente.");
        setClaseEnEdicion(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Calendario de Clases
          </h1>
          <p className="text-sm text-muted-foreground">
            Consultá las Clases programadas en hora local del Box y gestioná cambios operativos.
          </p>
        </div>

        {esAdmin ? (
          <Button
            type="button"
            data-testid="btn-materializar-clases"
            onClick={handleMaterializar}
            disabled={isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Materializar Clases
          </Button>
        ) : null}
      </div>

      {errorMsg ? (
        <div
          data-testid="alerta-error-clase"
          className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {exitoMsg ? (
        <div
          data-testid="alerta-exito-clase"
          className="flex items-center gap-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      {/* Modal/Formulario de Edición Puntual de Clase */}
      {claseEnEdicion ? (
        <Card className="border-primary/40 bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              Editar Clase Puntual ({formatearFecha(claseEnEdicion.inicio, timezone)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-coach">Coach asignado</Label>
                  {esAdmin ? (
                    <select
                      id="edit-coach"
                      data-testid="select-coach-suplente"
                      value={coachSeleccionado}
                      onChange={(e) => setCoachSeleccionado(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.usuario?.nombre ?? "Coach"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {claseEnEdicion.coachNombre ?? "Coach"} (Solo Administrador puede cambiar el coach)
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-cupos">Cupos disponibles</Label>
                  <Input
                    id="edit-cupos"
                    data-testid="input-editar-cupos"
                    type="number"
                    min="1"
                    value={cuposEdicion}
                    onChange={(e) => setCuposEdicion(e.target.value)}
                    required
                    disabled={!esAdmin && !esRecep}
                    className="mt-1 tabular-nums font-mono"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reservas confirmadas actuales:{" "}
                    <span className="font-mono font-semibold">
                      {claseEnEdicion.reservasConfirmadas ?? 0}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setClaseEnEdicion(null)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="btn-guardar-edicion-clase"
                  disabled={isPending}
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Grilla / Listado de Clases */}
      {clasesIniciales.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="font-medium">No hay Clases materializadas para este período.</p>
            {esAdmin ? (
              <p className="text-sm mt-1">
                Hacé clic en &quot;Materializar Clases&quot; para generar las ocurrencias desde la plantilla semanal de Horarios.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clasesIniciales.map((clase) => {
            const horaInicio = formatearHora(clase.inicio, timezone);
            const horaFin = formatearHora(clase.fin, timezone);
            const fechaLabel = formatearFecha(clase.inicio, timezone);

            return (
              <Card
                key={clase.id}
                data-testid={`card-clase-${clase.id}`}
                className="flex flex-col justify-between border-border bg-card transition-colors hover:border-border/80"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="zinc" className="font-semibold uppercase tracking-wider">
                      {clase.tipoClaseNombre ?? "Clase"}
                    </Badge>
                    <span className="text-xs capitalize text-muted-foreground">
                      {fechaLabel}
                    </span>
                  </div>
                  <CardTitle className="mt-2 flex items-center gap-2 font-display text-xl text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="tabular-nums font-mono">
                      {horaInicio} - {horaFin}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Dumbbell className="h-4 w-4" />
                      <span data-testid={`coach-clase-${clase.id}`} className="font-medium text-foreground">
                        {clase.coachNombre ?? "Coach"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span
                        data-testid={`cupos-clase-${clase.id}`}
                        className="tabular-nums font-mono font-medium text-foreground"
                      >
                        {clase.reservasConfirmadas ?? 0} / {clase.cupos}
                      </span>
                    </div>
                  </div>

                  {esAdmin || esRecep ? (
                    <Button
                      type="button"
                      variant="secondary"
                      data-testid={`btn-editar-clase-${clase.id}`}
                      onClick={() => abrirEdicion(clase)}
                      className="w-full text-xs px-2.5 py-1.5 min-h-8"
                    >
                      Editar Clase
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
