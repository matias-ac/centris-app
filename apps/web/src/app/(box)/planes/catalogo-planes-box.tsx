"use client";

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Info,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  MODALIDADES_CREDITOS,
  type ModalidadCreditos,
  type Plan
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  actualizarPlanAction,
  crearPlanAction,
  eliminarPlanAction
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  calcularKpisPlanes,
  crearBorradorPlan,
  explicarReglaPlan,
  filtrarPlanes,
  formatearPrecioPlan,
  obtenerMetaModalidadPlan,
  procesarAlternarActivoPlan,
  procesarBajaPlan,
  procesarGuardadoPlan,
  resumirCreditosPlan,
  type BorradorPlan,
  type ErroresPlanFormulario,
  type FiltroEstadoPlan,
  type FiltroModalidadPlan
} from "./planes-estado";

export interface CatalogoPlanesBoxProps {
  boxId: string;
  moneda: string;
  planesIniciales: Plan[];
  esAdmin: boolean;
  drawerAbiertoInicial?: boolean;
  planEditandoInicial?: Plan | null;
  confirmandoBajaInicialId?: string | null;
}

const FORM_PLAN_ID = "formulario-plan-catalogo";

function TarjetaKpiPlan({
  etiqueta,
  valor,
  badgeLabel,
  badgeVariant,
  pie
}: {
  etiqueta: string;
  valor: string;
  badgeLabel?: string;
  badgeVariant?: "mint" | "amber" | "zinc";
  pie: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <strong className="text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium leading-none tracking-[-0.02em] text-foreground tabular-nums">
            {valor}
          </strong>
          {badgeLabel && badgeVariant ? (
            <Badge
              variant={badgeVariant}
              className="max-w-full whitespace-normal text-left"
            >
              {badgeLabel}
            </Badge>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">{pie}</span>
      </div>
    </Card>
  );
}

function TarjetaPlanCatalogo({
  plan,
  moneda,
  esAdmin,
  isPending,
  confirmandoInicial,
  onEditar,
  onAlternarActivo,
  onConfirmarBaja
}: {
  plan: Plan;
  moneda: string;
  esAdmin: boolean;
  isPending: boolean;
  confirmandoInicial: boolean;
  onEditar: (plan: Plan) => void;
  onAlternarActivo: (plan: Plan) => void;
  onConfirmarBaja: (plan: Plan) => Promise<void>;
}) {
  const metaModalidad = obtenerMetaModalidadPlan(plan.modalidadCreditos);
  const confirmBaja = useInlineConfirm({
    defaultOpen: confirmandoInicial,
    pending: isPending,
    onConfirm: async () => {
      await onConfirmarBaja(plan);
    }
  });

  return (
    <article
      data-testid={`fila-plan-${plan.id}`}
      className={cn(
        "flex min-w-0 flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-[#32343B]",
        !plan.activo && "opacity-75"
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 break-words text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground">
            {plan.nombre}
          </h2>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <Badge variant={plan.activo ? "mint" : "zinc"}>
              {plan.activo ? "Activo" : "Inactivo"}
            </Badge>
            <Badge variant={metaModalidad.badgeVariant}>
              {metaModalidad.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <strong className="text-[1.875rem] font-light leading-[1.1] tracking-[-0.03em] text-foreground tabular-nums">
            {formatearPrecioPlan(plan.precioBase, moneda)}
          </strong>
          <span className="text-xs text-muted-foreground">
            {moneda} · por ciclo de{" "}
            <span className="tabular-nums">{plan.duracionDias}</span>{" "}
            {plan.duracionDias === 1 ? "día" : "días"}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-secondary p-3.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Créditos</span>
            <span className="text-right font-medium text-foreground tabular-nums">
              {resumirCreditosPlan(plan)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Vigencia</span>
            <span className="text-right font-medium text-foreground tabular-nums">
              {plan.duracionDias} {plan.duracionDias === 1 ? "día" : "días"}
            </span>
          </div>
          <p className="border-t border-border pt-2.5 text-xs leading-relaxed text-muted-foreground">
            {explicarReglaPlan(plan)}
          </p>
        </div>
      </div>

      {esAdmin ? (
        confirmBaja.confirmando ? (
          <InlineConfirmPanel
            ariaLabel={`Confirmar baja del plan ${plan.nombre}`}
            message={
              <span>
                ¿Quitar <strong>{plan.nombre}</strong> del catálogo? Las
                membresías ya emitidas seguirán vigentes.
              </span>
            }
            confirmLabel="Confirmar baja"
            cancelLabel="Cancelar"
            bloqueado={confirmBaja.bloqueado}
            cancelRef={confirmBaja.cancelRef}
            onConfirm={() => {
              void confirmBaja.confirmar();
            }}
            onCancel={confirmBaja.cancelar}
            testIdPrefix={`baja-plan-${plan.id}`}
            className="border-[#FF6D6D]/28 bg-[#FF6D6D]/14"
            messageClassName="text-[#FECACA]"
          />
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-w-0 flex-1"
              data-testid={`btn-abrir-edicion-${plan.id}`}
              disabled={isPending}
              onClick={() => onEditar(plan)}
            >
              <Edit3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Editar</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-w-0 flex-1"
              data-testid={`btn-alternar-activo-${plan.id}`}
              disabled={isPending}
              onClick={() => onAlternarActivo(plan)}
            >
              {plan.activo ? "Desactivar" : "Activar"}
            </Button>
            <Button
              ref={confirmBaja.triggerRef}
              type="button"
              variant="destructive"
              className="min-w-0 shrink-0"
              aria-label={`Dar de baja ${plan.nombre}`}
              data-testid={`btn-eliminar-plan-${plan.id}`}
              disabled={isPending}
              onClick={confirmBaja.abrir}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Dar de baja</span>
            </Button>
          </div>
        )
      ) : null}
    </article>
  );
}

/**
 * Catálogo de Planes del Box en estética Dark Bento Cockpit con Drawer unificado y baja inline.
 */
export function CatalogoPlanesBox({
  boxId,
  moneda,
  planesIniciales,
  esAdmin,
  drawerAbiertoInicial = false,
  planEditandoInicial = null,
  confirmandoBajaInicialId = null
}: CatalogoPlanesBoxProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoPlan>("TODOS");
  const [filtroModalidad, setFiltroModalidad] =
    useState<FiltroModalidadPlan>("TODAS");

  const [drawerAbierto, setDrawerAbierto] = useState(drawerAbiertoInicial);
  const [planEditando, setPlanEditando] = useState<Plan | null>(
    planEditandoInicial
  );
  const [borrador, setBorrador] = useState<BorradorPlan>(() =>
    crearBorradorPlan(planEditandoInicial)
  );
  const [erroresForm, setErroresForm] = useState<ErroresPlanFormulario>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const kpis = useMemo(
    () => calcularKpisPlanes(planesIniciales),
    [planesIniciales]
  );

  const planesFiltrados = useMemo(
    () =>
      filtrarPlanes(planesIniciales, {
        busqueda,
        estado: filtroEstado,
        modalidad: filtroModalidad
      }),
    [planesIniciales, busqueda, filtroEstado, filtroModalidad]
  );

  const opcionesEstado: readonly FilterChipOption<FiltroEstadoPlan>[] = [
    {
      value: "TODOS",
      label: "Todos",
      count: kpis.total,
      testId: "filtro-planes-todos"
    },
    {
      value: "ACTIVOS",
      label: "Activos",
      count: kpis.activos,
      testId: "filtro-planes-activos"
    },
    {
      value: "INACTIVOS",
      label: "Inactivos",
      count: kpis.inactivos,
      testId: "filtro-planes-inactivos"
    }
  ];

  const opcionesModalidad: readonly FilterChipOption<FiltroModalidadPlan>[] = [
    {
      value: "TODAS",
      label: "Todas las modalidades",
      testId: "filtro-modalidad-todas"
    },
    {
      value: "SEMANAL",
      label: "Créditos semanales",
      testId: "filtro-modalidad-semanal"
    },
    {
      value: "VIGENCIA_TOTAL",
      label: "Bolsa por vigencia",
      testId: "filtro-modalidad-vigencia"
    },
    {
      value: "ILIMITADO",
      label: "Ilimitado",
      testId: "filtro-modalidad-ilimitado"
    }
  ];

  const rangoCuota =
    kpis.precioMinActivo === null || kpis.precioMaxActivo === null
      ? "Sin planes activos"
      : kpis.precioMinActivo === kpis.precioMaxActivo
        ? formatearPrecioPlan(kpis.precioMinActivo, moneda)
        : `${formatearPrecioPlan(kpis.precioMinActivo, moneda)} a ${formatearPrecioPlan(kpis.precioMaxActivo, moneda)}`;

  const metaModalidadFormulario = obtenerMetaModalidadPlan(
    borrador.modalidadCreditos
  );

  const precioPreview = Number(borrador.precioBase);
  const diasPreview = Number(borrador.duracionDias) || 30;
  const creditosPreview =
    Number(borrador.creditosPorPeriodo) ||
    (borrador.modalidadCreditos === "SEMANAL" ? 3 : 12);
  const textoPreview = explicarReglaPlan({
    duracionDias: diasPreview,
    modalidadCreditos: borrador.modalidadCreditos,
    creditosPorPeriodo:
      borrador.modalidadCreditos === "ILIMITADO" ? null : creditosPreview
  });
  const notaPrecioPreview =
    Number.isFinite(precioPreview) && precioPreview > 0
      ? `Precio de lista: ${formatearPrecioPlan(precioPreview, moneda)}. `
      : "";

  function abrirDrawerNuevo() {
    setPlanEditando(null);
    setBorrador(crearBorradorPlan(null));
    setErroresForm({});
    setErrorMsg(null);
    setExitoMsg(null);
    setDrawerAbierto(true);
  }

  function abrirDrawerEdicion(plan: Plan) {
    setPlanEditando(plan);
    setBorrador(crearBorradorPlan(plan));
    setErroresForm({});
    setErrorMsg(null);
    setExitoMsg(null);
    setDrawerAbierto(true);
  }

  function cerrarDrawer() {
    setDrawerAbierto(false);
    setPlanEditando(null);
    setErroresForm({});
  }

  function actualizarCampo<K extends keyof BorradorPlan>(
    campo: K,
    valor: BorradorPlan[K]
  ) {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setErroresForm((prev) => ({ ...prev, [campo]: undefined, general: undefined }));
  }

  function handleSubmitPlan(event: React.FormEvent) {
    event.preventDefault();
    setErroresForm({});
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const resultado = await procesarGuardadoPlan(
        boxId,
        planEditando?.id ?? null,
        borrador,
        crearPlanAction,
        actualizarPlanAction
      );

      if (!resultado.ok) {
        setErroresForm(resultado.errores);
        if (resultado.general) {
          setErrorMsg(resultado.general);
        }
        return;
      }

      setExitoMsg(resultado.mensajeExito);
      cerrarDrawer();
      router.refresh();
    });
  }

  function handleAlternarActivo(plan: Plan) {
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const resultado = await procesarAlternarActivoPlan(
        boxId,
        plan,
        actualizarPlanAction
      );
      if (!resultado.ok) {
        setErrorMsg(resultado.error);
        return;
      }

      setExitoMsg(resultado.mensajeExito);
      router.refresh();
    });
  }

  async function handleConfirmarBaja(plan: Plan) {
    setErrorMsg(null);
    setExitoMsg(null);

    const resultado = await procesarBajaPlan(boxId, plan, eliminarPlanAction);
    if (!resultado.ok) {
      setErrorMsg(resultado.error);
      return;
    }

    setExitoMsg(resultado.mensajeExito);
    router.refresh();
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("TODOS");
    setFiltroModalidad("TODAS");
  }

  const hayFiltrosActivos =
    busqueda.trim().length > 0 ||
    filtroEstado !== "TODOS" ||
    filtroModalidad !== "TODAS";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
            Catálogo de Planes
          </h1>
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            {esAdmin
              ? "Definí precios base, días de vigencia y reglas de créditos disponibles al asignar membresías."
              : "Consultá los planes activos del Box para asesorar atletas y asignar nuevas membresías."}
          </p>
        </div>

        {esAdmin ? (
          <Button
            type="button"
            variant="primary"
            data-testid="btn-nuevo-plan"
            onClick={abrirDrawerNuevo}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Nuevo plan</span>
          </Button>
        ) : null}
      </header>

      {!esAdmin ? (
        <div
          data-testid="banner-solo-lectura"
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#FBBF24]/28 bg-[#FBBF24]/14 px-4 py-3.5 text-sm text-[#FDE68A]"
        >
          <Info
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FBBF24]"
            aria-hidden="true"
          />
          <span>
            <strong className="font-semibold text-foreground">
              Modo consulta (Recepción):
            </strong>{" "}
            podés comparar precios, vigencia y reglas de créditos para asesorar
            atletas. Solo un Administrador crea o modifica planes.
          </span>
        </div>
      ) : null}

      {exitoMsg ? (
        <div
          data-testid="plan-mensaje-exito"
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-[#18FFC8]/28 bg-[#18FFC8]/14 px-4 py-3 text-sm text-[#18FFC8]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      {errorMsg && !drawerAbierto ? (
        <div
          data-testid="plan-mensaje-error"
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-4 py-3 text-sm text-[#FF6D6D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <section
        aria-label="Resumen del catálogo"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4"
      >
        <TarjetaKpiPlan
          etiqueta="Planes activos"
          valor={`${kpis.activos} / ${kpis.total}`}
          badgeLabel={kpis.activos > 0 ? "Disponibles" : "Sin activos"}
          badgeVariant={kpis.activos > 0 ? "mint" : "zinc"}
          pie="Visibles al asignar nuevas membresías"
        />
        <TarjetaKpiPlan
          etiqueta="Rango de cuota"
          valor={rangoCuota}
          pie={`Moneda local del Box (${moneda})`}
        />
        <TarjetaKpiPlan
          etiqueta="Modalidades en oferta"
          valor={`${kpis.modalidadesActivas} ${kpis.modalidadesActivas === 1 ? "tipo" : "tipos"}`}
          badgeLabel="Semanal · Bolsa · Libre"
          badgeVariant="zinc"
          pie="Según reglas de consumo activas"
        />
      </section>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-0 flex-1 basis-[260px] sm:max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre del plan..."
              aria-label="Buscar por nombre del plan"
              data-testid="input-buscar-plan"
              className="rounded-full pl-10"
            />
          </div>

          <FilterChips
            ariaLabel="Filtrar por estado"
            value={filtroEstado}
            onChange={setFiltroEstado}
            options={opcionesEstado}
          />
        </div>

        <FilterChips
          ariaLabel="Filtrar por modalidad de créditos"
          value={filtroModalidad}
          onChange={setFiltroModalidad}
          options={opcionesModalidad}
        />
      </Card>

      {planesFiltrados.length === 0 ? (
        <div
          data-testid="mensaje-sin-planes"
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {planesIniciales.length === 0
              ? "Todavía no hay planes configurados en este Box."
              : "No hay planes que coincidan con los filtros seleccionados."}
          </p>
          {hayFiltrosActivos ? (
            <Button
              type="button"
              variant="secondary"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </Button>
          ) : esAdmin ? (
            <Button type="button" variant="primary" onClick={abrirDrawerNuevo}>
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Crear primer plan</span>
            </Button>
          ) : null}
        </div>
      ) : (
        <section
          data-testid="grilla-planes"
          aria-label="Listado de planes"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4"
        >
          {planesFiltrados.map((plan) => (
            <TarjetaPlanCatalogo
              key={plan.id}
              plan={plan}
              moneda={moneda}
              esAdmin={esAdmin}
              isPending={isPending}
              confirmandoInicial={confirmandoBajaInicialId === plan.id}
              onEditar={abrirDrawerEdicion}
              onAlternarActivo={handleAlternarActivo}
              onConfirmarBaja={handleConfirmarBaja}
            />
          ))}
        </section>
      )}

      {esAdmin ? (
        <SideDrawer
          open={drawerAbierto}
          onClose={cerrarDrawer}
          title={planEditando ? "Editar plan comercial" : "Nuevo plan comercial"}
          description={
            planEditando
              ? "Los cambios aplican a nuevas membresías; las vigentes conservan sus condiciones."
              : "Definí precio base, vigencia en días y cómo se consumen los créditos."
          }
          testId="drawer-plan"
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                data-testid="btn-cancelar-plan"
                disabled={isPending}
                onClick={cerrarDrawer}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form={FORM_PLAN_ID}
                variant="primary"
                data-testid="btn-guardar-plan"
                disabled={isPending}
              >
                {isPending
                  ? "Guardando..."
                  : planEditando
                    ? "Guardar cambios"
                    : "Guardar plan"}
              </Button>
            </>
          }
        >
          <form
            id={FORM_PLAN_ID}
            onSubmit={handleSubmitPlan}
            data-testid={
              planEditando ? "formulario-editar-plan" : "formulario-crear-plan"
            }
            className="space-y-4"
            noValidate
          >
            {erroresForm.general ? (
              <div
                data-testid="plan-mensaje-error"
                role="alert"
                className="flex items-center gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-4 py-3 text-sm text-[#FF6D6D]"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{erroresForm.general}</span>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="plan-nombre">Nombre del plan</Label>
              <Input
                id="plan-nombre"
                data-testid="input-plan-nombre"
                placeholder="Ej. CrossFit 3 veces por semana"
                value={borrador.nombre}
                aria-invalid={Boolean(erroresForm.nombre)}
                onChange={(event) =>
                  actualizarCampo("nombre", event.target.value)
                }
                required
              />
              {erroresForm.nombre ? (
                <p role="alert" className="text-xs text-[#FF6D6D]">
                  {erroresForm.nombre}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="plan-precio">Precio base ({moneda})</Label>
                <Input
                  id="plan-precio"
                  data-testid="input-plan-precio"
                  type="number"
                  min="0"
                  placeholder="38000"
                  value={borrador.precioBase}
                  aria-invalid={Boolean(erroresForm.precioBase)}
                  className="tabular-nums"
                  onChange={(event) =>
                    actualizarCampo("precioBase", event.target.value)
                  }
                  required
                />
                {erroresForm.precioBase ? (
                  <p role="alert" className="text-xs text-[#FF6D6D]">
                    {erroresForm.precioBase}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="plan-duracion">Vigencia (días)</Label>
                <Input
                  id="plan-duracion"
                  data-testid="input-plan-duracion"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={borrador.duracionDias}
                  aria-invalid={Boolean(erroresForm.duracionDias)}
                  className="tabular-nums"
                  onChange={(event) =>
                    actualizarCampo("duracionDias", event.target.value)
                  }
                  required
                />
                {erroresForm.duracionDias ? (
                  <p role="alert" className="text-xs text-[#FF6D6D]">
                    {erroresForm.duracionDias}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-modalidad">Modalidad de créditos</Label>
              <Select
                id="plan-modalidad"
                data-testid="select-plan-modalidad"
                value={borrador.modalidadCreditos}
                onChange={(event) =>
                  actualizarCampo(
                    "modalidadCreditos",
                    event.target.value as ModalidadCreditos
                  )
                }
              >
                {MODALIDADES_CREDITOS.map((mod) => (
                  <option key={mod} value={mod}>
                    {obtenerMetaModalidadPlan(mod).optionLabel}
                  </option>
                ))}
              </Select>
            </div>

            {borrador.modalidadCreditos !== "ILIMITADO" ? (
              <div className="space-y-1.5">
                <Label htmlFor="plan-creditos">
                  {metaModalidadFormulario.labelCreditos}
                </Label>
                <Input
                  id="plan-creditos"
                  data-testid="input-plan-creditos"
                  type="number"
                  min="1"
                  placeholder="3"
                  value={borrador.creditosPorPeriodo}
                  aria-invalid={Boolean(erroresForm.creditosPorPeriodo)}
                  className="tabular-nums"
                  onChange={(event) =>
                    actualizarCampo("creditosPorPeriodo", event.target.value)
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {metaModalidadFormulario.hint}
                </p>
                {erroresForm.creditosPorPeriodo ? (
                  <p role="alert" className="text-xs text-[#FF6D6D]">
                    {erroresForm.creditosPorPeriodo}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5 rounded-2xl border border-border bg-secondary p-4">
              <span className="text-xs font-medium text-[#18FFC8]">
                Así lo entenderá recepción y el atleta
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {notaPrecioPreview}
                {textoPreview}
              </p>
            </div>
          </form>
        </SideDrawer>
      ) : null}
    </div>
  );
}
