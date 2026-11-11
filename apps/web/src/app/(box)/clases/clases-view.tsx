"use client";

import {
  AlertCircle,
  Ban,
  Calendar,
  Check,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Dumbbell,
  RefreshCw,
  UserPlus,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ERROR_CODES,
  evaluarVentanaCorreccionAsistencia,
  type AfiliacionConUsuario,
  type Atleta,
  type Clase,
  type Reserva
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelarClaseAction,
  crearReservaAction,
  editarClaseAction,
  listarReservasClaseAction,
  materializarClasesAction,
  registrarAsistenciaAction
} from "@/lib/actions";

interface ClasesViewProps {
  boxId: string;
  timezone: string;
  esAdmin: boolean;
  esRecep: boolean;
  esCoach?: boolean;
  esSoloCoach?: boolean;
  afiliacionActivaId?: string;
  clasesIniciales: Clase[];
  coaches: AfiliacionConUsuario[];
  atletas?: Atleta[];
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
  esCoach = false,
  esSoloCoach: _esSoloCoach = false,
  afiliacionActivaId = "",
  clasesIniciales,
  coaches,
  atletas = []
}: ClasesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [claseEnEdicion, setClaseEnEdicion] = useState<Clase | null>(null);
  const [coachSeleccionado, setCoachSeleccionado] = useState("");
  const [cuposEdicion, setCuposEdicion] = useState("");
  const [claseEnCancelacion, setClaseEnCancelacion] = useState<Clase | null>(
    null
  );
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  const [claseEnWalkin, setClaseEnWalkin] = useState<Clase | null>(null);
  const [atletaSeleccionado, setAtletaSeleccionado] = useState("");
  const [errorWalkin, setErrorWalkin] = useState<{
    message: string;
    errorCode?: string;
  } | null>(null);

  const [claseEnAsistencia, setClaseEnAsistencia] = useState<Clase | null>(null);
  const [reservasAsistencia, setReservasAsistencia] = useState<Reserva[]>([]);
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false);
  const [errorAsistencia, setErrorAsistencia] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  function abrirAsistencia(clase: Clase) {
    setClaseEnEdicion(null);
    setClaseEnCancelacion(null);
    setClaseEnWalkin(null);
    setClaseEnAsistencia(clase);
    setErrorAsistencia(null);
    setCargandoAsistencia(true);
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await listarReservasClaseAction(boxId, clase.id);
      setCargandoAsistencia(false);
      if (res.ok && res.data) {
        setReservasAsistencia(res.data);
      } else {
        setErrorAsistencia(res.message ?? "Error al cargar la lista de reservas.");
      }
    });
  }

  function handleCambiarAsistencia(reservaId: string, presente: boolean) {
    setErrorAsistencia(null);
    startTransition(async () => {
      const res = await registrarAsistenciaAction(boxId, reservaId, { presente });
      if (!res.ok) {
        setErrorAsistencia(res.message ?? "Error al actualizar la asistencia.");
      } else {
        setReservasAsistencia((prev) =>
          prev.map((r) =>
            r.id === reservaId
              ? {
                  ...r,
                  asistenciaMarcadaEn: presente ? new Date().toISOString() : null
                }
              : r
          )
        );
        router.refresh();
      }
    });
  }

  function abrirEdicion(clase: Clase) {
    setClaseEnAsistencia(null);
    setClaseEnWalkin(null);
    setClaseEnCancelacion(null);
    setClaseEnEdicion(clase);
    setCoachSeleccionado(clase.coachAfiliacionId);
    setCuposEdicion(clase.cupos.toString());
    setErrorMsg(null);
    setExitoMsg(null);
  }

  function abrirCancelacion(clase: Clase) {
    setClaseEnAsistencia(null);
    setClaseEnWalkin(null);
    setClaseEnEdicion(null);
    setClaseEnCancelacion(clase);
    setMotivoCancelacion("");
    setErrorMsg(null);
    setExitoMsg(null);
  }

  function abrirWalkin(clase: Clase) {
    setClaseEnAsistencia(null);
    setClaseEnEdicion(null);
    setClaseEnCancelacion(null);
    setClaseEnWalkin(clase);
    setAtletaSeleccionado("");
    setErrorWalkin(null);
    setErrorMsg(null);
    setExitoMsg(null);
  }

  function handleConfirmarWalkin(e: React.FormEvent) {
    e.preventDefault();
    if (!claseEnWalkin || !atletaSeleccionado) return;

    setErrorWalkin(null);
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await crearReservaAction(boxId, {
        claseId: claseEnWalkin.id,
        afiliacionId: atletaSeleccionado
      });

      if (!res.ok) {
        setErrorWalkin({
          message: res.message ?? "Error al registrar el walk-in.",
          errorCode: res.errorCode
        });
      } else {
        setExitoMsg(
          "Walk-in registrado exitosamente en recepción. Reserva confirmada."
        );
        setClaseEnWalkin(null);
        setAtletaSeleccionado("");
        router.refresh();
      }
    });
  }

  function handleConfirmarCancelacionClase(e: React.FormEvent) {
    e.preventDefault();
    if (!claseEnCancelacion) return;

    setErrorMsg(null);
    setExitoMsg(null);

    const motivoLimpio = motivoCancelacion.trim();
    const payload = motivoLimpio ? { motivoCancelacion: motivoLimpio } : {};

    startTransition(async () => {
      const res = await cancelarClaseAction(
        boxId,
        claseEnCancelacion.id,
        payload
      );
      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al cancelar la Clase.");
      } else {
        setExitoMsg(
          "Clase cancelada por el Box: se reintegraron los Créditos a todos los Atletas inscriptos."
        );
        setClaseEnCancelacion(null);
        setMotivoCancelacion("");
        router.refresh();
      }
    });
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
            <CardTitle className="text-lg tabular-nums text-foreground">
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
                      className="mt-1 block w-full rounded-md border border-border bg-secondary px-3 py-2 text-base md:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    <span className="font-mono font-semibold tabular-nums">
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

      {claseEnCancelacion ? (
        <Card className="border-rose-500/40 bg-card">
          <CardHeader>
            <CardTitle className="text-lg tabular-nums text-foreground">
              Cancelar Clase por el Box (
              {formatearFecha(claseEnCancelacion.inicio, timezone)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleConfirmarCancelacionClase}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Al cancelar esta Clase, todas sus Reservas confirmadas (
                <span className="font-semibold tabular-nums text-foreground">
                  {claseEnCancelacion.reservasConfirmadas ?? 0}
                </span>
                ) pasarán a{" "}
                <span className="font-semibold text-foreground">
                  Cancelada por el Box
                </span>{" "}
                y los Atletas recuperarán el 100% de sus Créditos.
              </p>
              <div>
                <Label htmlFor="motivo-cancelacion-clase">
                  Motivo de cancelación (opcional)
                </Label>
                <Input
                  id="motivo-cancelacion-clase"
                  data-testid="input-motivo-cancelacion-clase"
                  type="text"
                  placeholder="Ej: Corte de suministro eléctrico"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  className="mt-1 text-base"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setClaseEnCancelacion(null)}
                  disabled={isPending}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  data-testid="btn-confirmar-cancelar-clase"
                  disabled={isPending}
                >
                  Confirmar Cancelación de Clase
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Modal/Formulario de Anotación de Walk-in por Mostrador */}
      {claseEnWalkin ? (
        <Card className="border-primary/40 bg-card" data-testid="form-walkin">
          <CardHeader>
            <CardTitle className="text-lg tabular-nums text-foreground">
              Anotar Walk-in en Mostrador — {claseEnWalkin.tipoClaseNombre ?? "Clase"} ({formatearFecha(claseEnWalkin.inicio, timezone)} {formatearHora(claseEnWalkin.inicio, timezone)})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Inscribí en el acto a un Atleta espontáneo en la Clase creando una Reserva ordinaria a nombre del operador.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirmarWalkin} className="space-y-4">
              <div>
                <Label htmlFor="select-atleta-walkin">Seleccionar Atleta</Label>
                <select
                  id="select-atleta-walkin"
                  data-testid="select-atleta-walkin"
                  value={atletaSeleccionado}
                  onChange={(e) => {
                    setAtletaSeleccionado(e.target.value);
                    setErrorWalkin(null);
                  }}
                  className="mt-1 block w-full rounded-md border border-border bg-secondary px-3 py-2 text-base md:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">-- Seleccioná un Atleta --</option>
                  {atletas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              {errorWalkin ? (
                <div
                  data-testid="alerta-error-walkin"
                  className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorWalkin.message}</span>
                  </div>

                  {errorWalkin.errorCode === ERROR_CODES.CUPO_AGOTADO ? (
                    <div className="pt-1">
                      <p className="text-xs text-destructive/80 mb-2">
                        La Clase no dispone de Cupos libres. Para permitir el ingreso, podés aumentar el Cupo de la Clase.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        data-testid="btn-guia-editar-cupo"
                        onClick={() => {
                          const claseParaEditar = claseEnWalkin;
                          setClaseEnWalkin(null);
                          setErrorWalkin(null);
                          abrirEdicion(claseParaEditar);
                        }}
                        className="text-xs px-2.5 py-1.5 min-h-8"
                      >
                        Editar Cupo de la Clase
                      </Button>
                    </div>
                  ) : null}

                  {errorWalkin.errorCode === ERROR_CODES.SIN_CREDITOS_DISPONIBLES ||
                  errorWalkin.errorCode === ERROR_CODES.MEMBRESIA_NO_VIGENTE ? (
                    <div className="pt-1">
                      <p className="text-xs text-destructive/80 mb-2">
                        El Atleta no dispone de Créditos o no posee una Membresía vigente para este período.
                      </p>
                      <Link
                        href="/atletas"
                        data-testid="link-regularizar-atleta"
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-border bg-secondary px-3 py-1.5 text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        Ir a Directorio de Atletas para regularizar Membresía / Créditos
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setClaseEnWalkin(null);
                    setErrorWalkin(null);
                  }}
                  disabled={isPending}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  data-testid="btn-confirmar-walkin"
                  disabled={isPending || !atletaSeleccionado}
                >
                  {isPending ? "Inscribiendo..." : "Confirmar Walk-in"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Panel de Asistencia de Clase (Ticket 12) */}
      {claseEnAsistencia ? (() => {
        const ventana = evaluarVentanaCorreccionAsistencia({
          claseFin: claseEnAsistencia.fin
        });
        const esCoachDeClase = claseEnAsistencia.coachAfiliacionId === afiliacionActivaId;
        const puedeModificar = (esAdmin || esRecep || esCoachDeClase) && !ventana.expirada;

        return (
          <Card
            className="border-emerald-500/40 bg-card"
            data-testid="panel-asistencia-clase"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-lg tabular-nums text-foreground flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-emerald-400" />
                  Control de Asistencia — {claseEnAsistencia.tipoClaseNombre ?? "Clase"} (
                  {formatearFecha(claseEnAsistencia.inicio, timezone)}{" "}
                  {formatearHora(claseEnAsistencia.inicio, timezone)})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Coach:{" "}
                  <span className="font-semibold text-foreground">
                    {claseEnAsistencia.coachNombre ?? "Coach"}
                  </span>{" "}
                  · Cupos:{" "}
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {claseEnAsistencia.reservasConfirmadas ?? 0} / {claseEnAsistencia.cupos}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setClaseEnAsistencia(null)}
                className="text-xs px-2.5 py-1 min-h-7"
              >
                Cerrar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {ventana.expirada ? (
                <div
                  data-testid="aviso-ventana-asistencia-expirada"
                  className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    La Ventana de Corrección de Asistencia ha vencido (más de 24 horas desde la finalización de la clase). Las reservas sin presente han quedado consolidadas como Ausencia.
                  </span>
                </div>
              ) : null}

              {!esAdmin && !esRecep && !esCoachDeClase ? (
                <div
                  data-testid="aviso-solo-coach-asignado"
                  className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Solo el Coach asignado a esta Clase ({claseEnAsistencia.coachNombre}), Recepción o Administración pueden registrar la Asistencia.
                  </span>
                </div>
              ) : null}

              {errorAsistencia ? (
                <div
                  data-testid="alerta-error-asistencia"
                  className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorAsistencia}</span>
                </div>
              ) : null}

              {cargandoAsistencia ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Cargando nómina de Atletas con Reserva...
                </p>
              ) : reservasAsistencia.length === 0 ? (
                <p
                  data-testid="mensaje-sin-reservas-asistencia"
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No hay Atletas con Reserva confirmada en esta Clase.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border">
                  {reservasAsistencia.map((r) => {
                    const presente = r.asistenciaMarcadaEn !== null;
                    const esAusencia = !presente && ventana.expirada;

                    return (
                      <div
                        key={r.id}
                        data-testid={`fila-asistencia-reserva-${r.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm hover:bg-secondary/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p
                            data-testid={`nombre-atleta-asistencia-${r.id}`}
                            className="font-medium text-foreground"
                          >
                            {r.atletaNombre ?? "Atleta"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.atletaEmail ?? ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {presente ? (
                            <Badge
                              variant="emerald"
                              data-testid={`badge-presente-${r.id}`}
                              className="uppercase tracking-wider font-semibold"
                            >
                              Presente
                            </Badge>
                          ) : esAusencia ? (
                            <Badge
                              variant="rose"
                              data-testid={`badge-ausencia-${r.id}`}
                              className="uppercase tracking-wider font-semibold"
                            >
                              Ausencia
                            </Badge>
                          ) : (
                            <Badge
                              variant="zinc"
                              data-testid={`badge-sin-marcar-${r.id}`}
                              className="uppercase tracking-wider"
                            >
                              Sin marcar
                            </Badge>
                          )}

                          {puedeModificar ? (
                            presente ? (
                              <Button
                                type="button"
                                variant="secondary"
                                data-testid={`btn-desmarcar-asistencia-${r.id}`}
                                disabled={isPending}
                                onClick={() => handleCambiarAsistencia(r.id, false)}
                                className="text-xs min-h-7 px-2.5 py-1"
                              >
                                Desmarcar
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                data-testid={`btn-marcar-asistencia-${r.id}`}
                                disabled={isPending}
                                onClick={() => handleCambiarAsistencia(r.id, true)}
                                className="text-xs min-h-7 px-2.5 py-1"
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Marcar Presente
                              </Button>
                            )
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })() : null}

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
                    <div className="flex items-center gap-2">
                      <Badge variant="zinc" className="font-semibold uppercase tracking-wider">
                        {clase.tipoClaseNombre ?? "Clase"}
                      </Badge>
                      {clase.canceladaEn !== null ? (
                        <Badge
                          variant="rose"
                          data-testid={`badge-clase-cancelada-${clase.id}`}
                          className="uppercase tracking-wider"
                        >
                          Clase Cancelada
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs capitalize tabular-nums text-muted-foreground">
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

                  {clase.canceladaEn !== null && clase.motivoCancelacion ? (
                    <p
                      data-testid={`motivo-cancelacion-clase-${clase.id}`}
                      className="text-xs text-rose-400"
                    >
                      Motivo: {clase.motivoCancelacion}
                    </p>
                  ) : null}

                  {clase.canceladaEn === null ? (
                    <div className="flex flex-wrap gap-2">
                      {esAdmin || esRecep || esCoach ? (
                        <Button
                          type="button"
                          variant="secondary"
                          data-testid={`btn-asistencia-clase-${clase.id}`}
                          onClick={() => abrirAsistencia(clase)}
                          className="text-xs px-2.5 py-1.5 min-h-8"
                        >
                          <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                          Asistencia
                        </Button>
                      ) : null}

                      {esAdmin || esRecep ? (
                        <>
                          <Button
                            type="button"
                            data-testid={`btn-walkin-clase-${clase.id}`}
                            onClick={() => abrirWalkin(clase)}
                            className="flex-1 text-xs px-2.5 py-1.5 min-h-8"
                          >
                            <UserPlus className="mr-1 h-3.5 w-3.5" />
                            Anotar Walk-in
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            data-testid={`btn-editar-clase-${clase.id}`}
                            onClick={() => abrirEdicion(clase)}
                            className="text-xs px-2.5 py-1.5 min-h-8"
                          >
                            Editar Clase
                          </Button>
                          {esAdmin ? (
                            <Button
                              type="button"
                              variant="destructive"
                              data-testid={`btn-abrir-cancelar-clase-${clase.id}`}
                              onClick={() => abrirCancelacion(clase)}
                              className="text-xs px-2.5 py-1.5 min-h-8"
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Cancelar Clase
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
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
