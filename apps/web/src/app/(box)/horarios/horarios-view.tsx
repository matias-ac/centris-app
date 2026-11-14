"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Edit3,
  Info,
  Plus,
  RefreshCw,
  Trash2,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DIAS_SEMANA,
  NOMBRES_DIAS_SEMANA,
  type AfiliacionConUsuario,
  type Horario,
  type TipoClase
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FilterChips,
  type FilterChipOption
} from "@/components/ui/filter-chips";
import {
  InlineConfirmPanel,
  useInlineConfirm
} from "@/components/ui/inline-confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SideDrawer } from "@/components/ui/side-drawer";
import {
  actualizarHorarioAction,
  actualizarTipoClaseAction,
  crearHorarioAction,
  crearTipoClaseAction,
  eliminarHorarioAction,
  eliminarTipoClaseAction,
  materializarClasesAction
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  agruparHorariosPorDia,
  calcularResumenHorarios,
  construirVistaPreviaHorario,
  contarHorariosPorTipoClase,
  crearBorradorHorario,
  crearBorradorTipoClase,
  filtrarDiasVisibles,
  formatearCuposHorario,
  formatearFranjaHoraria,
  normalizarHoraCorta,
  obtenerTiposClaseActivos,
  procesarBajaHorario,
  procesarBajaTipoClase,
  procesarGuardadoHorario,
  procesarGuardadoTipoClase,
  procesarMaterializacionClases,
  type BorradorHorario,
  type BorradorTipoClase,
  type ErroresHorarioFormulario,
  type ErroresTipoClaseFormulario,
  type FiltroDiaSemana
} from "./horarios-estado";

export interface HorariosViewProps {
  boxId: string;
  esAdmin: boolean;
  tiposClaseIniciales: TipoClase[];
  horariosIniciales: Horario[];
  coaches: AfiliacionConUsuario[];
  drawerInicial?: "tipo" | "horario" | null;
  confirmandoTipoInicialId?: string | null;
  confirmandoHorarioInicialId?: string | null;
}

const FORM_TIPO_ID = "formulario-tipo-clase";
const FORM_HORARIO_ID = "formulario-horario-semanal";

function TarjetaKpiHorario({
  etiqueta,
  valor,
  detalle
}: {
  etiqueta: string;
  valor: string | number;
  detalle: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <strong className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground tabular-nums">
          {valor}
        </strong>
        <span className="text-xs text-muted-foreground tabular-nums">
          {detalle}
        </span>
      </div>
    </Card>
  );
}

function BloqueHorarioCard({
  horario,
  esAdmin,
  isPending,
  confirmandoInicial,
  onEditar,
  onConfirmarBaja
}: {
  horario: Horario;
  esAdmin: boolean;
  isPending: boolean;
  confirmandoInicial: boolean;
  onEditar: (horario: Horario) => void;
  onConfirmarBaja: (horario: Horario) => Promise<void>;
}) {
  const horaCorta = normalizarHoraCorta(horario.horaInicio);
  const franja = formatearFranjaHoraria(
    horario.horaInicio,
    horario.duracionMinutos
  );
  const confirmBaja = useInlineConfirm({
    defaultOpen: confirmandoInicial,
    pending: isPending,
    onConfirm: async () => {
      await onConfirmarBaja(horario);
    }
  });

  return (
    <div
      data-testid={`bloque-horario-dia-${horario.diaSemana}-${horaCorta}`}
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-secondary p-4 transition-colors hover:border-[#32343B]"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[1.0625rem] font-medium tracking-[-0.01em] text-foreground tabular-nums">
            {franja}
          </span>
          <Badge variant="zinc">{horario.tipoClaseNombre ?? "Clase"}</Badge>
          <Badge variant="mint" className="tabular-nums">
            {horario.duracionMinutos} min
          </Badge>
        </div>

        {esAdmin && !confirmBaja.confirmando ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="iconCircle"
              aria-label={`Editar horario ${horaCorta} de ${horario.tipoClaseNombre ?? "clase"}`}
              data-testid={`btn-editar-horario-${horario.id}`}
              disabled={isPending}
              onClick={() => onEditar(horario)}
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              ref={confirmBaja.triggerRef}
              type="button"
              variant="iconCircle"
              aria-label={`Dar de baja horario ${horaCorta}`}
              data-testid={`btn-eliminar-horario-${horaCorta}`}
              disabled={isPending}
              onClick={confirmBaja.abrir}
              className="border-[#FF6D6D]/28 bg-[#FF6D6D]/14 text-[#FF6D6D] hover:border-[#FF6D6D]/45 hover:bg-[#FF6D6D]/22"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="min-w-0 truncate">
          Coach:{" "}
          <strong className="font-medium text-foreground">
            {horario.coachNombre ?? "Sin asignar"}
          </strong>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-foreground tabular-nums">
          <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span>{formatearCuposHorario(horario.cuposDefault)}</span>
        </span>
      </div>

      {esAdmin && confirmBaja.confirmando ? (
        <InlineConfirmPanel
          ariaLabel={`Confirmar baja del horario ${horaCorta}`}
          message="¿Dar de baja este horario fijo? Las clases futuras sin reservas dejarán de generarse."
          confirmLabel="Confirmar baja"
          cancelLabel="Mantener"
          bloqueado={confirmBaja.bloqueado}
          cancelRef={confirmBaja.cancelRef}
          onConfirm={() => {
            void confirmBaja.confirmar();
          }}
          onCancel={confirmBaja.cancelar}
          testIdPrefix={`baja-horario-${horaCorta}`}
          className="border-[#FF6D6D]/28 bg-[#FF6D6D]/14"
          messageClassName="text-[#FECACA]"
        />
      ) : null}
    </div>
  );
}

function TipoClaseCard({
  tipoClase,
  cantidadHorarios,
  esAdmin,
  isPending,
  confirmandoInicial,
  onEditar,
  onConfirmarBaja
}: {
  tipoClase: TipoClase;
  cantidadHorarios: number;
  esAdmin: boolean;
  isPending: boolean;
  confirmandoInicial: boolean;
  onEditar: (tipo: TipoClase) => void;
  onConfirmarBaja: (tipo: TipoClase) => Promise<void>;
}) {
  const confirmBaja = useInlineConfirm({
    defaultOpen: confirmandoInicial,
    pending: isPending,
    onConfirm: async () => {
      await onConfirmarBaja(tipoClase);
    }
  });

  return (
    <article
      data-testid={`item-tipo-clase-${tipoClase.nombre}`}
      className="flex min-w-0 flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-[#32343B]"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h3 className="break-words text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground">
            {tipoClase.nombre}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tipoClase.descripcion?.trim() || "Sin descripción cargada."}
          </p>
        </div>

        {esAdmin && !confirmBaja.confirmando ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="iconCircle"
              aria-label={`Editar Tipo de Clase ${tipoClase.nombre}`}
              data-testid={`btn-editar-tipo-clase-${tipoClase.nombre}`}
              disabled={isPending}
              onClick={() => onEditar(tipoClase)}
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              ref={confirmBaja.triggerRef}
              type="button"
              variant="iconCircle"
              aria-label={`Dar de baja Tipo de Clase ${tipoClase.nombre}`}
              data-testid={`btn-eliminar-tipo-clase-${tipoClase.nombre}`}
              disabled={isPending}
              onClick={confirmBaja.abrir}
              className="border-[#FF6D6D]/28 bg-[#FF6D6D]/14 text-[#FF6D6D] hover:border-[#FF6D6D]/45 hover:bg-[#FF6D6D]/22"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={cantidadHorarios > 0 ? "mint" : "zinc"} className="tabular-nums">
          {cantidadHorarios}{" "}
          {cantidadHorarios === 1 ? "horario semanal" : "horarios semanales"}
        </Badge>
      </div>

      {esAdmin && confirmBaja.confirmando ? (
        <InlineConfirmPanel
          ariaLabel={`Confirmar baja de ${tipoClase.nombre}`}
          message={
            <span>
              ¿Dar de baja <strong>{tipoClase.nombre}</strong> del catálogo?
            </span>
          }
          confirmLabel="Confirmar baja"
          cancelLabel="Mantener"
          bloqueado={confirmBaja.bloqueado}
          cancelRef={confirmBaja.cancelRef}
          onConfirm={() => {
            void confirmBaja.confirmar();
          }}
          onCancel={confirmBaja.cancelar}
          testIdPrefix={`baja-tipo-clase-${tipoClase.nombre}`}
          className="border-[#FF6D6D]/28 bg-[#FF6D6D]/14"
          messageClassName="text-[#FECACA]"
        />
      ) : null}
    </article>
  );
}

/**
 * Gestión Dark Bento Cockpit de Tipos de Clase y plantilla semanal de Horarios.
 */
export function HorariosView({
  boxId,
  esAdmin,
  tiposClaseIniciales,
  horariosIniciales,
  coaches,
  drawerInicial = null,
  confirmandoTipoInicialId = null,
  confirmandoHorarioInicialId = null
}: HorariosViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filtroDia, setFiltroDia] = useState<FiltroDiaSemana>("TODOS");
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false);

  const [drawerModo, setDrawerModo] = useState<"tipo" | "horario" | null>(
    drawerInicial
  );
  const [tipoEditando, setTipoEditando] = useState<TipoClase | null>(null);
  const [horarioEditando, setHorarioEditando] = useState<Horario | null>(null);

  const tiposActivos = useMemo(
    () => obtenerTiposClaseActivos(tiposClaseIniciales),
    [tiposClaseIniciales]
  );

  const [borradorTipo, setBorradorTipo] = useState<BorradorTipoClase>(() =>
    crearBorradorTipoClase(null)
  );
  const [erroresTipo, setErroresTipo] = useState<ErroresTipoClaseFormulario>({});

  const [borradorHorario, setBorradorHorario] = useState<BorradorHorario>(() =>
    crearBorradorHorario(null, {
      tipoClaseId: tiposActivos[0]?.id ?? "",
      coachAfiliacionId: coaches[0]?.id ?? ""
    })
  );
  const [erroresHorario, setErroresHorario] =
    useState<ErroresHorarioFormulario>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const horariosPorDia = useMemo(
    () => agruparHorariosPorDia(horariosIniciales),
    [horariosIniciales]
  );

  const conteoPorTipo = useMemo(
    () => contarHorariosPorTipoClase(horariosIniciales),
    [horariosIniciales]
  );

  const resumen = useMemo(
    () => calcularResumenHorarios(horariosIniciales, tiposClaseIniciales),
    [horariosIniciales, tiposClaseIniciales]
  );

  const diasVisibles = useMemo(
    () => filtrarDiasVisibles(filtroDia),
    [filtroDia]
  );

  const opcionesDias = useMemo<FilterChipOption<FiltroDiaSemana>[]>(() => {
    const base: FilterChipOption<FiltroDiaSemana>[] = [
      {
        value: "TODOS",
        label: "Toda la semana",
        count: resumen.totalHorariosActivos,
        testId: "filtro-dia-todos"
      }
    ];
    for (const dia of DIAS_SEMANA) {
      base.push({
        value: `${dia}`,
        label: NOMBRES_DIAS_SEMANA[dia],
        count: horariosPorDia[dia].length,
        testId: `filtro-dia-${dia}`
      });
    }
    return base;
  }, [horariosPorDia, resumen.totalHorariosActivos]);

  function abrirDrawerTipo(tipo?: TipoClase) {
    setErrorMsg(null);
    setExitoMsg(null);
    setErroresTipo({});
    setTipoEditando(tipo ?? null);
    setBorradorTipo(crearBorradorTipoClase(tipo ?? null));
    setDrawerModo("tipo");
  }

  function abrirDrawerHorario(horario?: Horario) {
    setErrorMsg(null);
    setExitoMsg(null);
    setErroresHorario({});
    setHorarioEditando(horario ?? null);
    setBorradorHorario(
      crearBorradorHorario(horario ?? null, {
        tipoClaseId: tiposActivos[0]?.id ?? "",
        coachAfiliacionId: coaches[0]?.id ?? ""
      })
    );
    setDrawerModo("horario");
  }

  function cerrarDrawer() {
    if (isPending) {
      return;
    }
    setDrawerModo(null);
    setTipoEditando(null);
    setHorarioEditando(null);
    setErroresTipo({});
    setErroresHorario({});
  }

  function handleGuardarTipoClase(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);
    setErroresTipo({});

    startTransition(async () => {
      const resultado = await procesarGuardadoTipoClase(
        boxId,
        tipoEditando?.id ?? null,
        borradorTipo,
        crearTipoClaseAction,
        actualizarTipoClaseAction
      );

      if (!resultado.ok) {
        setErroresTipo(resultado.errores);
        if (resultado.general) {
          setErrorMsg(resultado.general);
        }
        return;
      }

      setExitoMsg(resultado.mensajeExito);
      setDrawerModo(null);
      setTipoEditando(null);
      setBorradorTipo(crearBorradorTipoClase(null));
      router.refresh();
    });
  }

  async function handleConfirmarBajaTipoClase(tipo: TipoClase) {
    setErrorMsg(null);
    setExitoMsg(null);

    const resultado = await procesarBajaTipoClase(
      boxId,
      tipo,
      eliminarTipoClaseAction
    );
    if (!resultado.ok) {
      setErrorMsg(resultado.error);
      return;
    }

    setExitoMsg(resultado.mensajeExito);
    startTransition(() => {
      router.refresh();
    });
  }

  function handleGuardarHorario(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);
    setErroresHorario({});

    startTransition(async () => {
      const resultado = await procesarGuardadoHorario(
        boxId,
        horarioEditando?.id ?? null,
        borradorHorario,
        crearHorarioAction,
        actualizarHorarioAction
      );

      if (!resultado.ok) {
        setErroresHorario(resultado.errores);
        if (resultado.general) {
          setErrorMsg(resultado.general);
        }
        return;
      }

      setExitoMsg(resultado.mensajeExito);
      setPendienteSincronizar(true);
      setDrawerModo(null);
      setHorarioEditando(null);
      router.refresh();
    });
  }

  async function handleConfirmarBajaHorario(horario: Horario) {
    setErrorMsg(null);
    setExitoMsg(null);

    const resultado = await procesarBajaHorario(
      boxId,
      horario,
      eliminarHorarioAction
    );
    if (!resultado.ok) {
      setErrorMsg(resultado.error);
      return;
    }

    setExitoMsg(resultado.mensajeExito);
    setPendienteSincronizar(true);
    startTransition(() => {
      router.refresh();
    });
  }

  function handleGenerarProximasClases() {
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const resultado = await procesarMaterializacionClases(
        boxId,
        materializarClasesAction
      );
      if (!resultado.ok) {
        setErrorMsg(resultado.error);
        return;
      }

      setPendienteSincronizar(false);
      setExitoMsg(resultado.mensajeExito);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
            Horarios y Tipos de Clase
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Definí los horarios semanales fijos del Box y su catálogo de Tipos de
            Clase. Desde esta plantilla se generan las clases del Calendario.
          </p>
        </div>

        {esAdmin ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              data-testid="btn-nuevo-tipo-clase"
              disabled={isPending}
              onClick={() => abrirDrawerTipo()}
            >
              <Dumbbell className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Nuevo Tipo de Clase</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-testid="btn-generar-clases"
              disabled={isPending}
              onClick={handleGenerarProximasClases}
            >
              <RefreshCw
                className={cn("h-4 w-4 shrink-0", isPending && "animate-spin")}
                aria-hidden="true"
              />
              <span>Generar próximas clases</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              data-testid="btn-nuevo-horario"
              disabled={isPending}
              onClick={() => abrirDrawerHorario()}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Nuevo Horario</span>
            </Button>
          </div>
        ) : null}
      </header>

      {!esAdmin ? (
        <div
          data-testid="banner-solo-lectura"
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground"
        >
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[#FBBF24]"
            aria-hidden="true"
          />
          <span>
            Estás consultando la plantilla semanal en modo lectura. Solo un
            Administrador del Box puede crear, editar o dar de baja Horarios y
            Tipos de Clase.
          </span>
        </div>
      ) : null}

      {esAdmin && pendienteSincronizar ? (
        <div
          data-testid="banner-sincronizacion-clases"
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C1F429]/30 bg-[#C1F429]/8 px-4 py-3.5 text-sm text-foreground"
        >
          <span>
            Actualizaste la plantilla semanal. Generá las próximas clases para
            reflejar los cambios en el <strong>Calendario de Clases</strong>.
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/clases"
              className={buttonClassName("secondary")}
            >
              <span>Ver Calendario</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={handleGenerarProximasClases}
            >
              Aplicar al Calendario
            </Button>
          </div>
        </div>
      ) : null}

      {errorMsg ? (
        <div
          data-testid="alerta-error"
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-4 py-3 text-sm text-[#FF6D6D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {exitoMsg ? (
        <div
          data-testid="alerta-exito"
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-[#18FFC8]/28 bg-[#18FFC8]/14 px-4 py-3 text-sm text-[#18FFC8]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      <section
        aria-label="Resumen semanal"
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4"
      >
        <TarjetaKpiHorario
          etiqueta="Horarios semanales activos"
          valor={resumen.totalHorariosActivos}
          detalle={`Distribuidos en ${resumen.diasConHorarios} ${resumen.diasConHorarios === 1 ? "día" : "días"} de la semana`}
        />
        <TarjetaKpiHorario
          etiqueta="Tipos de Clase"
          valor={resumen.totalTiposActivos}
          detalle="Categorías activas en el catálogo"
        />
        <TarjetaKpiHorario
          etiqueta="Cupos semanales totales"
          valor={resumen.cuposSemanalesTotales}
          detalle="Suma de cupos por defecto de la semana"
        />
      </section>

      <section className="space-y-4" aria-labelledby="sec-plantilla-semanal">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2
              id="sec-plantilla-semanal"
              className="text-[1.0625rem] font-medium tracking-[-0.01em] text-foreground"
            >
              Plantilla semanal de Horarios
            </h2>
          </div>

          <Link
            href="/clases"
            className={buttonClassName("secondary")}
          >
            <span>Ir al Calendario de Clases</span>
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>

        <Card className="p-4">
          <FilterChips
            options={opcionesDias}
            value={filtroDia}
            onChange={setFiltroDia}
            ariaLabel="Filtrar día de la semana"
          />
        </Card>

        <div
          data-testid="grilla-horarios-semana"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4"
        >
          {diasVisibles.map((dia) => {
            const listaDia = horariosPorDia[dia] ?? [];
            return (
              <Card key={dia} className="flex min-w-0 flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <h3 className="text-[1.0625rem] font-medium tracking-[-0.01em] text-foreground">
                    {NOMBRES_DIAS_SEMANA[dia]}
                  </h3>
                  <Badge
                    variant={listaDia.length > 0 ? "mint" : "zinc"}
                    className="tabular-nums"
                  >
                    {listaDia.length}{" "}
                    {listaDia.length === 1 ? "horario" : "horarios"}
                  </Badge>
                </div>

                {listaDia.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                    <span>Sin horarios fijos este día.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {listaDia.map((horario) => (
                      <BloqueHorarioCard
                        key={horario.id}
                        horario={horario}
                        esAdmin={esAdmin}
                        isPending={isPending}
                        confirmandoInicial={
                          confirmandoHorarioInicialId === horario.id
                        }
                        onEditar={abrirDrawerHorario}
                        onConfirmarBaja={handleConfirmarBajaHorario}
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sec-tipos-clase">
        <div className="flex items-center gap-2.5">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2
            id="sec-tipos-clase"
            className="text-[1.0625rem] font-medium tracking-[-0.01em] text-foreground"
          >
            Catálogo de Tipos de Clase
          </h2>
        </div>

        <div
          data-testid="grilla-tipos-clase"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4"
        >
          {tiposActivos.length === 0 ? (
            <Card className="col-span-full border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no hay Tipos de Clase activos en el catálogo.
                {esAdmin
                  ? " Creá el primero para empezar a programar la semana."
                  : ""}
              </p>
            </Card>
          ) : (
            tiposActivos.map((tc) => (
              <TipoClaseCard
                key={tc.id}
                tipoClase={tc}
                cantidadHorarios={conteoPorTipo[tc.id] ?? 0}
                esAdmin={esAdmin}
                isPending={isPending}
                confirmandoInicial={confirmandoTipoInicialId === tc.id}
                onEditar={abrirDrawerTipo}
                onConfirmarBaja={handleConfirmarBajaTipoClase}
              />
            ))
          )}
        </div>
      </section>

      <SideDrawer
        open={drawerModo === "tipo"}
        onClose={cerrarDrawer}
        title={tipoEditando ? "Editar Tipo de Clase" : "Nuevo Tipo de Clase"}
        description="Categoría de entrenamiento que define qué se dicta en el Box, sin fijar día ni hora."
        testId="drawer-tipo-clase"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={cerrarDrawer}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_TIPO_ID}
              variant="primary"
              data-testid="btn-guardar-tipo-clase"
              disabled={isPending}
            >
              {isPending
                ? "Guardando..."
                : tipoEditando
                  ? "Guardar cambios"
                  : "Guardar Tipo de Clase"}
            </Button>
          </>
        }
      >
        <form
          id={FORM_TIPO_ID}
          onSubmit={handleGuardarTipoClase}
          className="space-y-4"
        >
          {erroresTipo.general ? (
            <div
              role="alert"
              className="rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-2.5 text-sm text-[#FF6D6D]"
            >
              {erroresTipo.general}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="tipo-nombre">Nombre del Tipo de Clase</Label>
            <Input
              id="tipo-nombre"
              data-testid="input-tipo-clase-nombre"
              placeholder="Ej: WOD, Halterofilia, Open Box"
              aria-invalid={Boolean(erroresTipo.nombre)}
              value={borradorTipo.nombre}
              onChange={(e) =>
                setBorradorTipo((prev) => ({ ...prev, nombre: e.target.value }))
              }
              required
            />
            {erroresTipo.nombre ? (
              <p className="text-xs text-[#FF6D6D]">{erroresTipo.nombre}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo-descripcion">Descripción breve (opcional)</Label>
            <Input
              id="tipo-descripcion"
              data-testid="input-tipo-clase-descripcion"
              placeholder="Ej: Entrenamiento funcional metabólico y de fuerza"
              aria-invalid={Boolean(erroresTipo.descripcion)}
              value={borradorTipo.descripcion}
              onChange={(e) =>
                setBorradorTipo((prev) => ({
                  ...prev,
                  descripcion: e.target.value
                }))
              }
            />
            {erroresTipo.descripcion ? (
              <p className="text-xs text-[#FF6D6D]">
                {erroresTipo.descripcion}
              </p>
            ) : null}
          </div>
        </form>
      </SideDrawer>

      <SideDrawer
        open={drawerModo === "horario"}
        onClose={cerrarDrawer}
        title={
          horarioEditando ? "Editar Horario semanal" : "Nuevo Horario semanal"
        }
        description="Regla recurrente que alimenta la creación de Clases en el Calendario."
        testId="drawer-horario"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={cerrarDrawer}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_HORARIO_ID}
              variant="primary"
              data-testid="btn-guardar-horario"
              disabled={isPending}
            >
              {isPending
                ? "Guardando..."
                : horarioEditando
                  ? "Guardar cambios"
                  : "Guardar Horario"}
            </Button>
          </>
        }
      >
        <form
          id={FORM_HORARIO_ID}
          onSubmit={handleGuardarHorario}
          className="space-y-4"
        >
          {erroresHorario.general ? (
            <div
              role="alert"
              className="rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-2.5 text-sm text-[#FF6D6D]"
            >
              {erroresHorario.general}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="horario-tipo">Tipo de Clase</Label>
            <Select
              id="horario-tipo"
              data-testid="select-horario-tipo-clase"
              aria-invalid={Boolean(erroresHorario.tipoClaseId)}
              value={borradorHorario.tipoClaseId}
              onChange={(e) =>
                setBorradorHorario((prev) => ({
                  ...prev,
                  tipoClaseId: e.target.value
                }))
              }
              required
            >
              <option value="">Seleccionar Tipo de Clase...</option>
              {tiposActivos.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.nombre}
                </option>
              ))}
            </Select>
            {erroresHorario.tipoClaseId ? (
              <p className="text-xs text-[#FF6D6D]">
                {erroresHorario.tipoClaseId}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horario-coach">Coach por defecto</Label>
            <Select
              id="horario-coach"
              data-testid="select-horario-coach"
              aria-invalid={Boolean(erroresHorario.coachAfiliacionId)}
              value={borradorHorario.coachAfiliacionId}
              onChange={(e) =>
                setBorradorHorario((prev) => ({
                  ...prev,
                  coachAfiliacionId: e.target.value
                }))
              }
              required
            >
              <option value="">Seleccionar Coach...</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.usuario.nombre}
                </option>
              ))}
            </Select>
            {erroresHorario.coachAfiliacionId ? (
              <p className="text-xs text-[#FF6D6D]">
                {erroresHorario.coachAfiliacionId}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="horario-dia">Día de la semana</Label>
              <Select
                id="horario-dia"
                data-testid="select-horario-dia"
                aria-invalid={Boolean(erroresHorario.diaSemana)}
                value={borradorHorario.diaSemana}
                onChange={(e) =>
                  setBorradorHorario((prev) => ({
                    ...prev,
                    diaSemana: e.target.value
                  }))
                }
                required
              >
                {DIAS_SEMANA.map((dia) => (
                  <option key={dia} value={String(dia)}>
                    {NOMBRES_DIAS_SEMANA[dia]}
                  </option>
                ))}
              </Select>
              {erroresHorario.diaSemana ? (
                <p className="text-xs text-[#FF6D6D]">
                  {erroresHorario.diaSemana}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario-hora">Hora de inicio</Label>
              <Input
                id="horario-hora"
                type="time"
                data-testid="input-horario-hora"
                className="tabular-nums"
                aria-invalid={Boolean(erroresHorario.horaInicio)}
                value={borradorHorario.horaInicio}
                onChange={(e) =>
                  setBorradorHorario((prev) => ({
                    ...prev,
                    horaInicio: e.target.value
                  }))
                }
                required
              />
              {erroresHorario.horaInicio ? (
                <p className="text-xs text-[#FF6D6D]">
                  {erroresHorario.horaInicio}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="horario-duracion">Duración (min)</Label>
              <Input
                id="horario-duracion"
                data-testid="input-horario-duracion"
                type="number"
                min="1"
                className="tabular-nums"
                aria-invalid={Boolean(erroresHorario.duracionMinutos)}
                value={borradorHorario.duracionMinutos}
                onChange={(e) =>
                  setBorradorHorario((prev) => ({
                    ...prev,
                    duracionMinutos: e.target.value
                  }))
                }
                required
              />
              {erroresHorario.duracionMinutos ? (
                <p className="text-xs text-[#FF6D6D]">
                  {erroresHorario.duracionMinutos}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario-cupos">Cupos por defecto</Label>
              <Input
                id="horario-cupos"
                data-testid="input-horario-cupos"
                type="number"
                min="1"
                className="tabular-nums"
                aria-invalid={Boolean(erroresHorario.cuposDefault)}
                value={borradorHorario.cuposDefault}
                onChange={(e) =>
                  setBorradorHorario((prev) => ({
                    ...prev,
                    cuposDefault: e.target.value
                  }))
                }
                required
              />
              {erroresHorario.cuposDefault ? (
                <p className="text-xs text-[#FF6D6D]">
                  {erroresHorario.cuposDefault}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground tabular-nums">
            <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{construirVistaPreviaHorario(borradorHorario)}</span>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
