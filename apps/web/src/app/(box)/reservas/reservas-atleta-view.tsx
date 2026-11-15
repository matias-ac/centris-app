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
  Sparkles,
  UserCheck,
  Users,
  X
} from "lucide-react";
import {
  obtenerFechaLocal,
  type Atleta,
  type Clase,
  type Membresia,
  type Reserva
} from "@centris/shared";
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
import { cancelarReservaAction, crearReservaAction } from "@/lib/actions";
import { cn, formatearMoneda } from "@/lib/utils";
import { DrawerReservaMostrador } from "./drawer-reserva-mostrador";
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
  procesarReservaMostrador,
  type ProximaReservaUI
} from "./reservas-estado";
import {
  FilaHistorialReserva,
  TarjetaClaseDisponible,
  TarjetaProximaReserva
} from "./tarjetas-reservas";

export {
  TarjetaClaseDisponible,
  TarjetaProximaReserva,
  type TarjetaClaseDisponibleProps,
  type TarjetaProximaReservaProps
} from "./tarjetas-reservas";

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
  membresiaVigente?: Membresia | null;
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
  membresiaVigente = null,
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
  const [errorDrawer, setErrorDrawer] = useState<{
    mensaje: string;
    errorCode?: string;
  } | null>(null);

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
    if (item.enCurso) {
      return;
    }
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
    setErrorDrawer(null);
  }

  function cerrarDrawerMostrador() {
    setClaseMostrador(null);
    setBusquedaAtleta("");
    setAtletaSeleccionadoId("");
    setErrorDrawer(null);
  }

  async function manejarConfirmarMostrador(e: React.FormEvent) {
    e.preventDefault();
    if (!claseMostrador) {
      return;
    }
    setErrorDrawer(null);
    setEnviandoMostrador(true);

    const resultado = await procesarReservaMostrador(
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

    setErrorDrawer({
      mensaje: resultado.error,
      errorCode: resultado.errorCode
    });
  }

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
          className="sticky top-2 z-20 rounded-3xl border border-border bg-[#111214]/95 p-4 backdrop-blur-md sm:p-5"
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
                Vigencia de la membresía
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
                    : "Sin membresía vigente"}
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
                      <span>Activa</span>
                    </Badge>
                  )
                ) : (
                  <Badge variant="coral">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    <span>Sin membresía</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!resumenMembresia.membresiaVigente && !esStaffMostrador && (
            <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              No tenés una membresía vigente asignada. Consultá en recepción para
              activar una membresía y empezar a reservar.
            </p>
          )}
        </section>
      )}

      {!errorCarga && esAtleta && resumenMembresia.esMoroso && (
        <div
          data-testid="banner-saldo-pendiente"
          role="status"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-[#FF6D6D]/35 bg-[#FF6D6D]/10 px-4 py-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6D6D]"
              aria-hidden="true"
            />
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold text-foreground">
                Tenés un saldo pendiente de{" "}
                <span className="tabular-nums text-[#FF6D6D]">
                  {formatearMoneda(
                    resumenMembresia.saldoPendienteTotal,
                    moneda
                  )}
                </span>
              </p>
              <p className="text-xs leading-relaxed text-[#FCA5A5]">
                Tu acceso a clases sigue habilitado mientras tengas membresía y
                créditos disponibles. Podés regularizar el pago en recepción.
              </p>
            </div>
          </div>
          <Badge variant="coral" className="self-start shrink-0 sm:self-center">
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
                  ventanaCancelacionMinutos={ventanaCancelacionMinutos}
                  mostrandoAdvertenciaTardia={
                    advertenciaTardiaClaseId === item.reserva.claseId
                  }
                  cancelando={cancelandoReservaId === item.reserva.id}
                  deshabilitado={cancelandoReservaId !== null}
                  onSolicitarCancelacion={manejarSolicitarCancelacion}
                  onConfirmarTardia={(target) =>
                    void ejecutarCancelacion(target)
                  }
                  onCancelarAdvertencia={() =>
                    setAdvertenciaTardiaClaseId(null)
                  }
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
                    hoyLocal={hoyLocal}
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
        <DrawerReservaMostrador
          clase={claseMostrador}
          timezone={timezone}
          hoyLocal={hoyLocal}
          busquedaAtleta={busquedaAtleta}
          onBusquedaChange={setBusquedaAtleta}
          atletasFiltrados={atletasFiltrados}
          atletaSeleccionadoId={atletaSeleccionadoId}
          onSeleccionarAtleta={setAtletaSeleccionadoId}
          enviando={enviandoMostrador}
          errorInline={errorDrawer}
          onClose={cerrarDrawerMostrador}
          onSubmit={(e) => void manejarConfirmarMostrador(e)}
        />
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
            "fixed bottom-4 left-4 right-4 z-[60] flex items-start justify-between gap-3 rounded-2xl border bg-[#111214]/95 p-4 backdrop-blur-md sm:left-auto sm:w-full sm:max-w-md",
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
