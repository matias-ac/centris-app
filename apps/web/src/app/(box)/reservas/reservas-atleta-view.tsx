"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Dumbbell,
  Sparkles,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO,
  calcularDisponibilidadCreditos,
  obtenerFechaLocal,
  obtenerRangoPeriodoSemanal,
  type Clase,
  type Membresia,
  type Reserva
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { crearReservaAction } from "@/lib/actions";

interface ReservasAtletaViewProps {
  boxId: string;
  timezone: string;
  anticipacionReservaDias: number;
  clasesDisponibles: Clase[];
  misReservas: Reserva[];
  membresiaVigente: Membresia | null;
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
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);
}

export function ReservasAtletaView({
  boxId,
  timezone,
  anticipacionReservaDias,
  clasesDisponibles,
  misReservas,
  membresiaVigente
}: ReservasAtletaViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claseReservandoId, setClaseReservandoId] = useState<string | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const hoyLocal = obtenerFechaLocal(new Date(), timezone);
  const periodoActual = obtenerRangoPeriodoSemanal(hoyLocal);

  const reservasConfirmadas = misReservas.filter(
    (r) => r.estado === "CONFIRMADA"
  );
  const claseIdsConReservaActiva = new Set(
    reservasConfirmadas.map((r) => r.claseId)
  );

  // Calcular disponibilidad de Créditos en el Período actual de la Membresía vigente
  const disponibilidadActual = membresiaVigente
    ? calcularDisponibilidadCreditos({
        modalidadCreditos: membresiaVigente.modalidadCreditos,
        creditosPorPeriodo: membresiaVigente.creditosPorPeriodo,
        creditosExtra: membresiaVigente.creditosExtra,
        fechasClasesConsumidas: misReservas
          .filter(
            (r) =>
              r.membresiaId === membresiaVigente.id &&
              ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO.includes(r.estado) &&
              r.claseInicio !== undefined
          )
          .map((r) => obtenerFechaLocal(new Date(r.claseInicio!), timezone)),
        fechaClaseObjetivo: hoyLocal
      })
    : null;

  function handleReservar(claseId: string) {
    setErrorMsg(null);
    setExitoMsg(null);
    setClaseReservandoId(claseId);

    startTransition(async () => {
      const res = await crearReservaAction(boxId, { claseId });
      setClaseReservandoId(null);

      if (!res.ok) {
        setErrorMsg(res.message ?? "No se pudo confirmar la Reserva.");
      } else {
        setExitoMsg("Reserva confirmada exitosamente.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground md:text-3xl">
            Mis Reservas y Clases
          </h1>
          <p className="text-sm text-muted-foreground">
            Reservá tu Cupo en las Clases del Box dentro del horizonte de{" "}
            <span className="font-medium tabular-nums text-foreground">
              {anticipacionReservaDias} días
            </span>{" "}
            de Anticipación de Reserva.
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div
          data-testid="alerta-error-reserva"
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {exitoMsg ? (
        <div
          data-testid="alerta-exito-reserva"
          role="status"
          className="flex items-center gap-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      {/* Tarjeta de estado de Membresía y Créditos */}
      <Card
        data-testid="resumen-membresia-atleta"
        className="border-border bg-card"
      >
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-tight text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              Estado de Mi Membresía
            </CardTitle>
            {membresiaVigente ? (
              <Badge variant="emerald">Membresía Vigente</Badge>
            ) : (
              <Badge variant="rose">Sin Membresía Vigente</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membresiaVigente && disponibilidadActual ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vigencia Activa
                </p>
                <p
                  data-testid="vigencia-membresia-atleta"
                  className="mt-1 text-sm font-semibold tabular-nums text-foreground"
                >
                  {membresiaVigente.fechaInicio} al {membresiaVigente.fechaFin}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Modalidad: {membresiaVigente.modalidadCreditos}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Créditos del Período
                </p>
                <p
                  data-testid="creditos-periodo-restantes"
                  className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground"
                >
                  {membresiaVigente.modalidadCreditos === "ILIMITADO"
                    ? "Ilimitado"
                    : `${disponibilidadActual.creditosRestantesPeriodo ?? 0} / ${membresiaVigente.creditosPorPeriodo ?? 0}`}
                </p>
                {membresiaVigente.modalidadCreditos === "SEMANAL" ? (
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    Semana: {periodoActual.lunes} al {periodoActual.domingo}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bolsa Créditos Extra
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span data-testid="creditos-extra-restantes">
                    {disponibilidadActual.creditosExtraRestantes}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Válidos durante toda la Vigencia
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No contás con una Membresía activa para hoy ({hoyLocal}). Acercate
              a Recepción para habilitar tu Membresía.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sección Mis Reservas Confirmadas */}
      <section data-testid="seccion-mis-reservas" className="space-y-3">
        <h2 className="font-display text-xl font-semibold uppercase tracking-tight text-foreground">
          Mis Reservas Confirmadas ({reservasConfirmadas.length})
        </h2>

        {reservasConfirmadas.length === 0 ? (
          <Card className="border-dashed bg-card/60">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Todavía no tenés Reservas confirmadas. Elegí una Clase disponible
              más abajo para reservar tu Cupo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reservasConfirmadas.map((reserva) => (
              <Card
                key={reserva.id}
                data-testid={`item-mi-reserva-${reserva.claseId}`}
                className="border-emerald-500/30 bg-card"
              >
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="emerald"
                        className="uppercase tracking-wider"
                      >
                        Confirmada
                      </Badge>
                      <span className="font-display text-sm font-semibold uppercase text-foreground">
                        {reserva.tipoClaseNombre ?? "Clase"}
                      </span>
                    </div>
                    {reserva.claseInicio && reserva.claseFin ? (
                      <p className="text-xs capitalize tabular-nums text-muted-foreground">
                        {formatearFecha(reserva.claseInicio, timezone)} ·{" "}
                        <span className="font-mono font-semibold text-foreground">
                          {formatearHora(reserva.claseInicio, timezone)} -{" "}
                          {formatearHora(reserva.claseFin, timezone)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Grilla Mobile-First de Clases Disponibles */}
      <section data-testid="grilla-clases-disponibles" className="space-y-3">
        <h2 className="font-display text-xl font-semibold uppercase tracking-tight text-foreground">
          Clases Disponibles para Reservar
        </h2>

        {clasesDisponibles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Calendar className="mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">
                No hay Clases programadas dentro del horizonte de Anticipación de
                Reserva.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clasesDisponibles.map((clase) => {
              const horaInicio = formatearHora(clase.inicio, timezone);
              const horaFin = formatearHora(clase.fin, timezone);
              const fechaLabel = formatearFecha(clase.inicio, timezone);
              const confirmadas = clase.reservasConfirmadas ?? 0;
              const yaReservada = claseIdsConReservaActiva.has(clase.id);
              const sinCupo = confirmadas >= clase.cupos;

              return (
                <Card
                  key={clase.id}
                  data-testid={`card-reserva-clase-${clase.id}`}
                  className="flex flex-col justify-between border-border bg-card transition-colors hover:border-border/80"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="zinc"
                        className="font-semibold uppercase tracking-wider"
                      >
                        {clase.tipoClaseNombre ?? "Clase"}
                      </Badge>
                      <span className="text-xs capitalize tabular-nums text-muted-foreground">
                        {fechaLabel}
                      </span>
                    </div>
                    <CardTitle className="mt-2 flex items-center gap-2 font-display text-xl text-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-mono tabular-nums">
                        {horaInicio} - {horaFin}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Dumbbell className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {clase.coachNombre ?? "Coach"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span
                          data-testid={`cupos-disponibles-clase-${clase.id}`}
                          className="font-mono font-medium tabular-nums text-foreground"
                        >
                          {confirmadas} / {clase.cupos}
                        </span>
                      </div>
                    </div>

                    {yaReservada ? (
                      <div className="flex justify-end">
                        <Badge
                          variant="emerald"
                          data-testid={`badge-reserva-confirmada-${clase.id}`}
                          className="w-full justify-center py-1.5 uppercase tracking-wider"
                        >
                          Reserva Confirmada
                        </Badge>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        data-testid={`btn-reservar-clase-${clase.id}`}
                        disabled={isPending || sinCupo}
                        onClick={() => handleReservar(clase.id)}
                        className="w-full font-semibold"
                      >
                        {claseReservandoId === clase.id
                          ? "Reservando..."
                          : sinCupo
                            ? "Cupo Agotado"
                            : "Reservar"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
