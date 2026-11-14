"use client";

import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Search
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { type Moroso, type PagoConRegistrador } from "@centris/shared";
import { AccesoRestringidoCard } from "@/components/ui/acceso-restringido-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FilterChips,
  type FilterChipOption
} from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SideDrawer } from "@/components/ui/side-drawer";
import { cn, formatearMoneda } from "@/lib/utils";
import {
  calcularKpisCaja,
  construirUrlFichaAtleta,
  filtrarAuditoriaCaja,
  filtrarMorososCaja,
  formatearMedioPagoCaja,
  procesarAnulacionPago,
  type FiltroEstadoAuditoria,
  type FiltroMedioPagoAuditoria
} from "./caja-estado";

export type TabCaja = "morosos" | "auditoria";

export interface PanelCajaMorososProps {
  boxId: string;
  moneda: string;
  esAdministrador: boolean;
  morososIniciales: Moroso[];
  pagosIniciales: PagoConRegistrador[];
  tabInicial?: TabCaja;
  pagoParaAnularInicial?: PagoConRegistrador | null;
}

const FORM_ANULACION_ID = "form-anular-pago-caja";

/**
 * Vista accesible cuando el usuario no posee permisos de Recepción o Administración.
 */
export function AccesoRestringidoCaja({ nombreBox }: { nombreBox: string }) {
  return (
    <div role="alert">
      <AccesoRestringidoCard
        headingAs="h1"
        titulo="Acceso restringido a Recepción y Administración"
        badgeLabel="Permiso requerido"
        descripcion={`Tu afiliación en ${nombreBox} no posee permisos de Recepción o Administración para consultar o gestionar la Caja y el Reporte de Morosos.`}
      />
    </div>
  );
}

function TarjetaKpiCaja({
  etiqueta,
  valor,
  valorTestId,
  valorClassName,
  badgeLabel,
  badgeVariant,
  badgeClassName,
  pie
}: {
  etiqueta: string;
  valor: string;
  valorTestId?: string;
  valorClassName?: string;
  badgeLabel: string;
  badgeVariant: "mint" | "amber" | "coral";
  badgeClassName?: string;
  pie: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <strong
            data-testid={valorTestId}
            className={cn(
              "text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground tabular-nums",
              valorClassName
            )}
          >
            {valor}
          </strong>
          <Badge
            variant={badgeVariant}
            className={cn(
              "max-w-full whitespace-normal text-left",
              badgeClassName
            )}
          >
            {badgeLabel}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{pie}</span>
      </div>
    </Card>
  );
}

function FilaMorosoCaja({
  moroso,
  moneda
}: {
  moroso: Moroso;
  moneda: string;
}) {
  return (
    <article
      data-testid="fila-moroso"
      className="grid min-w-0 grid-cols-1 items-center gap-3.5 rounded-2xl border border-border bg-secondary p-4 transition-colors hover:border-[#32343B] lg:grid-cols-[minmax(0,1fr)_170px_auto] lg:gap-4"
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <strong
            data-testid="moroso-nombre"
            className="truncate text-base font-medium text-foreground"
          >
            {moroso.nombre}
          </strong>
          <Badge variant="coral" data-testid="badge-moroso">
            Moroso
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{moroso.email}</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {moroso.membresiasConDeuda.map((m) => (
            <span
              key={m.membresiaId}
              className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground tabular-nums"
            >
              {m.nombrePlan}: debe{" "}
              <strong className="font-semibold text-[#FF6D6D] tabular-nums">
                {formatearMoneda(m.saldo, moneda)}
              </strong>{" "}
              (Precio {formatearMoneda(m.precio, moneda)} − Pagado{" "}
              {formatearMoneda(m.totalPagado, moneda)})
            </span>
          ))}
        </div>
      </div>

      <div className="text-left lg:text-right">
        <span className="block text-xs text-muted-foreground">Deuda total</span>
        <strong
          data-testid="moroso-total-deuda"
          className="text-xl font-medium text-[#FF6D6D] tabular-nums"
        >
          {formatearMoneda(moroso.totalDeuda, moneda)}
        </strong>
      </div>

      <div className="flex flex-wrap justify-start lg:justify-end">
        <Link
          href={construirUrlFichaAtleta(moroso.afiliacionId)}
          data-testid="btn-ver-atleta"
          className={buttonClassName("secondary")}
        >
          <span>Abrir ficha y cobrar</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function FilaAuditoriaPago({
  pago,
  moneda,
  esAdministrador,
  onAnular
}: {
  pago: PagoConRegistrador;
  moneda: string;
  esAdministrador: boolean;
  onAnular: (pago: PagoConRegistrador) => void;
}) {
  const estaAnulado = pago.anuladoEn !== null;

  return (
    <article
      data-testid="fila-auditoria-pago"
      className="audit-row grid min-w-0 grid-cols-2 items-start gap-x-4 gap-y-3 rounded-2xl border border-border bg-secondary p-4 transition-colors hover:border-[#32343B] min-[1080px]:grid-cols-[108px_128px_136px_minmax(150px,1fr)_176px_124px] min-[1080px]:items-center min-[1080px]:gap-3.5 min-[1080px]:px-4 min-[1080px]:py-3.5"
    >
      <div className="order-2 text-right min-[1080px]:order-none min-[1080px]:text-left">
        <span className="mb-1 block text-xs text-muted-foreground min-[1080px]:hidden">
          Fecha
        </span>
        <span className="text-sm text-foreground tabular-nums">
          {pago.fechaPago}
        </span>
      </div>

      <div className="order-1 min-[1080px]:order-none">
        <span className="mb-1 block text-xs text-muted-foreground min-[1080px]:hidden">
          Monto
        </span>
        <strong className="text-lg font-semibold text-foreground tabular-nums min-[1080px]:text-[0.9375rem]">
          {formatearMoneda(pago.monto, moneda)}
        </strong>
      </div>

      <div className="order-4 flex flex-col items-end text-right min-[1080px]:order-none min-[1080px]:items-start min-[1080px]:text-left">
        <span className="mb-1 block text-xs text-muted-foreground min-[1080px]:hidden">
          Medio
        </span>
        <Badge variant="zinc">{formatearMedioPagoCaja(pago.medioPago)}</Badge>
      </div>

      <div className="order-3 min-w-0 min-[1080px]:order-none">
        <span className="mb-1 block text-xs text-muted-foreground min-[1080px]:hidden">
          Registrado por
        </span>
        <span className="block truncate text-sm text-foreground">
          {pago.registradoPorNombre ?? "Usuario del Box"}
        </span>
      </div>

      <div className="audit-footer-pair order-5 col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 border-t border-border pt-3 min-[1080px]:contents">
        <div className="min-w-0 flex-1 space-y-1 min-[1080px]:flex-initial">
          <span className="mb-1 block text-xs text-muted-foreground min-[1080px]:hidden">
            Estado
          </span>
          {estaAnulado ? (
            <div className="space-y-1">
              <Badge variant="coral" data-testid="badge-pago-anulado">
                Anulado
              </Badge>
              {pago.motivoAnulacion ? (
                <span
                  data-testid="pago-motivo-anulacion"
                  className="block text-xs leading-snug text-muted-foreground"
                >
                  {pago.motivoAnulacion}
                </span>
              ) : null}
            </div>
          ) : (
            <Badge variant="mint">Válido</Badge>
          )}
        </div>

        <div className="flex shrink-0 justify-end">
          {!estaAnulado && esAdministrador ? (
            <Button
              type="button"
              variant="destructive"
              data-testid={`btn-anular-pago-${pago.id}`}
              onClick={() => onAnular(pago)}
            >
              Anular
            </Button>
          ) : (
            <span className="hidden text-xs text-muted-foreground min-[1080px]:inline">
              Sin acciones
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Panel principal de Caja, Reporte de Morosos y Auditoría inmutable de Pagos en Dark Bento Cockpit.
 */
export function PanelCajaMorosos({
  boxId,
  moneda,
  esAdministrador,
  morososIniciales,
  pagosIniciales,
  tabInicial = "morosos",
  pagoParaAnularInicial = null
}: PanelCajaMorososProps) {
  const router = useRouter();
  const [tabActiva, setTabActiva] = useState<TabCaja>(
    esAdministrador ? tabInicial : "morosos"
  );
  const [busquedaMorosos, setBusquedaMorosos] = useState("");
  const [busquedaAuditoria, setBusquedaAuditoria] = useState("");
  const [filtroEstadoAuditoria, setFiltroEstadoAuditoria] =
    useState<FiltroEstadoAuditoria>("TODOS");
  const [filtroMedioAuditoria, setFiltroMedioAuditoria] =
    useState<FiltroMedioPagoAuditoria>("TODOS");

  const [pagoParaAnular, setPagoParaAnular] =
    useState<PagoConRegistrador | null>(pagoParaAnularInicial);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const kpis = useMemo(
    () => calcularKpisCaja(morososIniciales, pagosIniciales),
    [morososIniciales, pagosIniciales]
  );

  const morososFiltrados = useMemo(
    () => filtrarMorososCaja(morososIniciales, busquedaMorosos),
    [morososIniciales, busquedaMorosos]
  );

  const pagosFiltrados = useMemo(
    () =>
      filtrarAuditoriaCaja(pagosIniciales, {
        busqueda: busquedaAuditoria,
        estado: filtroEstadoAuditoria,
        medioPago: filtroMedioAuditoria
      }),
    [
      pagosIniciales,
      busquedaAuditoria,
      filtroEstadoAuditoria,
      filtroMedioAuditoria
    ]
  );

  const opcionesEstadoAuditoria: readonly FilterChipOption<FiltroEstadoAuditoria>[] =
    [
      {
        value: "TODOS",
        label: "Todos",
        count: kpis.totalPagos,
        testId: "filtro-auditoria-estado-todos"
      },
      {
        value: "VALIDOS",
        label: "Válidos",
        count: kpis.cantidadPagosValidos,
        testId: "filtro-auditoria-estado-validos"
      },
      {
        value: "ANULADOS",
        label: "Anulados",
        count: kpis.cantidadPagosAnulados,
        testId: "filtro-auditoria-estado-anulados"
      }
    ];

  const opcionesMedioAuditoria: readonly FilterChipOption<FiltroMedioPagoAuditoria>[] =
    [
      {
        value: "TODOS",
        label: "Todos los medios",
        testId: "filtro-auditoria-medio-todos"
      },
      {
        value: "TRANSFERENCIA",
        label: "Transferencia",
        testId: "filtro-auditoria-medio-transferencia"
      },
      {
        value: "EFECTIVO",
        label: "Efectivo",
        testId: "filtro-auditoria-medio-efectivo"
      },
      {
        value: "OTRO",
        label: "Otro",
        testId: "filtro-auditoria-medio-otro"
      }
    ];

  function abrirDrawerAnulacion(pago: PagoConRegistrador) {
    setErrorAnulacion(null);
    setExitoMsg(null);
    setMotivoAnulacion("");
    setPagoParaAnular(pago);
  }

  function cerrarDrawerAnulacion() {
    setPagoParaAnular(null);
    setMotivoAnulacion("");
    setErrorAnulacion(null);
  }

  function handleAnularPago(e: React.FormEvent) {
    e.preventDefault();
    if (!pagoParaAnular) return;

    setErrorAnulacion(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await procesarAnulacionPago(
        boxId,
        pagoParaAnular.id,
        motivoAnulacion
      );

      if (!res.ok) {
        setErrorAnulacion(res.error);
        return;
      }

      setExitoMsg(res.mensajeExito);
      cerrarDrawerAnulacion();
      router.refresh();
    });
  }

  const labelSplitPagos = `${kpis.cantidadPagosValidos} válidos · ${kpis.cantidadPagosAnulados} ${
    kpis.cantidadPagosAnulados === 1 ? "anulado" : "anulados"
  }`;

  return (
    <div className="space-y-6" data-testid="panel-caja-morosos">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
            Caja y seguimiento de deuda
          </h1>
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            Controlá saldos pendientes de atletas y revisá el historial completo
            de cobros del Box.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Vistas de caja"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === "morosos"}
            data-testid="tab-morosos"
            onClick={() => setTabActiva("morosos")}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tabActiva === "morosos"
                ? "border-transparent bg-primary text-primary-foreground font-semibold"
                : "border-border bg-card text-muted-foreground font-medium hover:border-[#3A3C42] hover:text-foreground"
            )}
          >
            <span>Atletas con deuda</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                tabActiva === "morosos"
                  ? "bg-black/15 text-black"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {kpis.cantidadMorosos}
            </span>
          </button>

          {esAdministrador ? (
            <button
              type="button"
              role="tab"
              aria-selected={tabActiva === "auditoria"}
              data-testid="tab-auditoria"
              onClick={() => setTabActiva("auditoria")}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tabActiva === "auditoria"
                  ? "border-transparent bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-card text-muted-foreground font-medium hover:border-[#3A3C42] hover:text-foreground"
              )}
            >
              <span>Auditoría de caja</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  tabActiva === "auditoria"
                    ? "bg-black/15 text-black"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {kpis.totalPagos}
              </span>
            </button>
          ) : null}
        </div>
      </header>

      {!esAdministrador ? (
        <div
          data-testid="banner-alcance-recepcion"
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#FBBF24]/28 bg-[#FBBF24]/14 px-4 py-3 text-sm text-[#FDE68A]"
        >
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[#FBBF24]"
            aria-hidden="true"
          />
          <span>
            <strong>Vista de Recepción:</strong> podés consultar atletas con
            saldo pendiente y abrir su ficha para registrar cobros. La auditoría
            de movimientos y anulación de pagos es exclusiva de Administración.
          </span>
        </div>
      ) : null}

      {/* KPIs Bento */}
      <section
        aria-label="Resumen de caja"
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          esAdministrador && "lg:grid-cols-3"
        )}
      >
        <TarjetaKpiCaja
          etiqueta="Saldo total pendiente"
          valor={formatearMoneda(kpis.deudaTotalPendiente, moneda)}
          valorTestId="total-deuda-acumulada"
          valorClassName="text-[#FF6D6D]"
          badgeLabel="Por cobrar"
          badgeVariant="coral"
          pie="Membresías vigentes y vencidas con saldo mayor a cero"
        />

        <TarjetaKpiCaja
          etiqueta="Atletas con saldo pendiente"
          valor={String(kpis.cantidadMorosos)}
          valorTestId="cantidad-atletas-morosos"
          badgeLabel="Seguimiento"
          badgeVariant="amber"
          pie="Acceso directo a la ficha para registrar pagos"
        />

        {esAdministrador ? (
          <TarjetaKpiCaja
            etiqueta="Ingresos válidos en auditoría"
            valor={formatearMoneda(kpis.ingresosValidos, moneda)}
            valorTestId="total-ingresos-validos"
            valorClassName="text-[#18FFC8]"
            badgeLabel={labelSplitPagos}
            badgeVariant="mint"
            badgeClassName="tabular-nums"
            pie="Excluye movimientos anulados"
          />
        ) : null}
      </section>

      {exitoMsg ? (
        <div
          data-testid="alerta-exito-caja"
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-[#18FFC8]/28 bg-[#18FFC8]/14 px-4 py-3 text-sm text-[#18FFC8]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      {/* Vista Morosos / Auditoría */}
      {tabActiva === "morosos" ? (
        <Card className="space-y-5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground">
                Atletas con saldo pendiente
              </h2>
              <p className="text-sm text-muted-foreground">
                Revisá el detalle de cada membresía adeudada y abrí su ficha
                para regularizar el pago.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Buscar atleta con deuda"
                placeholder="Buscar por nombre o email..."
                value={busquedaMorosos}
                onChange={(e) => setBusquedaMorosos(e.target.value)}
                data-testid="input-buscar-moroso"
                className="rounded-full pl-10 text-base"
              />
            </div>
          </div>

          {morososFiltrados.length === 0 ? (
            <div
              data-testid="msg-sin-morosos"
              className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground"
            >
              {morososIniciales.length === 0
                ? "No hay atletas morosos en este momento."
                : "No hay atletas con deuda que coincidan con la búsqueda."}
            </div>
          ) : (
            <div className="space-y-3" data-testid="listado-morosos">
              {morososFiltrados.map((moroso) => (
                <FilaMorosoCaja
                  key={moroso.afiliacionId}
                  moroso={moroso}
                  moneda={moneda}
                />
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="space-y-5 p-6" data-testid="seccion-auditoria-caja">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground">
                Auditoría de cobros y anulaciones
              </h2>
              <p className="text-sm text-muted-foreground">
                Registro histórico inmutable de pagos ingresados en el Box.
                Anular un pago restaura el saldo en la membresía.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Buscar en auditoría"
                placeholder="Buscar por registrador o motivo..."
                value={busquedaAuditoria}
                onChange={(e) => setBusquedaAuditoria(e.target.value)}
                data-testid="input-buscar-auditoria"
                className="rounded-full pl-10 text-base"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips
              ariaLabel="Filtrar por estado de pago"
              options={opcionesEstadoAuditoria}
              value={filtroEstadoAuditoria}
              onChange={setFiltroEstadoAuditoria}
            />

            <FilterChips
              ariaLabel="Filtrar por medio de pago"
              options={opcionesMedioAuditoria}
              value={filtroMedioAuditoria}
              onChange={setFiltroMedioAuditoria}
            />
          </div>

          <div className="space-y-2.5" data-testid="tabla-auditoria-caja">
            <div
              aria-hidden="true"
              className="hidden border-b border-border px-4 pb-2 text-xs font-medium text-muted-foreground min-[1080px]:grid min-[1080px]:grid-cols-[108px_128px_136px_minmax(150px,1fr)_176px_124px] min-[1080px]:gap-3.5"
            >
              <span>Fecha</span>
              <span>Monto</span>
              <span>Medio</span>
              <span>Registrado por</span>
              <span>Estado</span>
              <span className="text-right">Acción</span>
            </div>

            {pagosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
                No hay movimientos para los filtros seleccionados.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pagosFiltrados.map((pago) => (
                  <FilaAuditoriaPago
                    key={pago.id}
                    pago={pago}
                    moneda={moneda}
                    esAdministrador={esAdministrador}
                    onAnular={abrirDrawerAnulacion}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <SideDrawer
        open={Boolean(pagoParaAnular)}
        onClose={cerrarDrawerAnulacion}
        title="Anular pago registrado"
        description="El comprobante queda marcado como anulado en auditoría y el importe vuelve al saldo pendiente."
        testId="modal-anular-pago"
        closeTestId="btn-cerrar-anular-pago"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={cerrarDrawerAnulacion}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_ANULACION_ID}
              variant="destructive"
              data-testid="btn-confirmar-anulacion"
              disabled={isPending || motivoAnulacion.trim().length < 3}
            >
              {isPending ? "Anulando..." : "Confirmar anulación"}
            </Button>
          </>
        }
      >
        {pagoParaAnular ? (
          <div className="space-y-5">
            <div className="space-y-2 rounded-2xl border border-border bg-secondary p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Monto del pago</span>
                <strong className="font-semibold text-foreground tabular-nums">
                  {formatearMoneda(pagoParaAnular.monto, moneda)}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Medio</span>
                <strong className="font-medium text-foreground">
                  {formatearMedioPagoCaja(pagoParaAnular.medioPago)}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-foreground tabular-nums">
                  {pagoParaAnular.fechaPago}
                </span>
              </div>
              {pagoParaAnular.registradoPorNombre ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Registrado por</span>
                  <span className="text-foreground">
                    {pagoParaAnular.registradoPorNombre}
                  </span>
                </div>
              ) : null}
            </div>

            <form
              id={FORM_ANULACION_ID}
              onSubmit={handleAnularPago}
              className="space-y-4"
              noValidate
            >
              {errorAnulacion ? (
                <div
                  data-testid="alerta-error-caja"
                  role="alert"
                  className="flex items-center gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-4 py-3 text-sm text-[#FF6D6D]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorAnulacion}</span>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="motivo-anulacion">
                  Motivo de anulación (obligatorio)
                </Label>
                <Input
                  id="motivo-anulacion"
                  data-testid="input-motivo-anulacion"
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Ej. Transferencia duplicada por error de carga"
                  required
                  disabled={isPending}
                  className="text-base"
                />
              </div>
            </form>
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}
