"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserPlus,
  XCircle
} from "lucide-react";
import type { Clase } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatearDiaCortoEsAr,
  formatearHoraClaseEsAr,
  type EstadoTarjetaClaseUI,
  type ItemHistorialReservaUI,
  type ProximaReservaUI
} from "./reservas-estado";

const TRACK_RAYADO_STYLE =
  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 4px, rgba(24,25,28,0.92) 4px, rgba(24,25,28,0.92) 8px)";

export function iconoParaBadge(variant: "mint" | "amber" | "coral" | "zinc") {
  if (variant === "mint") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  if (variant === "amber") {
    return (
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    );
  }
  if (variant === "coral") {
    return <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

export interface TarjetaProximaReservaProps {
  item: ProximaReservaUI;
  ventanaCancelacionMinutos: number;
  mostrandoAdvertenciaTardia: boolean;
  cancelando: boolean;
  deshabilitado: boolean;
  onSolicitarCancelacion: (item: ProximaReservaUI) => void;
  onConfirmarTardia: (item: ProximaReservaUI) => void;
  onCancelarAdvertencia: () => void;
}

/**
 * Tarjeta Bento para una reserva próxima del atleta con política de cancelación visible
 * y confirmación tardía inline sin diálogos nativos del navegador.
 */
export function TarjetaProximaReserva({
  item,
  ventanaCancelacionMinutos,
  mostrandoAdvertenciaTardia,
  cancelando,
  deshabilitado,
  onSolicitarCancelacion,
  onConfirmarTardia,
  onCancelarAdvertencia
}: TarjetaProximaReservaProps) {
  const {
    reserva,
    enCurso,
    enVentanaTardia,
    horaLimiteSinCargo,
    diaLabel,
    rangoHorario
  } = item;

  const badgeVariant = enCurso ? "mint" : enVentanaTardia ? "amber" : "mint";
  const badgeText = enCurso
    ? "En curso"
    : enVentanaTardia
      ? "Ventana tardía"
      : "Confirmada";

  return (
    <Card
      data-testid={`item-mi-reserva-${reserva.claseId}`}
      className="flex flex-col justify-between transition-colors hover:border-[#3A3C42]"
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-[1.0625rem] font-semibold leading-tight text-foreground">
              {reserva.tipoClaseNombre ?? "Clase"}
            </h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{diaLabel}</span>
              {" · "}
              <span className="tabular-nums">{rangoHorario}</span>
            </p>
            {reserva.coachNombre && (
              <p className="text-xs text-muted-foreground">
                Coach {reserva.coachNombre}
              </p>
            )}
          </div>

          <Badge variant={badgeVariant}>
            {iconoParaBadge(badgeVariant)}
            <span>{badgeText}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
          <Clock
            className={cn(
              "h-4 w-4 shrink-0",
              enCurso
                ? "text-[#18FFC8]"
                : enVentanaTardia
                  ? "text-[#FBBF24]"
                  : "text-[#18FFC8]"
            )}
            aria-hidden="true"
          />
          {enCurso ? (
            <span>
              La clase ya comenzó. La cancelación ya no está disponible.
            </span>
          ) : enVentanaTardia ? (
            <span>
              Ventana tardía (menos de{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {ventanaCancelacionMinutos} min
              </span>{" "}
              para el inicio). No reintegra crédito.
            </span>
          ) : (
            <span>
              Cancelación sin cargo hasta las{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {horaLimiteSinCargo}
              </span>
            </span>
          )}
        </div>

        {enCurso ? null : mostrandoAdvertenciaTardia ? (
          <div
            data-testid={`advertencia-cancelacion-tardia-${reserva.claseId}`}
            role="region"
            aria-label="Confirmación de cancelación tardía"
            className="space-y-3 rounded-2xl border border-[#FBBF24]/35 bg-[#FBBF24]/10 p-3.5"
          >
            <div className="flex items-start gap-2.5 text-xs leading-relaxed text-[#FDE68A]">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[#FBBF24]"
                aria-hidden="true"
              />
              <p>
                Estás dentro de la ventana tardía. Si cancelás ahora,{" "}
                <strong className="font-semibold text-foreground">
                  el crédito consumido no se reintegra
                </strong>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="destructive"
                className="w-full sm:flex-1"
                data-testid={`btn-confirmar-cancelacion-tardia-${reserva.claseId}`}
                disabled={cancelando}
                onClick={() => onConfirmarTardia(item)}
              >
                {cancelando ? "Cancelando..." : "Confirmar cancelación tardía"}
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={cancelando}
                onClick={onCancelarAdvertencia}
              >
                Mantener reserva
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            data-testid={`btn-cancelar-reserva-${reserva.claseId}`}
            disabled={deshabilitado || cancelando}
            onClick={() => onSolicitarCancelacion(item)}
          >
            {cancelando ? "Cancelando..." : "Cancelar reserva"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export interface TarjetaClaseDisponibleProps {
  clase: Clase;
  timezone: string;
  hoyLocal: string;
  estado: EstadoTarjetaClaseUI;
  esAtleta: boolean;
  esStaffMostrador: boolean;
  reservando: boolean;
  onReservar: (claseId: string) => void;
  onAbrirMostrador: (clase: Clase) => void;
}

/**
 * Tarjeta Bento de clase disponible con barra de ocupación con track rayado diagonal,
 * métricas tabulares y acción para Atleta y/o Mostrador.
 */
export function TarjetaClaseDisponible({
  clase,
  timezone,
  hoyLocal,
  estado,
  esAtleta,
  esStaffMostrador,
  reservando,
  onReservar,
  onAbrirMostrador
}: TarjetaClaseDisponibleProps) {
  const horaInicio = formatearHoraClaseEsAr(clase.inicio, timezone);
  const horaFin = formatearHoraClaseEsAr(clase.fin, timezone);
  const diaCorto = formatearDiaCortoEsAr(clase.inicio, timezone, hoyLocal);

  const colorFill = estado.pasada
    ? "bg-[#71717A]"
    : estado.llena
      ? "bg-[#FF6D6D]"
      : estado.porcentajeOcupacion >= 85
        ? "bg-[#FBBF24]"
        : "bg-primary";

  return (
    <Card
      data-testid={`card-reserva-clase-${clase.id}`}
      className={cn(
        "flex flex-col justify-between transition-colors",
        estado.pasada ? "opacity-75" : "hover:border-[#3A3C42]"
      )}
    >
      <CardContent className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{diaCorto}</span>
                <span>·</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {horaInicio} – {horaFin}
                </span>
              </div>
              <h3 className="truncate text-[1.0625rem] font-semibold leading-tight text-foreground">
                {clase.tipoClaseNombre ?? "Clase"}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                Coach {clase.coachNombre ?? "A confirmar"}
              </p>
            </div>

            <Badge variant={estado.badge.variant} className="shrink-0">
              {iconoParaBadge(estado.badge.variant)}
              <span>{estado.badge.label}</span>
            </Badge>
          </div>

          {estado.superpuesta && !estado.yaReservada && !estado.pasada && (
            <div className="flex items-center gap-2 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-3 py-2 text-xs text-[#FDE68A]">
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 text-[#FBBF24]"
                aria-hidden="true"
              />
              <span>Se superpone con otra reserva confirmada</span>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-border/80 bg-secondary px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Cupos ocupados</span>
              <span
                data-testid={`cupos-disponibles-clase-${clase.id}`}
                className="font-semibold tabular-nums text-foreground"
              >
                {estado.ocupadas} / {estado.cupos}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Ocupación de ${clase.tipoClaseNombre ?? "Clase"}`}
              aria-valuemin={0}
              aria-valuemax={estado.cupos}
              aria-valuenow={estado.ocupadas}
              className="h-2.5 w-full overflow-hidden rounded-full border border-border/60"
              style={{ backgroundImage: TRACK_RAYADO_STYLE }}
            >
              <div
                className={cn("h-full rounded-full transition-all", colorFill)}
                style={{ width: `${estado.porcentajeOcupacion}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[0.75rem] text-muted-foreground">
              <span className="tabular-nums">
                {estado.libres > 0
                  ? `${estado.libres} ${estado.libres === 1 ? "lugar libre" : "lugares libres"}`
                  : "Cupo completo"}
              </span>
              <span className="tabular-nums">{estado.porcentajeOcupacion}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {esAtleta &&
            (estado.yaReservada ? (
              <div className="flex min-h-11 items-center justify-center rounded-full border border-[#18FFC8]/30 bg-[#18FFC8]/10 px-4">
                <Badge
                  variant="mint"
                  data-testid={`badge-reserva-confirmada-${clase.id}`}
                  className="border-0 bg-transparent px-0"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Lugar confirmado</span>
                </Badge>
              </div>
            ) : estado.puedeReservar ? (
              <Button
                variant="primary"
                className="w-full"
                data-testid={`btn-reservar-clase-${clase.id}`}
                disabled={reservando}
                onClick={() => onReservar(clase.id)}
              >
                {reservando ? "Reservando..." : "Reservar lugar"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                data-testid={`btn-reservar-clase-${clase.id}`}
                disabled
              >
                {estado.motivoBloqueo ?? "No disponible"}
              </Button>
            ))}

          {esStaffMostrador && (
            <Button
              variant={esAtleta ? "secondary" : "primary"}
              className="w-full"
              data-testid={`btn-mostrador-reserva-${clase.id}`}
              disabled={estado.pasada || estado.llena || reservando}
              onClick={() => onAbrirMostrador(clase)}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>
                {esAtleta ? "Reservar en mostrador" : "Reservar para atleta"}
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fila Bento dentro del historial de asistencias, ausencias y cancelaciones.
 */
export function FilaHistorialReserva({
  item
}: {
  item: ItemHistorialReservaUI;
}) {
  const { reserva, etiqueta, variante, detalle, diaLabel, rangoHorario } = item;

  return (
    <div
      data-testid={`item-historial-reserva-${reserva.id}`}
      className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {reserva.tipoClaseNombre ?? "Clase"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {diaLabel} <span className="tabular-nums">{rangoHorario}</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.esAsistenciaPresente ? (
          <Badge variant="mint" data-testid={`badge-asistencia-${reserva.id}`}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Presente</span>
          </Badge>
        ) : item.esAusencia ? (
          <Badge variant="coral" data-testid={`badge-ausencia-${reserva.id}`}>
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ausencia</span>
          </Badge>
        ) : (
          <Badge variant={variante}>
            {iconoParaBadge(variante)}
            <span>{etiqueta}</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
