"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle
} from "lucide-react";
import type { Atleta, Clase, Membresia, Reserva } from "@centris/shared";
import { obtenerFechaLocal } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { SideDrawer } from "@/components/ui/side-drawer";
import { cancelarReservaAction, crearReservaAction } from "@/lib/actions";
import { cn, formatearMoneda } from "@/lib/utils";
import {
  clasificarReservasAtleta,
  construirOpcionesTipoReservas,
  construirPestanasDiasReservas,
  evaluarEstadoTarjetaClase,
  evaluarResumenMembresiaAtleta,
  filtrarAtletasMostrador,
  filtrarClasesReservas,
  formatearFechaRangoEsAr,
  procesarCancelacionAtleta,
  procesarReservaAtleta,
  procesarWalkinMostrador,
  type EstadoTarjetaClaseUI,
  type ItemHistorialReservaUI,
  type ProximaReservaUI
} from "./reservas-estado";

const TRACK_RAYADO_STYLE =
  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 4px, rgba(24,25,28,0.92) 4px, rgba(24,25,28,0.92) 8px)";

function formatearHoraClase(valor: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(valor instanceof Date ? valor : new Date(valor));
}

function formatearDiaBadge(valor: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "short"
  })
    .format(valor instanceof Date ? valor : new Date(valor))
    .replaceAll(".", "");
}

function iconoParaBadge(variant: "mint" | "amber" | "coral" | "zinc") {
  if (variant === "mint") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  if (variant === "amber") {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  if (variant === "coral") {
    return <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

export interface TarjetaProximaReservaProps {
  item: ProximaReservaUI;
  timezone: string;
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
  const { reserva, enVentanaTardia, horaLimiteSinCargo, diaLabel, rangoHorario } =
    item;

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

          <Badge variant={enVentanaTardia ? "amber" : "mint"}>
            {iconoParaBadge(enVentanaTardia ? "amber" : "mint")}
            <span>
              {enVentanaTardia ? "Ventana tardía" : "Confirmada"}
            </span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
          <Clock
            className={cn(
              "h-4 w-4 shrink-0",
              enVentanaTardia ? "text-[#FBBF24]" : "text-[#18FFC8]"
            )}
            aria-hidden="true"
          />
          {enVentanaTardia ? (
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

        {mostrandoAdvertenciaTardia ? (
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
  estado: EstadoTarjetaClaseUI;
  esAtleta: boolean;
  esStaffMostrador: boolean;
  reservando: boolean;
  onReservar: (claseId: string) => void;
  onAbrirMostrador: (clase: Clase) => void;
}

/**
 * Tarjeta Bento de clase disponible con barra de ocupación con track rayado diagonal,
 * métricas tabulares y botón de acción para Atleta y/o Mostrador.
 */
export function TarjetaClaseDisponible({
  clase,
  timezone,
  estado,
  esAtleta,
  esStaffMostrador,
  reservando,
  onReservar,
  onAbrirMostrador
}: TarjetaClaseDisponibleProps) {
  const horaInicio = formatearHoraClase(clase.inicio, timezone);
  const horaFin = formatearHoraClase(clase.fin, timezone);
  const diaCorto = formatearDiaBadge(clase.inicio, timezone);

  const colorFill =
    estado.pasada || estado.llena
      ? "bg-[#71717A]"
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
                <span className="capitalize">{diaCorto}</span>
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

function FilaHistorialReserva({ item }: { item: ItemHistorialReservaUI }) {
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
          <Badge
            variant="mint"
            data-testid={`badge-asistencia-${reserva.id}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Presente</span>
          </Badge>
        ) : item.esAusencia ? (
          <Badge
            variant="coral"
            data-testid={`badge-ausencia-${reserva.id}`}
          >
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

export interface ReservasAtletaViewProps {
  boxId: string;
  timezone: string;
  moneda: string;
  anticipacionReservaDias: number;
  ventanaCancelacionMinutos?: number;
  esAtleta: boolean;
  esStaffMostrador: boolean;
  clasesDisponibles: Clase[];
  misReservas: Reserva[];
  membresias?: Membresia[];
  membresiaVigente: Membresia | null;
  atletas?: Atleta[];
  errorCarga?: string | null;
  ahoraInicialIso?: string;
  diaInicialSeleccionado?: string;
}

type ToastState =
  | { tipo: "exito"; mensaje: string }
  | { tipo: "error"; mensaje: string; errorCode?: string }
  | null;

/**
 * Cockpit de reservas Dark Bento para atletas (agenda, créditos, ADR 0006,
 * cancelaciones inline, historial colapsado) y mostrador de recepción/administración.
 */
export function ReservasAtletaView({
  boxId,
  timezone,
  moneda,
  anticipacionReservaDias,
  ventanaCancelacionMinutos = 120,
  esAtleta,
  esStaffMostrador,
  clasesDisponibles,
  misReservas,
  membresias,
  membresiaVigente,
  atletas = [],
  errorCarga = null,
  ahoraInicialIso,
  diaInicialSeleccionado
}: ReservasAtletaViewProps) {
  const router = useRouter();
  const ahoraRef = useMemo(
    () => (ahoraInicialIso ? new Date(ahoraInicialIso) : new Date()),
    [ahoraInicialIso]
  );
  const hoyLocal = useMemo(
    () => obtenerFechaLocal(ahoraRef, timezone),
    [ahoraRef, timezone]
  );

  const membresiasEvaluadas = useMemo(() => {
    if (membresias && membresias.length > 0) {
      return membresias;
    }
    return membresiaVigente ? [membresiaVigente] : [];
  }, [membresias, membresiaVigente]);

  const pestanasDias = useMemo(
    () =>
      construirPestanasDiasReservas(
        clasesDisponibles,
        hoyLocal,
        anticipacionReservaDias,
        timezone
      ),
    [clasesDisponibles, hoyLocal, anticipacionReservaDias, timezone]
  );

  const hoyValue = pestanasDias[0]?.value ?? "TODOS";
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(
    diaInicialSeleccionado ?? hoyValue
  );
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("TODAS");
  const [historialAbierto, setHistorialAbierto] = useState<boolean>(false);
  const [advertenciaTardiaClaseId, setAdvertenciaTardiaClaseId] = useState<
    string | null
  >(null);

  const [pendingClaseId, setPendingClaseId] = useState<string | null>(null);
  const [cancelandoReservaId, setCancelandoReservaId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<ToastState>(null);

  // Estado del SideDrawer de Mostrador
  const [claseMostrador, setClaseMostrador] = useState<Clase | null>(null);
  const [busquedaAtleta, setBusquedaAtleta] = useState<string>("");
  const [atletaSeleccionadoId, setAtletaSeleccionadoId] = useState<string>("");
  const [enviandoMostrador, setEnviandoMostrador] = useState<boolean>(false);

  const timerToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    if (timerToastRef.current) {
      clearTimeout(timerToastRef.current);
    }
    timerToastRef.current = setTimeout(() => {
      setFeedback(null);
    }, 6000);

    return () => {
      if (timerToastRef.current) {
        clearTimeout(timerToastRef.current);
      }
    };
  }, [feedback]);

  const resumenMembresia = useMemo(
    () =>
      evaluarResumenMembresiaAtleta({
        membresias: membresiasEvaluadas,
        misReservas,
        hoyLocal,
        timezone
      }),
    [membresiasEvaluadas, misReservas, hoyLocal, timezone]
  );

  const { proximas, historial } = useMemo(
    () =>
      clasificarReservasAtleta(
        misReservas,
        timezone,
        ahoraRef,
        ventanaCancelacionMinutos
      ),
    [misReservas, timezone, ahoraRef, ventanaCancelacionMinutos]
  );

  const reservasActivas = useMemo(
    () => proximas.map((item) => item.reserva),
    [proximas]
  );

  const claseIdsReservadas = useMemo(
    () => new Set(reservasActivas.map((r) => r.claseId)),
    [reservasActivas]
  );

  const clasesDelDia = useMemo(
    () =>
      filtrarClasesReservas(clasesDisponibles, {
        diaSeleccionado,
        tipoSeleccionado: "TODAS",
        timezone
      }),
    [clasesDisponibles, diaSeleccionado, timezone]
  );

  const opcionesTipo = useMemo(
    () => construirOpcionesTipoReservas(clasesDelDia),
    [clasesDelDia]
  );

  const clasesFiltradas = useMemo(
    () =>
      filtrarClasesReservas(clasesDisponibles, {
        diaSeleccionado,
        tipoSeleccionado,
        timezone
      }),
    [clasesDisponibles, diaSeleccionado, tipoSeleccionado, timezone]
  );

  const atletasFiltrados = useMemo(
    () => filtrarAtletasMostrador(atletas, busquedaAtleta),
    [atletas, busquedaAtleta]
  );

  async function manejarReservar(claseId: string) {
    setFeedback(null);
    setPendingClaseId(claseId);

    const resultado = await procesarReservaAtleta(
      boxId,
      claseId,
      crearReservaAction
    );

    setPendingClaseId(null);

    if (resultado.ok) {
      setFeedback({ tipo: "exito", mensaje: resultado.message });
      router.refresh();
      return;
    }

    setFeedback({
      tipo: "error",
      mensaje: resultado.error,
      errorCode: resultado.errorCode
    });
  }

  async function ejecutarCancelacion(item: ProximaReservaUI) {
    setFeedback(null);
    setCancelandoReservaId(item.reserva.id);

    const resultado = await procesarCancelacionAtleta(
      boxId,
      item.reserva.id,
      item.enVentanaTardia,
      cancelarReservaAction
    );

    setCancelandoReservaId(null);
    setAdvertenciaTardiaClaseId(null);

    if (resultado.ok) {
      setFeedback({ tipo: "exito", mensaje: resultado.message });
      router.refresh();
      return;
    }

    setFeedback({
      tipo: "error",
      mensaje: resultado.error,
      errorCode: resultado.errorCode
    });
  }

  function manejarSolicitarCancelacion(item: ProximaReservaUI) {
    if (item.enVentanaTardia) {
      setAdvertenciaTardiaClaseId(item.reserva.claseId);
      return;
    }
    void ejecutarCancelacion(item);
  }

  function abrirDrawerMostrador(clase: Clase) {
    setClaseMostrador(clase);
    setBusquedaAtleta("");
    setAtletaSeleccionadoId(atletas[0]?.id ?? "");
  }

  function cerrarDrawerMostrador() {
    setClaseMostrador(null);
    setBusquedaAtleta("");
    setAtletaSeleccionadoId("");
  }

  async function manejarConfirmarMostrador(e: React.FormEvent) {
    e.preventDefault();
    if (!claseMostrador) {
      return;
    }
    setFeedback(null);
    setEnviandoMostrador(true);

    const resultado = await procesarWalkinMostrador(
      boxId,
      claseMostrador.id,
      atletaSeleccionadoId,
      crearReservaAction
    );

    setEnviandoMostrador(false);

    if (resultado.ok) {
      cerrarDrawerMostrador();
      setFeedback({ tipo: "exito", mensaje: resultado.message });
      router.refresh();
      return;
    }

    setFeedback({
      tipo: "error",
      mensaje: resultado.error,
      errorCode: resultado.errorCode
    });
  }

  const ocupacionMostrador = claseMostrador
    ? claseMostrador.reservasConfirmadas ?? 0
    : 0;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
            Mis reservas
          </h1>
          <p className="text-sm text-muted-foreground">
            {esAtleta
              ? "Consultá tus créditos disponibles, gestioná tus reservas próximas y elegí tu clase."
              : "Modo mostrador: gestioná reservas presenciales de atletas en la grilla del Box."}
          </p>
        </div>

        {esStaffMostrador && (
          <Badge variant="mint" className="self-start sm:self-auto">
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Modo mostrador activo</span>
          </Badge>
        )}
      </header>

      {errorCarga && (
        <Card
          data-testid="error-carga-reservas"
          className="border-[#FF6D6D]/35 bg-[#FF6D6D]/8"
        >
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6D6D]"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No pudimos cargar las reservas en este momento
                </p>
                <p className="text-sm text-muted-foreground">{errorCarga}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => router.refresh()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Reintentar</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {!errorCarga && esAtleta && (
        <section
          aria-label="Resumen de créditos y vigencia"
          className="sticky top-2 z-20 rounded-3xl border border-border bg-[#111214]/95 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-center">
            <div className="flex items-center justify-between gap-3 sm:block sm:space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
                <span>Créditos disponibles</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="creditos-periodo-restantes"
                  className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl"
                >
                  {!resumenMembresia.membresiaVigente
                    ? "—"
                    : resumenMembresia.membresiaVigente.modalidadCreditos ===
                        "ILIMITADO"
                      ? "Ilimitados"
                      : `${resumenMembresia.disponibilidadActual?.creditosRestantesPeriodo ?? 0} / ${resumenMembresia.membresiaVigente.creditosPorPeriodo ?? 0}`}
                </span>
                {resumenMembresia.membresiaVigente && (
                  <span className="text-xs text-muted-foreground">
                    {resumenMembresia.etiquetaModalidad}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 sm:block sm:space-y-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <span className="text-xs text-muted-foreground">
                Créditos extra
              </span>
              <p
                data-testid="creditos-extra-restantes"
                className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl"
              >
                {resumenMembresia.membresiaVigente
                  ? resumenMembresia.disponibilidadActual
                      ?.creditosExtraRestantes ?? 0
                  : "0"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 sm:block sm:space-y-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <span className="text-xs text-muted-foreground">
                Vigencia del plan
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
                <span
                  data-testid="vigencia-membresia-atleta"
                  className="text-sm font-medium tabular-nums text-foreground"
                >
                  {resumenMembresia.membresiaVigente
                    ? formatearFechaRangoEsAr(
                        resumenMembresia.membresiaVigente.fechaInicio,
                        resumenMembresia.membresiaVigente.fechaFin
                      )
                    : "Sin plan vigente"}
                </span>
                {resumenMembresia.membresiaVigente ? (
                  resumenMembresia.esFutura ? (
                    <Badge variant="amber">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <span>Inicia luego</span>
                    </Badge>
                  ) : (
                    <Badge variant="mint">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      <span>Activo</span>
                    </Badge>
                  )
                ) : (
                  <Badge variant="coral">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    <span>Sin plan</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!resumenMembresia.membresiaVigente && !esStaffMostrador && (
            <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              No tenés una membresía vigente asignada. Consultá en recepción para
              activar un plan y empezar a reservar.
            </p>
          )}
        </section>
      )}

      {!errorCarga && esAtleta && resumenMembresia.esMoroso && (
        <div
          data-testid="banner-saldo-pendiente"
          role="status"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-[#FBBF24]/35 bg-[#FBBF24]/10 px-4 py-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#FBBF24]"
              aria-hidden="true"
            />
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold text-foreground">
                Tenés un saldo pendiente de{" "}
                <span className="tabular-nums text-[#FBBF24]">
                  {formatearMoneda(
                    resumenMembresia.saldoPendienteTotal,
                    moneda
                  )}
                </span>
              </p>
              <p className="text-xs leading-relaxed text-[#FDE68A]">
                Tu acceso a clases sigue habilitado mientras tengas plan y
                créditos disponibles. Podés regularizar el pago en recepción.
              </p>
            </div>
          </div>
          <Badge variant="amber" className="self-start shrink-0 sm:self-center">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Saldo pendiente</span>
          </Badge>
        </div>
      )}

      {!errorCarga && !esAtleta && esStaffMostrador && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-border bg-[#18191C] px-4 py-3.5 text-sm text-muted-foreground"
        >
          <Users
            className="mt-0.5 h-5 w-5 shrink-0 text-[#18FFC8]"
            aria-hidden="true"
          />
          <p>
            Modo mostrador: seleccioná cualquier clase con cupo disponible para
            anotar a un atleta del Box.
          </p>
        </div>
      )}

      {!errorCarga && esAtleta && (
        <section
          aria-labelledby="titulo-proximas-reservas"
          data-testid="seccion-mis-reservas"
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2
                id="titulo-proximas-reservas"
                className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground"
              >
                Próximas reservas
              </h2>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {proximas.length}
              </span>
            </div>
          </div>

          {proximas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-2 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>
                    Todavía no tenés reservas próximas confirmadas.
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Elegí un horario disponible más abajo para anotarte.
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {proximas.map((item) => (
                <TarjetaProximaReserva
                  key={item.reserva.id}
                  item={item}
                  timezone={timezone}
                  ventanaCancelacionMinutos={ventanaCancelacionMinutos}
                  mostrandoAdvertenciaTardia={
                    advertenciaTardiaClaseId === item.reserva.claseId
                  }
                  cancelando={cancelandoReservaId === item.reserva.id}
                  deshabilitado={cancelandoReservaId !== null}
                  onSolicitarCancelacion={manejarSolicitarCancelacion}
                  onConfirmarTardia={(target) => void ejecutarCancelacion(target)}
                  onCancelarAdvertencia={() => setAdvertenciaTardiaClaseId(null)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!errorCarga && (
        <section
          aria-labelledby="titulo-clases-disponibles"
          data-testid="grilla-clases-disponibles"
          className="space-y-4"
        >
          <div className="space-y-1">
            <h2
              id="titulo-clases-disponibles"
              className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground"
            >
              Clases disponibles
            </h2>
            <p className="text-sm text-muted-foreground">
              Horarios habilitados del Box según tu ventana de anticipación.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar clases por día"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            {pestanasDias.map((tab) => {
              const activo = diaSeleccionado === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  data-testid={`tab-dia-${tab.value}`}
                  onClick={() => {
                    setDiaSeleccionado(tab.value);
                    setTipoSeleccionado("TODAS");
                  }}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activo
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "border border-border bg-secondary font-medium text-muted-foreground hover:border-[#3A3C42] hover:text-foreground"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs tabular-nums",
                      activo
                        ? "bg-black/15 text-primary-foreground"
                        : "bg-background/60 text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {opcionesTipo.length > 0 && (
            <FilterChips
              ariaLabel="Filtrar por tipo de clase"
              value={tipoSeleccionado}
              onChange={setTipoSeleccionado}
              options={opcionesTipo}
            />
          )}

          {clasesFiltradas.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay clases para este filtro</CardTitle>
                <CardDescription>
                  Probá seleccionando otro día o la pestaña{" "}
                  <strong className="font-medium text-foreground">Todas</strong>{" "}
                  para ver el calendario completo del Box.
                </CardDescription>
              </CardHeader>
              {diaSeleccionado !== "TODOS" && (
                <CardContent>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDiaSeleccionado("TODOS");
                      setTipoSeleccionado("TODAS");
                    }}
                  >
                    Ver todas las clases
                  </Button>
                </CardContent>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clasesFiltradas.map((clase) => {
                const estado = evaluarEstadoTarjetaClase(clase, {
                  ahora: ahoraRef,
                  claseIdsReservadas,
                  reservasActivas,
                  disponibilidad: resumenMembresia.disponibilidadActual,
                  tieneMembresiaVigente: Boolean(
                    resumenMembresia.membresiaVigente
                  )
                });

                return (
                  <TarjetaClaseDisponible
                    key={clase.id}
                    clase={clase}
                    timezone={timezone}
                    estado={estado}
                    esAtleta={esAtleta}
                    esStaffMostrador={esStaffMostrador}
                    reservando={pendingClaseId === clase.id}
                    onReservar={(id) => void manejarReservar(id)}
                    onAbrirMostrador={abrirDrawerMostrador}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {!errorCarga && esAtleta && (
        <section
          aria-labelledby="titulo-historial-reservas"
          data-testid="seccion-historial-cancelaciones"
          className="space-y-3"
        >
          <button
            type="button"
            id="titulo-historial-reservas"
            data-testid="btn-historial-reservas"
            aria-expanded={historialAbierto}
            onClick={() => setHistorialAbierto((prev) => !prev)}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-left transition-colors hover:border-[#3A3C42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
                Historial de clases y cancelaciones
              </span>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {historial.length}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                historialAbierto && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>

          {historialAbierto && (
            <div className="space-y-2.5 rounded-3xl border border-border bg-card p-4 sm:p-5">
              {historial.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no registrás asistencias, ausencias ni cancelaciones.
                </p>
              ) : (
                historial.map((item) => (
                  <FilaHistorialReserva key={item.reserva.id} item={item} />
                ))
              )}
            </div>
          )}
        </section>
      )}

      {esStaffMostrador && (
        <SideDrawer
          open={claseMostrador !== null}
          onClose={cerrarDrawerMostrador}
          testId="drawer-reserva-mostrador"
          title="Reservar para atleta en mostrador"
          description={
            claseMostrador
              ? `${claseMostrador.tipoClaseNombre ?? "Clase"} · ${formatearDiaBadge(claseMostrador.inicio, timezone)} ${formatearHoraClase(claseMostrador.inicio, timezone)}–${formatearHoraClase(claseMostrador.fin, timezone)}`
              : undefined
          }
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={cerrarDrawerMostrador}
                disabled={enviandoMostrador}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-reserva-mostrador"
                variant="primary"
                className="w-full sm:w-auto"
                disabled={enviandoMostrador || !atletaSeleccionadoId}
              >
                {enviandoMostrador ? "Reservando..." : "Confirmar reserva"}
              </Button>
            </div>
          }
        >
          <form
            id="form-reserva-mostrador"
            onSubmit={(e) => void manejarConfirmarMostrador(e)}
            className="space-y-4"
          >
            {claseMostrador && (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3 text-sm">
                <span className="text-muted-foreground">Cupos actuales</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {ocupacionMostrador} / {claseMostrador.cupos}
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
                  onChange={(e) => setBusquedaAtleta(e.target.value)}
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
                        onClick={() => setAtletaSeleccionadoId(atleta.id)}
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
      )}

      {feedback && (
        <div
          role={feedback.tipo === "error" ? "alert" : "status"}
          aria-live="polite"
          data-testid={
            feedback.tipo === "error"
              ? "alerta-error-reserva"
              : "alerta-exito-reserva"
          }
          data-error-code={
            feedback.tipo === "error" ? feedback.errorCode ?? "" : undefined
          }
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 flex items-start justify-between gap-3 rounded-2xl border bg-[#111214]/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-md sm:left-auto sm:w-full sm:max-w-md",
            feedback.tipo === "error"
              ? "border-[#FF6D6D]/45 text-foreground"
              : "border-[#18FFC8]/45 text-foreground"
          )}
        >
          <div className="flex items-start gap-3">
            {feedback.tipo === "error" ? (
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6D6D]"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[#18FFC8]"
                aria-hidden="true"
              />
            )}
            <p className="text-sm leading-snug text-foreground">
              {feedback.mensaje}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setFeedback(null)}
            className="inline-flex h-11 w-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
