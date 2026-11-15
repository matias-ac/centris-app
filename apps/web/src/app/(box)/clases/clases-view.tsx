"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent
} from "react";
import {
  ERROR_CODES,
  esAusenciaConsolidada,
  obtenerFechaLocal,
  type AfiliacionConUsuario,
  type Atleta,
  type Clase,
  type Reserva
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { BENTO_TITLE_CLASSES, Card } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { InlineConfirmPanel } from "@/components/ui/inline-confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SideDrawer } from "@/components/ui/side-drawer";
import {
  cancelarClaseAction,
  crearReservaAction,
  editarClaseAction,
  listarReservasClaseAction,
  materializarClasesAction,
  registrarAsistenciaAction
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  calcularResumenClases,
  construirOpcionesFiltroCoaches,
  construirOpcionesFiltroTipos,
  construirPestanasDiasClases,
  evaluarEstadoClase,
  filtrarClases,
  formatearFechaClaseLegible,
  formatearRangoHorarioClase,
  procesarCambioAsistencia,
  procesarCancelacionClase,
  procesarEdicionClase,
  procesarMaterializacionDesdeClases,
  procesarWalkinClase,
  traducirErrorClases
} from "./clases-estado";

export interface ClasesViewProps {
  boxId: string;
  timezone: string;
  esAdmin: boolean;
  esRecep: boolean;
  esCoach: boolean;
  esAtleta?: boolean;
  afiliacionActivaId: string;
  clasesIniciales: Clase[];
  coaches: AfiliacionConUsuario[];
  atletas: Atleta[];
  misReservasClaseIds?: string[];
  fechaDesdeInicial: string;
  fechaHastaInicial: string;
  ahoraInicialIso: string;
}

type TipoDrawerActivo =
  | { tipo: "asistencia"; claseId: string }
  | { tipo: "mostrador"; claseId: string }
  | { tipo: "edicion"; claseId: string }
  | { tipo: "cancelacion"; claseId: string }
  | null;

const TRACK_RAYADO_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 4px, rgba(24,25,28,0.92) 4px, rgba(24,25,28,0.92) 8px)"
};

function formatearEstadoAsistenciaReserva(
  reserva: Reserva,
  clase: Clase,
  ahora: Date
): {
  label: string;
  variant: "mint" | "amber" | "coral" | "zinc";
  marcadoPresente: boolean;
  esAusencia: boolean;
} {
  if (reserva.asistenciaMarcadaEn !== null) {
    return {
      label: "Presente",
      variant: "mint",
      marcadoPresente: true,
      esAusencia: false
    };
  }
  if (
    Boolean(reserva.ausenciaConsolidada) ||
    esAusenciaConsolidada(
      {
        estado: reserva.estado,
        asistenciaMarcadaEn: reserva.asistenciaMarcadaEn,
        claseFin: clase.fin
      },
      ahora
    )
  ) {
    return {
      label: "Ausente",
      variant: "coral",
      marcadoPresente: false,
      esAusencia: true
    };
  }
  return {
    label: "Sin marcar",
    variant: "zinc",
    marcadoPresente: false,
    esAusencia: false
  };
}

export interface ClaseCardProps {
  clase: Clase;
  timezone: string;
  ahora: Date;
  esAdmin: boolean;
  esRecep: boolean;
  esCoach: boolean;
  esAtleta: boolean;
  reservadaPorMi: boolean;
  onAbrirAsistencia: (clase: Clase) => void;
  onAbrirWalkin: (clase: Clase) => void;
  onAbrirEdicion: (clase: Clase) => void;
  onAbrirCancelacion: (clase: Clase) => void;
}

/**
 * Tarjeta Bento operativa de una clase individual con barra de ocupación #C1F429 y acciones según rol.
 */
export function ClaseCard({
  clase,
  timezone,
  ahora,
  esAdmin,
  esRecep,
  esCoach,
  esAtleta,
  reservadaPorMi,
  onAbrirAsistencia,
  onAbrirWalkin,
  onAbrirEdicion,
  onAbrirCancelacion
}: ClaseCardProps) {
  const estado = evaluarEstadoClase(clase, {
    ahora,
    esAtleta,
    reservadaPorMi
  });
  const rango = formatearRangoHorarioClase(clase.inicio, clase.fin, timezone);
  const fechaLegible = formatearFechaClaseLegible(clase.inicio, timezone);
  const soloAtleta = esAtleta && !esAdmin && !esRecep && !esCoach;
  const esStaffMostrador = esAdmin || esRecep;
  const puedeVerNomina = esStaffMostrador || esCoach;

  return (
    <Card
      data-testid={`card-clase-${clase.id}`}
      className={cn(
        "flex flex-col justify-between gap-4 transition-colors",
        estado.cancelada
          ? "border-[#FF6D6D]/25 bg-[#111214]/85"
          : "hover:border-white/[0.16]"
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium capitalize text-muted-foreground">
              {fechaLegible}
            </p>
            <p className="text-base font-bold text-foreground tabular-nums">
              {rango}
            </p>
          </div>
          <Badge variant={estado.badge.variant}>{estado.badge.label}</Badge>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {clase.tipoClaseNombre ?? "Clase"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Coach:{" "}
            <span
              data-testid={`coach-clase-${clase.id}`}
              className="font-medium text-foreground"
            >
              {clase.coachNombre ?? "Sin asignar"}
            </span>
          </p>
        </div>

        <div className="space-y-2.5 rounded-2xl border border-white/[0.06] bg-[#18191C] p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <Users className="size-3.5" aria-hidden="true" />
              Ocupación
            </span>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span
                data-testid={`cupos-clase-${clase.id}`}
                className="text-sm font-semibold text-foreground"
              >
                {estado.ocupadas} / {estado.cupos}
              </span>
              <span className="text-xs text-muted-foreground">
                {estado.porcentajeOcupacion}%
              </span>
            </div>
          </div>

          <div
            className="h-2.5 w-full overflow-hidden rounded-full border border-white/[0.06]"
            style={TRACK_RAYADO_STYLE}
            role="progressbar"
            aria-label={`Ocupación ${estado.ocupadas} de ${estado.cupos}`}
            aria-valuenow={estado.porcentajeOcupacion}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                estado.cancelada ? "bg-[#A1A1AA]/40" : "bg-[#C1F429]"
              )}
              style={{ width: `${estado.porcentajeOcupacion}%` }}
            />
          </div>
        </div>

        {estado.cancelada ? (
          <div className="rounded-2xl border border-[#FF6D6D]/25 bg-[#FF6D6D]/10 px-3.5 py-2.5 text-sm text-[#FF6D6D]">
            <p className="text-xs font-semibold">Motivo de cancelación</p>
            <p
              data-testid={`motivo-cancelacion-clase-${clase.id}`}
              className="mt-0.5 text-sm"
            >
              {clase.motivoCancelacion || "Cancelada por administración"}
            </p>
          </div>
        ) : null}
      </div>

      {!estado.cancelada ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {puedeVerNomina ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 flex-1"
              data-testid={`btn-asistencia-clase-${clase.id}`}
              onClick={() => onAbrirAsistencia(clase)}
            >
              <ClipboardCheck className="size-4" aria-hidden="true" />
              {esCoach && !esStaffMostrador ? "Asistencia" : "Ver nómina"}
            </Button>
          ) : null}

          {esStaffMostrador ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 flex-1"
              data-testid={`btn-walkin-clase-${clase.id}`}
              onClick={() => onAbrirWalkin(clase)}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Inscribir en mostrador
            </Button>
          ) : null}

          {esStaffMostrador ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              data-testid={`btn-editar-clase-${clase.id}`}
              onClick={() => onAbrirEdicion(clase)}
            >
              Editar
            </Button>
          ) : null}

          {esAdmin ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              data-testid={`btn-abrir-cancelar-clase-${clase.id}`}
              onClick={() => onAbrirCancelacion(clase)}
            >
              Cancelar
            </Button>
          ) : null}

          {soloAtleta ? (
            <Link
              href="/reservas"
              className={buttonClassName(
                reservadaPorMi ? "secondary" : "primary",
                "min-h-11 w-full justify-between"
              )}
            >
              <span>
                {reservadaPorMi
                  ? "Gestionar en Mis Reservas"
                  : "Reservar en Mis Reservas"}
              </span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export interface DrawerAsistenciaProps {
  clase: Clase;
  timezone: string;
  ahora: Date;
  esAdmin: boolean;
  esRecep: boolean;
  afiliacionActivaId: string;
  reservas: Reserva[];
  cargando: boolean;
  isPending: boolean;
  busqueda: string;
  error: string | null;
  onBusquedaChange: (valor: string) => void;
  onToggleAsistencia: (reserva: Reserva, presente: boolean) => void;
  onClose: () => void;
}

/**
 * Panel lateral de nómina y toma de asistencia dentro de la ventana de 24 h.
 */
export function DrawerAsistencia({
  clase,
  timezone,
  ahora,
  esAdmin,
  esRecep,
  afiliacionActivaId,
  reservas,
  cargando,
  isPending,
  busqueda,
  error,
  onBusquedaChange,
  onToggleAsistencia,
  onClose
}: DrawerAsistenciaProps) {
  const estado = evaluarEstadoClase(clase, {
    ahora,
    esAtleta: false,
    reservadaPorMi: false
  });
  const esCoachTitular = clase.coachAfiliacionId === afiliacionActivaId;
  const esStaffMostrador = esAdmin || esRecep;
  const puedeEditarAsistencia =
    !estado.cancelada &&
    estado.ventanaAsistencia.estado === "PERMITIDA" &&
    (esStaffMostrador || esCoachTitular);

  const textoBusqueda = busqueda.trim().toLowerCase();
  const reservasFiltradas = useMemo(() => {
    if (!textoBusqueda) return reservas;
    return reservas.filter((reserva) =>
      (reserva.atletaNombre ?? "").toLowerCase().includes(textoBusqueda)
    );
  }, [reservas, textoBusqueda]);

  const presentesCount = reservas.filter(
    (r) => r.asistenciaMarcadaEn !== null
  ).length;
  const mostrarAvisoSoloCoach = !esStaffMostrador && !esCoachTitular;
  const mostrarAvisoVentanaExpirada =
    !estado.cancelada && estado.ventanaAsistencia.estado === "VENCIDA";

  return (
    <div data-testid="panel-asistencia-clase" className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-[#18191C] p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            {clase.tipoClaseNombre ?? "Clase"} ·{" "}
            <span className="tabular-nums">
              {formatearRangoHorarioClase(clase.inicio, clase.fin, timezone)}
            </span>
          </p>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            Presentes: {presentesCount} / {reservas.length}
          </span>
        </div>

        <p
          data-testid={
            mostrarAvisoVentanaExpirada
              ? "aviso-ventana-asistencia-expirada"
              : mostrarAvisoSoloCoach
                ? "aviso-solo-coach-asignado"
                : undefined
          }
          className="flex items-start gap-2 text-xs text-muted-foreground"
        >
          <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {estado.ventanaAsistencia.estado === "PERMITIDA"
              ? puedeEditarAsistencia
                ? "Ventana de corrección abierta (hasta 24 h desde el fin de la clase)."
                : esRecep
                  ? "Solo el coach asignado o administración pueden marcar asistencia."
                  : "Solo el coach titular o administración pueden registrar asistencia."
              : estado.ventanaAsistencia.motivo ??
                "La ventana de asistencia no está habilitada para esta clase."}
          </span>
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          data-testid="alerta-error-clase"
          className="flex items-start gap-2 rounded-2xl border border-[#FF6D6D]/30 bg-[#FF6D6D]/10 px-4 py-3 text-sm text-[#FF6D6D]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="busqueda-nomina-atleta">Buscar atleta</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="busqueda-nomina-atleta"
            type="search"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Filtrar por nombre..."
            className="min-h-11 pl-10 text-base"
          />
        </div>
      </div>

      {cargando ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#18191C] px-4 py-6 text-center text-sm text-muted-foreground">
          Cargando nómina de atletas...
        </div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#18191C] px-4 py-6 text-center text-sm text-muted-foreground">
          {reservas.length === 0
            ? "Todavía no hay atletas inscriptos en esta clase."
            : "Ningún atleta coincide con la búsqueda."}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {reservasFiltradas.map((reserva) => {
            const estadoReserva = formatearEstadoAsistenciaReserva(
              reserva,
              clase,
              ahora
            );
            const proximoPresente = !estadoReserva.marcadoPresente;
            const badgeTestId = estadoReserva.marcadoPresente
              ? `badge-presente-${reserva.id}`
              : estadoReserva.esAusencia
                ? `badge-ausencia-${reserva.id}`
                : `badge-sin-marcar-${reserva.id}`;
            return (
              <li
                key={reserva.id}
                data-testid={`fila-asistencia-reserva-${reserva.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#18191C] p-3.5"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {reserva.atletaNombre ?? "Atleta"}
                  </p>
                  <Badge data-testid={badgeTestId} variant={estadoReserva.variant}>
                    {estadoReserva.label}
                  </Badge>
                </div>

                {puedeEditarAsistencia ? (
                  <Button
                    type="button"
                    variant={
                      estadoReserva.marcadoPresente ? "secondary" : "primary"
                    }
                    className="min-h-11"
                    disabled={isPending}
                    data-testid={
                      estadoReserva.marcadoPresente
                        ? `btn-desmarcar-asistencia-${reserva.id}`
                        : `btn-marcar-asistencia-${reserva.id}`
                    }
                    onClick={() => onToggleAsistencia(reserva, proximoPresente)}
                  >
                    <Check className="size-4" aria-hidden="true" />
                    {estadoReserva.marcadoPresente
                      ? "Desmarcar asistencia"
                      : "Marcar presente"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          onClick={onClose}
        >
          Cerrar nómina
        </Button>
      </div>
    </div>
  );
}

export interface DrawerMostradorProps {
  clase: Clase;
  timezone: string;
  atletas: Atleta[];
  atletaId: string;
  isPending: boolean;
  errorWalkin: { message: string; errorCode?: string } | null;
  onAtletaChange: (atletaId: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onIrAEditarCupo?: () => void;
  onClose: () => void;
}

/**
 * Panel lateral de inscripción en mostrador con guías contextuales ante cupo agotado o falta de créditos.
 */
export function DrawerMostrador({
  clase,
  timezone,
  atletas,
  atletaId,
  isPending,
  errorWalkin,
  onAtletaChange,
  onSubmit,
  onIrAEditarCupo,
  onClose
}: DrawerMostradorProps) {
  const esCupoAgotado = errorWalkin?.errorCode === ERROR_CODES.CUPO_AGOTADO;
  const esProblemaMembresia =
    errorWalkin?.errorCode === ERROR_CODES.SIN_CREDITOS_DISPONIBLES ||
    errorWalkin?.errorCode === ERROR_CODES.MEMBRESIA_NO_VIGENTE;

  return (
    <form
      data-testid="form-walkin"
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-white/[0.06] bg-[#18191C] p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {clase.tipoClaseNombre ?? "Clase"} ·{" "}
          <span className="tabular-nums">
            {formatearRangoHorarioClase(clase.inicio, clase.fin, timezone)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Ocupación actual: {clase.reservasConfirmadas ?? 0} / {clase.cupos}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="select-atleta-walkin">Atleta del Box</Label>
        <Select
          id="select-atleta-walkin"
          data-testid="select-atleta-walkin"
          className="min-h-11 text-base"
          value={atletaId}
          onChange={(e) => onAtletaChange(e.target.value)}
          disabled={isPending || atletas.length === 0}
        >
          {atletas.length === 0 ? (
            <option value="">No hay atletas activos disponibles</option>
          ) : (
            atletas.map((atleta) => (
              <option key={atleta.afiliacionId} value={atleta.afiliacionId}>
                {atleta.nombre} ({atleta.email})
              </option>
            ))
          )}
        </Select>
      </div>

      {errorWalkin ? (
        <div
          role="alert"
          data-testid="alerta-error-walkin"
          className="space-y-3 rounded-2xl border border-[#FF6D6D]/30 bg-[#FF6D6D]/10 p-4 text-sm text-[#FF6D6D]"
        >
          <p className="flex items-start gap-2">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{errorWalkin.message}</span>
          </p>

          {esCupoAgotado && onIrAEditarCupo ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full"
              data-testid="btn-guia-editar-cupo"
              onClick={onIrAEditarCupo}
            >
              Ampliar cupo de esta clase
            </Button>
          ) : null}

          {esProblemaMembresia ? (
            <Link
              href="/atletas"
              data-testid="link-regularizar-atleta"
              className={buttonClassName(
                "secondary",
                "min-h-11 w-full justify-between"
              )}
            >
              <span>Regularizar membresía del atleta</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 flex-1"
          disabled={isPending}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="min-h-11 flex-1"
          data-testid="btn-confirmar-walkin"
          disabled={isPending || !atletaId}
        >
          {isPending ? "Inscribiendo..." : "Confirmar inscripción"}
        </Button>
      </div>
    </form>
  );
}

export interface DrawerEditarClaseProps {
  clase: Clase;
  timezone: string;
  esAdmin: boolean;
  coaches: AfiliacionConUsuario[];
  coachSeleccionado: string;
  cuposEdicion: string;
  isPending: boolean;
  error: string | null;
  onCoachChange: (coachId: string) => void;
  onCuposChange: (cupos: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

/**
 * Panel lateral de edición puntual de una clase (coach suplente y cupo máximo) sin alterar el horario maestro.
 */
export function DrawerEditarClase({
  clase,
  timezone,
  esAdmin,
  coaches,
  coachSeleccionado,
  cuposEdicion,
  isPending,
  error,
  onCoachChange,
  onCuposChange,
  onSubmit,
  onClose
}: DrawerEditarClaseProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-[#18191C] p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {clase.tipoClaseNombre ?? "Clase"} ·{" "}
          <span className="tabular-nums">
            {formatearRangoHorarioClase(clase.inicio, clase.fin, timezone)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Reservas confirmadas actuales: {clase.reservasConfirmadas ?? 0}
        </p>
      </div>

      {esAdmin ? (
        <div className="space-y-2">
          <Label htmlFor="select-coach-suplente">Coach asignado</Label>
          <Select
            id="select-coach-suplente"
            data-testid="select-coach-suplente"
            className="min-h-11 text-base"
            value={coachSeleccionado}
            onChange={(e) => onCoachChange(e.target.value)}
            disabled={isPending}
          >
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.usuario.nombre}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="input-editar-cupos">Cupo máximo de la clase</Label>
        <Input
          id="input-editar-cupos"
          data-testid="input-editar-cupos"
          type="number"
          min="1"
          className="min-h-11 text-base tabular-nums"
          value={cuposEdicion}
          onChange={(e) => onCuposChange(e.target.value)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Este cambio aplica únicamente a esta clase puntual.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          data-testid="alerta-error-clase"
          className="flex items-start gap-2 rounded-2xl border border-[#FF6D6D]/30 bg-[#FF6D6D]/10 px-4 py-3 text-sm text-[#FF6D6D]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 flex-1"
          disabled={isPending}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="min-h-11 flex-1"
          data-testid="btn-guardar-edicion-clase"
          disabled={isPending}
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

export interface DrawerCancelarClaseProps {
  clase: Clase;
  timezone: string;
  motivo: string;
  isPending: boolean;
  error: string | null;
  onMotivoChange: (motivo: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Panel lateral de cancelación de clase puntual mediante confirmación inline accesible.
 */
export function DrawerCancelarClase({
  clase,
  timezone,
  motivo,
  isPending,
  error,
  onMotivoChange,
  onConfirm,
  onClose
}: DrawerCancelarClaseProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-[#18191C] p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {clase.tipoClaseNombre ?? "Clase"} ·{" "}
          <span className="tabular-nums">
            {formatearRangoHorarioClase(clase.inicio, clase.fin, timezone)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Atletas con reserva confirmada: {clase.reservasConfirmadas ?? 0}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-motivo-cancelacion-clase">
          Motivo de cancelación
        </Label>
        <Input
          id="input-motivo-cancelacion-clase"
          data-testid="input-motivo-cancelacion-clase"
          className="min-h-11 text-base"
          value={motivo}
          onChange={(e) => onMotivoChange(e.target.value)}
          placeholder="Ej: Corte de suministro eléctrico"
          disabled={isPending}
        />
      </div>

      {error ? (
        <div
          role="alert"
          data-testid="alerta-error-clase"
          className="flex items-start gap-2 rounded-2xl border border-[#FF6D6D]/30 bg-[#FF6D6D]/10 px-4 py-3 text-sm text-[#FF6D6D]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <InlineConfirmPanel
        ariaLabel="Confirmar cancelación de clase"
        message="Al cancelar esta clase se devolverán automáticamente los créditos a los atletas con reserva confirmada."
        confirmLabel="Confirmar cancelación"
        cancelLabel="Volver"
        confirmVariant="destructive"
        confirmTestId="btn-confirmar-cancelar-clase"
        bloqueado={isPending}
        cancelRef={cancelRef}
        onConfirm={onConfirm}
        onCancel={onClose}
      />
    </div>
  );
}

/**
 * Vista operativa Dark Bento Cockpit de /clases con pestañas diarias, filtros por disciplina/coach y drawers contextuales.
 */
export function ClasesView({
  boxId,
  timezone,
  esAdmin,
  esRecep,
  esCoach,
  esAtleta = false,
  afiliacionActivaId,
  clasesIniciales,
  coaches,
  atletas,
  misReservasClaseIds = [],
  fechaDesdeInicial,
  fechaHastaInicial,
  ahoraInicialIso
}: ClasesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clases, setClases] = useState<Clase[]>(clasesIniciales);
  useEffect(() => {
    setClases(clasesIniciales);
  }, [clasesIniciales]);

  const ahora = useMemo(() => new Date(ahoraInicialIso), [ahoraInicialIso]);
  const hoyLocal = useMemo(
    () => obtenerFechaLocal(ahora, timezone),
    [ahora, timezone]
  );

  const esSoloCoach = esCoach && !esAdmin && !esRecep;
  const esStaffMostrador = esAdmin || esRecep;
  const soloAtleta = esAtleta && !esAdmin && !esRecep && !esCoach;

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyLocal);
  const [tipoClaseSeleccionado, setTipoClaseSeleccionado] =
    useState<string>("TODOS");
  const [coachSeleccionado, setCoachSeleccionado] = useState<string>("TODOS");
  const [ocultarInactivas, setOcultarInactivas] = useState<boolean>(false);

  const [exitoGlobal, setExitoGlobal] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [drawerActivo, setDrawerActivo] = useState<TipoDrawerActivo>(null);

  // Estado del Drawer de Asistencia
  const [reservasAsistencia, setReservasAsistencia] = useState<Reserva[]>([]);
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false);
  const [busquedaAsistencia, setBusquedaAsistencia] = useState("");
  const [errorAsistencia, setErrorAsistencia] = useState<string | null>(null);

  // Estado del Drawer de Mostrador
  const [atletaWalkinId, setAtletaWalkinId] = useState<string>(
    atletas[0]?.afiliacionId ?? ""
  );
  const [errorWalkin, setErrorWalkin] = useState<{
    message: string;
    errorCode?: string;
  } | null>(null);

  // Estado del Drawer de Edición
  const [coachEdicionId, setCoachEdicionId] = useState<string>("");
  const [cuposEdicion, setCuposEdicion] = useState<string>("");
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // Estado del Drawer de Cancelación
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>("");
  const [errorCancelacion, setErrorCancelacion] = useState<string | null>(null);

  const misReservasSet = useMemo(
    () => new Set(misReservasClaseIds),
    [misReservasClaseIds]
  );

  const clasesDelRol = useMemo(() => {
    if (!esSoloCoach) return clases;
    return clases.filter((c) => c.coachAfiliacionId === afiliacionActivaId);
  }, [clases, esSoloCoach, afiliacionActivaId]);

  const pestanasDias = useMemo(
    () => construirPestanasDiasClases(clasesDelRol, hoyLocal, timezone),
    [clasesDelRol, hoyLocal, timezone]
  );

  const opcionesTipos = useMemo(
    () => construirOpcionesFiltroTipos(clasesDelRol),
    [clasesDelRol]
  );

  const opcionesCoaches = useMemo(
    () => construirOpcionesFiltroCoaches(clasesDelRol),
    [clasesDelRol]
  );

  const clasesFiltradas = useMemo(
    () =>
      filtrarClases(clases, {
        fechaSeleccionada,
        tipoClaseSeleccionado,
        coachSeleccionado,
        ocultarInactivas,
        timezone,
        ahora,
        soloCoachAfiliacionId: esSoloCoach ? afiliacionActivaId : undefined
      }),
    [
      clases,
      fechaSeleccionada,
      tipoClaseSeleccionado,
      coachSeleccionado,
      ocultarInactivas,
      timezone,
      ahora,
      esSoloCoach,
      afiliacionActivaId
    ]
  );

  const resumen = useMemo(
    () => calcularResumenClases(clasesFiltradas, ahora),
    [clasesFiltradas, ahora]
  );

  const claseEnDrawer = useMemo(() => {
    if (!drawerActivo) return null;
    return clases.find((c) => c.id === drawerActivo.claseId) ?? null;
  }, [clases, drawerActivo]);

  const cerrarDrawer = () => {
    setDrawerActivo(null);
  };

  const abrirDrawerAsistencia = (clase: Clase) => {
    setErrorGlobal(null);
    setErrorAsistencia(null);
    setBusquedaAsistencia("");
    setReservasAsistencia([]);
    setCargandoAsistencia(true);
    setDrawerActivo({ tipo: "asistencia", claseId: clase.id });

    void listarReservasClaseAction(boxId, clase.id).then((res) => {
      setCargandoAsistencia(false);
      if (!res.ok || !res.data) {
        setErrorAsistencia(traducirErrorClases(res.errorCode, res.message));
        return;
      }
      setReservasAsistencia(res.data);
    });
  };

  const abrirDrawerWalkin = (clase: Clase) => {
    setErrorGlobal(null);
    setErrorWalkin(null);
    setAtletaWalkinId((prev) => prev || (atletas[0]?.afiliacionId ?? ""));
    setDrawerActivo({ tipo: "mostrador", claseId: clase.id });
  };

  const abrirDrawerEdicion = (clase: Clase) => {
    setErrorGlobal(null);
    setErrorEdicion(null);
    setCoachEdicionId(clase.coachAfiliacionId);
    setCuposEdicion(String(clase.cupos));
    setDrawerActivo({ tipo: "edicion", claseId: clase.id });
  };

  const abrirDrawerCancelacion = (clase: Clase) => {
    setErrorGlobal(null);
    setErrorCancelacion(null);
    setMotivoCancelacion("");
    setDrawerActivo({ tipo: "cancelacion", claseId: clase.id });
  };

  const handleMaterializar = () => {
    setErrorGlobal(null);
    setExitoGlobal(null);
    startTransition(async () => {
      const resultado = await procesarMaterializacionDesdeClases(
        boxId,
        materializarClasesAction
      );
      if (!resultado.ok) {
        setErrorGlobal(resultado.error);
        return;
      }
      setExitoGlobal(resultado.message);
      router.refresh();
    });
  };

  const handleGuardarEdicion = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!claseEnDrawer) return;
    setErrorEdicion(null);
    setExitoGlobal(null);

    startTransition(async () => {
      const resultado = await procesarEdicionClase(
        boxId,
        claseEnDrawer,
        {
          esAdmin,
          coachAfiliacionId: coachEdicionId,
          cuposTexto: cuposEdicion
        },
        editarClaseAction
      );
      if (!resultado.ok) {
        setErrorEdicion(resultado.error);
        return;
      }

      const nuevoCupo = Number.parseInt(cuposEdicion, 10);
      const coachEncontrado = coaches.find((c) => c.id === coachEdicionId);
      setClases((prev) =>
        prev.map((c) =>
          c.id === claseEnDrawer.id
            ? {
                ...c,
                cupos: Number.isInteger(nuevoCupo) ? nuevoCupo : c.cupos,
                coachAfiliacionId: coachEdicionId || c.coachAfiliacionId,
                coachNombre: coachEncontrado?.usuario.nombre ?? c.coachNombre
              }
            : c
        )
      );
      setDrawerActivo(null);
      setExitoGlobal(resultado.message);
      router.refresh();
    });
  };

  const handleConfirmarCancelacion = () => {
    if (!claseEnDrawer) return;
    setErrorCancelacion(null);
    setExitoGlobal(null);

    startTransition(async () => {
      const motivoLimpio = motivoCancelacion.trim();
      const resultado = await procesarCancelacionClase(
        boxId,
        claseEnDrawer.id,
        motivoLimpio,
        cancelarClaseAction
      );
      if (!resultado.ok) {
        setErrorCancelacion(resultado.error);
        return;
      }

      setClases((prev) =>
        prev.map((c) =>
          c.id === claseEnDrawer.id
            ? {
                ...c,
                canceladaEn: new Date().toISOString(),
                motivoCancelacion: motivoLimpio
              }
            : c
        )
      );
      setDrawerActivo(null);
      setExitoGlobal(resultado.message);
      router.refresh();
    });
  };

  const handleConfirmarWalkin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!claseEnDrawer) return;
    setErrorWalkin(null);
    setExitoGlobal(null);

    startTransition(async () => {
      const resultado = await procesarWalkinClase(
        boxId,
        claseEnDrawer.id,
        atletaWalkinId,
        crearReservaAction
      );
      if (!resultado.ok) {
        setErrorWalkin({
          message: resultado.error,
          errorCode: resultado.errorCode
        });
        return;
      }

      setClases((prev) =>
        prev.map((c) =>
          c.id === claseEnDrawer.id
            ? {
                ...c,
                reservasConfirmadas: (c.reservasConfirmadas ?? 0) + 1
              }
            : c
        )
      );
      setDrawerActivo(null);
      setExitoGlobal(resultado.message);
      router.refresh();
    });
  };

  const handleToggleAsistencia = (reserva: Reserva, presente: boolean) => {
    setErrorAsistencia(null);
    startTransition(async () => {
      const resultado = await procesarCambioAsistencia(
        boxId,
        reserva.id,
        presente,
        registrarAsistenciaAction
      );
      if (!resultado.ok) {
        setErrorAsistencia(resultado.error);
        return;
      }
      setReservasAsistencia((prev) =>
        prev.map((r) =>
          r.id === reserva.id
            ? {
                ...r,
                asistenciaMarcadaEn: presente
                  ? new Date().toISOString()
                  : null
              }
            : r
        )
      );
      router.refresh();
    });
  };

  const limpiarFiltros = () => {
    setFechaSeleccionada(hoyLocal);
    setTipoClaseSeleccionado("TODOS");
    setCoachSeleccionado("TODOS");
    setOcultarInactivas(false);
  };

  const hayFiltrosActivos =
    tipoClaseSeleccionado !== "TODOS" ||
    coachSeleccionado !== "TODOS" ||
    ocultarInactivas ||
    fechaSeleccionada !== hoyLocal;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.02em] text-muted-foreground">
              Agenda operativa
            </p>
            <div className="space-y-1">
              <h1 className={BENTO_TITLE_CLASSES}>Calendario de clases</h1>
              <p className="text-sm text-muted-foreground tabular-nums">
                Ventana activa del {fechaDesdeInicial} al {fechaHastaInicial}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.06] bg-[#18191C] px-4 py-2.5 text-sm tabular-nums">
              <span className="font-semibold text-foreground">
                {resumen.totalClases}{" "}
                {resumen.totalClases === 1 ? "clase" : "clases"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Cupos{" "}
                <strong className="text-foreground">
                  {resumen.cuposOcupados} / {resumen.cuposTotales}
                </strong>
              </span>
              {resumen.clasesEnCurso > 0 ? (
                <>
                  <span className="text-muted-foreground">·</span>
                  <Badge variant="mint">
                    {resumen.clasesEnCurso} en curso
                  </Badge>
                </>
              ) : null}
            </div>

            {esAdmin ? (
              <Button
                type="button"
                variant="primary"
                className="min-h-11 w-full sm:w-auto"
                data-testid="btn-materializar-clases"
                disabled={isPending}
                onClick={handleMaterializar}
              >
                <RefreshCw
                  className={cn("size-4", isPending && "animate-spin")}
                  aria-hidden="true"
                />
                Generar próximas clases
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {exitoGlobal ? (
        <div
          role="status"
          data-testid="alerta-exito-clase"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#18FFC8]/30 bg-[#18FFC8]/10 px-4 py-3 text-sm text-[#18FFC8]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            {exitoGlobal}
          </span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setExitoGlobal(null)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#18FFC8] hover:bg-[#18FFC8]/15"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {errorGlobal && !drawerActivo ? (
        <div
          role="alert"
          data-testid="alerta-error-clase"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#FF6D6D]/30 bg-[#FF6D6D]/10 px-4 py-3 text-sm text-[#FF6D6D]"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {errorGlobal}
          </span>
          <button
            type="button"
            aria-label="Cerrar error"
            onClick={() => setErrorGlobal(null)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#FF6D6D] hover:bg-[#FF6D6D]/15"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <Card className="space-y-4 p-4 sm:p-5">
        <div
          role="group"
          aria-label="Días de la agenda"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          {pestanasDias.map((pestana) => {
            const activo = fechaSeleccionada === pestana.value;
            return (
              <button
                key={pestana.value}
                type="button"
                aria-pressed={activo}
                data-testid={`tab-dia-${pestana.value}`}
                onClick={() => setFechaSeleccionada(pestana.value)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm leading-none transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activo
                    ? "border-transparent bg-primary text-primary-foreground font-semibold"
                    : "border-border bg-secondary text-muted-foreground font-medium hover:border-[#3A3C42] hover:text-foreground"
                )}
              >
                <span>{pestana.label}</span>
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs",
                    activo
                      ? "bg-black/15 text-black"
                      : "bg-white/[0.06] text-muted-foreground"
                  )}
                >
                  {pestana.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {opcionesTipos.length > 2 ? (
              <FilterChips
                ariaLabel="Filtrar por disciplina"
                options={opcionesTipos}
                value={tipoClaseSeleccionado}
                onChange={setTipoClaseSeleccionado}
              />
            ) : null}

            {!esSoloCoach && opcionesCoaches.length > 2 ? (
              <div className="min-w-[190px]">
                <Select
                  aria-label="Filtrar por coach"
                  className="min-h-11 text-base"
                  value={coachSeleccionado}
                  onChange={(e) => setCoachSeleccionado(e.target.value)}
                >
                  {opcionesCoaches.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Coach: {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-pressed={ocultarInactivas}
            data-testid="toggle-ocultar-inactivas"
            onClick={() => setOcultarInactivas((prev) => !prev)}
            className={cn(
              "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ocultarInactivas
                ? "border-primary/40 bg-primary/15 text-[#C1F429]"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Ocultar finalizadas y canceladas
          </button>
        </div>
      </Card>

      {clasesFiltradas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#18191C] text-muted-foreground">
            <Calendar className="size-6" aria-hidden="true" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">
              No hay clases para mostrar en este filtro
            </h2>
            <p className="text-sm text-muted-foreground">
              {soloAtleta
                ? "Podés consultar toda la disponibilidad semanal o gestionar tus lugares desde Mis Reservas."
                : "Cambiá de día, limpiá los filtros activos o generá las próximas clases del horario."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hayFiltrosActivos ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={limpiarFiltros}
              >
                Restablecer filtros
              </Button>
            ) : null}
            {esAdmin ? (
              <Button
                type="button"
                variant="primary"
                className="min-h-11"
                disabled={isPending}
                onClick={handleMaterializar}
              >
                Generar próximas clases
              </Button>
            ) : null}
            {soloAtleta ? (
              <Link
                href="/reservas"
                className={buttonClassName("primary", "min-h-11")}
              >
                Ir a Mis Reservas
              </Link>
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
          {clasesFiltradas.map((clase) => (
            <ClaseCard
              key={clase.id}
              clase={clase}
              timezone={timezone}
              ahora={ahora}
              esAdmin={esAdmin}
              esRecep={esRecep}
              esCoach={esCoach}
              esAtleta={esAtleta}
              reservadaPorMi={misReservasSet.has(clase.id)}
              onAbrirAsistencia={abrirDrawerAsistencia}
              onAbrirWalkin={abrirDrawerWalkin}
              onAbrirEdicion={abrirDrawerEdicion}
              onAbrirCancelacion={abrirDrawerCancelacion}
            />
          ))}
        </div>
      )}

      <SideDrawer
        open={Boolean(drawerActivo && claseEnDrawer)}
        onClose={cerrarDrawer}
        title={
          drawerActivo?.tipo === "asistencia"
            ? "Asistencia y nómina"
            : drawerActivo?.tipo === "mostrador"
              ? "Inscribir en mostrador"
              : drawerActivo?.tipo === "edicion"
                ? "Editar clase puntual"
                : "Cancelar clase puntual"
        }
        description={
          claseEnDrawer
            ? `${claseEnDrawer.tipoClaseNombre ?? "Clase"} · ${formatearFechaClaseLegible(claseEnDrawer.inicio, timezone)}`
            : undefined
        }
      >
        {drawerActivo?.tipo === "asistencia" && claseEnDrawer ? (
          <DrawerAsistencia
            clase={claseEnDrawer}
            timezone={timezone}
            ahora={ahora}
            esAdmin={esAdmin}
            esRecep={esRecep}
            afiliacionActivaId={afiliacionActivaId}
            reservas={reservasAsistencia}
            cargando={cargandoAsistencia}
            isPending={isPending}
            busqueda={busquedaAsistencia}
            error={errorAsistencia}
            onBusquedaChange={setBusquedaAsistencia}
            onToggleAsistencia={handleToggleAsistencia}
            onClose={cerrarDrawer}
          />
        ) : null}

        {drawerActivo?.tipo === "mostrador" && claseEnDrawer ? (
          <DrawerMostrador
            clase={claseEnDrawer}
            timezone={timezone}
            atletas={atletas}
            atletaId={atletaWalkinId}
            isPending={isPending}
            errorWalkin={errorWalkin}
            onAtletaChange={setAtletaWalkinId}
            onSubmit={handleConfirmarWalkin}
            onIrAEditarCupo={
              esStaffMostrador
                ? () => abrirDrawerEdicion(claseEnDrawer)
                : undefined
            }
            onClose={cerrarDrawer}
          />
        ) : null}

        {drawerActivo?.tipo === "edicion" && claseEnDrawer ? (
          <DrawerEditarClase
            clase={claseEnDrawer}
            timezone={timezone}
            esAdmin={esAdmin}
            coaches={coaches}
            coachSeleccionado={coachEdicionId}
            cuposEdicion={cuposEdicion}
            isPending={isPending}
            error={errorEdicion}
            onCoachChange={setCoachEdicionId}
            onCuposChange={setCuposEdicion}
            onSubmit={handleGuardarEdicion}
            onClose={cerrarDrawer}
          />
        ) : null}

        {drawerActivo?.tipo === "cancelacion" && claseEnDrawer ? (
          <DrawerCancelarClase
            clase={claseEnDrawer}
            timezone={timezone}
            motivo={motivoCancelacion}
            isPending={isPending}
            error={errorCancelacion}
            onMotivoChange={setMotivoCancelacion}
            onConfirm={handleConfirmarCancelacion}
            onClose={cerrarDrawer}
          />
        ) : null}
      </SideDrawer>
    </div>
  );
}
