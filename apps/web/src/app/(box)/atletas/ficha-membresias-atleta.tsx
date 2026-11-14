"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Plus,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  MEDIOS_PAGO,
  calcularSaldoMembresia,
  obtenerFechaLocal,
  type MedioPago,
  type Membresia,
  type PagoConRegistrador,
  type Plan
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ajustarCreditosExtraAction,
  ajustarPrecioMembresiaAction,
  anularPagoAction,
  asignarMembresiaAction,
  bajaAnticipadaAction,
  registrarPagoAction,
  type ResultadoAccion
} from "@/lib/actions";
import { formatearMoneda } from "@/lib/utils";
import {
  clasificarEstadoMembresia,
  formatearCondicionesMembresia,
  formatearMedioPagoHumano,
  traducirErrorAtleta,
  type EstadoMembresiaPrincipal
} from "./atletas-estado";

interface FichaMembresiasAtletaProps {
  boxId: string;
  moneda: string;
  afiliacionId: string;
  planes: Plan[];
  membresias: Membresia[];
  pagosPorMembresia?: Record<string, PagoConRegistrador[]>;
  esAdministrador: boolean;
  fechaHoyBox?: string;
}

export function AlertaOperacionAtletas({
  tipo,
  mensaje,
  testId
}: {
  tipo: "error" | "exito";
  mensaje: string;
  testId?: string;
}) {
  const esError = tipo === "error";
  return (
    <div
      data-testid={testId}
      role={esError ? "alert" : "status"}
      className={
        esError
          ? "flex items-start gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-4 py-3 text-sm text-[#FF6D6D]"
          : "flex items-center gap-2.5 rounded-2xl border border-[#18FFC8]/28 bg-[#18FFC8]/14 px-4 py-3 text-sm text-[#18FFC8]"
      }
    >
      {esError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{mensaje}</span>
    </div>
  );
}

const BADGE_ESTADO_MEMBRESIA: Record<
  Exclude<EstadoMembresiaPrincipal, "SIN_MEMBRESIA">,
  { label: string; variant: "mint" | "amber" | "coral" | "zinc" }
> = {
  VIGENTE: { label: "Vigente", variant: "mint" },
  FUTURA: { label: "Futura", variant: "amber" },
  BAJA_ANTICIPADA: { label: "Baja anticipada", variant: "zinc" },
  VENCIDA: { label: "Vencida", variant: "zinc" }
};

export function FichaMembresiasAtleta({
  boxId,
  moneda,
  afiliacionId,
  planes,
  membresias,
  pagosPorMembresia = {},
  esAdministrador,
  fechaHoyBox = obtenerFechaLocal(new Date(), "America/Argentina/Buenos_Aires")
}: FichaMembresiasAtletaProps) {
  const router = useRouter();
  const planesActivos = planes.filter((plan) => plan.activo);
  const [planId, setPlanId] = useState(planesActivos[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState(fechaHoyBox);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const saldoTotalAtleta = membresias.reduce((acc, m) => {
    const pagosMembresia = pagosPorMembresia[m.id] ?? [];
    return acc + calcularSaldoMembresia(m.precio, pagosMembresia);
  }, 0);

  const esMoroso = saldoTotalAtleta > 0;

  function ejecutar(
    accion: () => Promise<ResultadoAccion>,
    mensajeExito?: string
  ) {
    setErrorMsg(null);
    setExitoMsg(null);
    startTransition(async () => {
      const res = await accion();
      if (!res.ok) {
        setErrorMsg(traducirErrorAtleta(res.errorCode, res.message));
        return;
      }
      if (mensajeExito) {
        setExitoMsg(mensajeExito);
      }
      router.refresh();
    });
  }

  function handleAsignar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(
      () =>
        asignarMembresiaAction(boxId, { afiliacionId, planId, fechaInicio }),
      "Membresía asignada correctamente."
    );
  }

  return (
    <div
      className="space-y-5 border-t border-border pt-5"
      data-testid="seccion-membresias"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground">
            Membresías y pagos
          </h3>
          {esMoroso ? (
            <Badge variant="coral" data-testid="badge-moroso">
              Moroso
            </Badge>
          ) : null}
        </div>

        {saldoTotalAtleta > 0 ? (
          <span className="text-sm text-[#FF6D6D]">
            Deuda total:{" "}
            <strong className="font-semibold tabular-nums" data-testid="atleta-saldo-total">
              {formatearMoneda(saldoTotalAtleta, moneda)}
            </strong>
          </span>
        ) : null}
      </div>

      {errorMsg ? (
        <AlertaOperacionAtletas
          tipo="error"
          mensaje={errorMsg}
          testId="alerta-error-membresias"
        />
      ) : null}

      {exitoMsg ? (
        <AlertaOperacionAtletas tipo="exito" mensaje={exitoMsg} />
      ) : null}

      <form
        onSubmit={handleAsignar}
        className="space-y-3 rounded-2xl border border-border bg-secondary p-4"
        data-testid="form-asignar-membresia"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Asignar o renovar plan</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="membresia-plan">Plan del catálogo</Label>
            <Select
              id="membresia-plan"
              data-testid="select-plan-membresia"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              disabled={isPending || planesActivos.length === 0}
            >
              {planesActivos.length === 0 ? (
                <option value="">No hay planes activos disponibles</option>
              ) : (
                planesActivos.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} — {formatearMoneda(plan.precioBase, moneda)}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="membresia-fecha-inicio">Inicio de vigencia</Label>
            <Input
              id="membresia-fecha-inicio"
              type="date"
              data-testid="input-fecha-inicio-membresia"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              disabled={isPending}
              className="tabular-nums"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            data-testid="btn-asignar-membresia"
            disabled={isPending || !planId}
          >
            {isPending ? "Guardando..." : "Asignar membresía"}
          </Button>
        </div>
      </form>

      {membresias.length === 0 ? (
        <div className="rounded-2xl border border-border bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
          Este atleta todavía no tiene membresías asignadas en el Box.
        </div>
      ) : (
        <ul className="space-y-4">
          {membresias.map((membresia) => {
            const nombrePlan =
              planes.find((p) => p.id === membresia.planId)?.nombre ??
              "Plan asignado";
            return (
              <FilaMembresia
                key={membresia.id}
                boxId={boxId}
                moneda={moneda}
                nombrePlan={nombrePlan}
                membresia={membresia}
                pagos={pagosPorMembresia[membresia.id] ?? []}
                esAdministrador={esAdministrador}
                deshabilitado={isPending}
                fechaHoyBox={fechaHoyBox}
                ejecutar={ejecutar}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface FilaMembresiaProps {
  boxId: string;
  moneda: string;
  nombrePlan: string;
  membresia: Membresia;
  pagos: PagoConRegistrador[];
  esAdministrador: boolean;
  deshabilitado: boolean;
  fechaHoyBox: string;
  ejecutar: (
    accion: () => Promise<ResultadoAccion>,
    mensajeExito?: string
  ) => void;
}

function FilaMembresia({
  boxId,
  moneda,
  nombrePlan,
  membresia,
  pagos,
  esAdministrador,
  deshabilitado,
  fechaHoyBox,
  ejecutar
}: FilaMembresiaProps) {
  const [creditosExtra, setCreditosExtra] = useState(
    String(membresia.creditosExtra)
  );
  const [precio, setPrecio] = useState(String(membresia.precio));
  const [fechaBaja, setFechaBaja] = useState("");

  const saldo = calcularSaldoMembresia(membresia.precio, pagos);
  const totalPagado = pagos
    .filter((p) => !p.anuladoEn)
    .reduce((acc, p) => acc + p.monto, 0);

  const [montoPago, setMontoPago] = useState(saldo > 0 ? String(saldo) : "");
  const [medioPago, setMedioPago] = useState<MedioPago>("EFECTIVO");
  const [fechaPago, setFechaPago] = useState(fechaHoyBox);

  const [anulandoPagoId, setAnulandoPagoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  const estadoMembresia = clasificarEstadoMembresia(membresia, fechaHoyBox);
  const badgeEstado = BADGE_ESTADO_MEMBRESIA[estadoMembresia];

  function handleRegistrarPago(e: React.FormEvent) {
    e.preventDefault();
    if (!montoPago || Number(montoPago) <= 0) return;

    ejecutar(
      () =>
        registrarPagoAction(boxId, {
          membresiaId: membresia.id,
          monto: Number(montoPago),
          medioPago,
          fechaPago
        }),
      "Pago registrado en caja."
    );
    setMontoPago("");
  }

  return (
    <li
      data-testid="fila-membresia"
      className="space-y-4 rounded-2xl border border-border bg-secondary p-4 text-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="font-medium text-foreground">{nombrePlan}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
            <span>
              Vigencia:{" "}
              <span data-testid="membresia-fecha-inicio">
                {membresia.fechaInicio}
              </span>{" "}
              al{" "}
              <span data-testid="membresia-fecha-fin">
                {membresia.fechaFin}
              </span>
            </span>
            <span>·</span>
            <span data-testid="membresia-condiciones">
              {formatearCondicionesMembresia(membresia)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={badgeEstado.variant}>{badgeEstado.label}</Badge>
          {membresia.bajaAnticipadaEn && estadoMembresia !== "BAJA_ANTICIPADA" ? (
            <Badge variant="coral">Baja anticipada</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
          <span className="block text-xs text-muted-foreground">Precio</span>
          <strong
            className="text-base font-medium text-foreground tabular-nums"
            data-testid="membresia-precio"
            data-precio={membresia.precio}
          >
            {formatearMoneda(membresia.precio, moneda)}
          </strong>
        </div>
        <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
          <span className="block text-xs text-muted-foreground">
            Saldo pendiente
          </span>
          <strong
            className={`text-base font-medium tabular-nums ${saldo > 0 ? "text-[#FF6D6D]" : "text-[#18FFC8]"}`}
            data-testid="membresia-saldo"
            data-saldo={saldo}
          >
            {formatearMoneda(saldo, moneda)}
          </strong>
        </div>
        <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
          <span className="block text-xs text-muted-foreground">
            Créditos extra
          </span>
          <strong
            className="text-base font-medium text-foreground tabular-nums"
            data-testid="membresia-creditos-extra"
          >
            {membresia.creditosExtra}
          </strong>
        </div>
      </div>

      {/* Sección Contable: Pagos y Caja */}
      <div
        className="space-y-3 rounded-2xl border border-border bg-card p-3.5"
        data-testid="seccion-pagos-membresia"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>Caja y pagos</span>
          </span>
          <span className="text-muted-foreground">
            Total pagado:{" "}
            <strong className="font-medium text-foreground tabular-nums">
              {formatearMoneda(totalPagado, moneda)}
            </strong>
          </span>
        </div>

        <form
          onSubmit={handleRegistrarPago}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          data-testid="form-registrar-pago"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`pago-monto-${membresia.id}`}>Monto del pago</Label>
            <Input
              id={`pago-monto-${membresia.id}`}
              type="number"
              min={1}
              data-testid="input-monto-pago"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
              placeholder="Ej. 15000"
              required
              disabled={deshabilitado}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`pago-medio-${membresia.id}`}>Medio de pago</Label>
            <Select
              id={`pago-medio-${membresia.id}`}
              data-testid="select-medio-pago"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPago)}
              disabled={deshabilitado}
            >
              {MEDIOS_PAGO.map((medio) => (
                <option key={medio} value={medio}>
                  {formatearMedioPagoHumano(medio)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`pago-fecha-${membresia.id}`}>Fecha de pago</Label>
            <Input
              id={`pago-fecha-${membresia.id}`}
              type="date"
              data-testid="input-fecha-pago"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              required
              disabled={deshabilitado}
              className="tabular-nums"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              data-testid="btn-registrar-pago"
              disabled={deshabilitado || !montoPago}
              className="w-full"
            >
              Registrar pago
            </Button>
          </div>
        </form>

        {pagos.length > 0 ? (
          <ul className="space-y-2" data-testid="lista-pagos-membresia">
            {pagos.map((pago) => {
              const estaAnulado = pago.anuladoEn !== null;
              return (
                <li
                  key={pago.id}
                  data-testid="item-pago"
                  className="flex flex-col gap-2.5 rounded-xl border border-border bg-secondary p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="font-medium text-foreground tabular-nums"
                        data-testid="pago-monto"
                      >
                        {formatearMoneda(pago.monto, moneda)}
                      </span>
                      <span
                        className="text-xs text-muted-foreground"
                        data-testid="pago-medio"
                      >
                        {formatearMedioPagoHumano(pago.medioPago)}
                      </span>
                      <span
                        className="text-xs text-muted-foreground tabular-nums"
                        data-testid="pago-fecha"
                      >
                        {pago.fechaPago}
                      </span>
                      {pago.registradoPorNombre ? (
                        <span
                          className="text-xs text-muted-foreground"
                          data-testid="pago-registrado-por"
                        >
                          por {pago.registradoPorNombre}
                        </span>
                      ) : null}
                    </div>

                    {estaAnulado ? (
                      <Badge variant="coral" data-testid="badge-pago-anulado">
                        Anulado:{" "}
                        <span data-testid="pago-motivo-anulacion">
                          {pago.motivoAnulacion}
                        </span>
                      </Badge>
                    ) : esAdministrador && anulandoPagoId !== pago.id ? (
                      <Button
                        type="button"
                        variant="destructive"
                        data-testid={`btn-anular-pago-${pago.id}`}
                        disabled={deshabilitado}
                        onClick={() => {
                          setAnulandoPagoId(pago.id);
                          setMotivoAnulacion("");
                        }}
                      >
                        Anular
                      </Button>
                    ) : null}
                  </div>

                  {!estaAnulado && esAdministrador && anulandoPagoId === pago.id ? (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
                      <Input
                        type="text"
                        aria-label="Motivo de anulación"
                        placeholder="Indicá el motivo de anulación..."
                        value={motivoAnulacion}
                        onChange={(e) => setMotivoAnulacion(e.target.value)}
                        data-testid="input-motivo-anulacion"
                        className="min-w-[180px] flex-1"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        data-testid="btn-confirmar-anulacion"
                        disabled={deshabilitado || motivoAnulacion.trim().length < 3}
                        onClick={() => {
                          ejecutar(
                            () =>
                              anularPagoAction(boxId, pago.id, {
                                motivoAnulacion
                              }),
                            "Pago anulado y saldo recalculado."
                          );
                          setAnulandoPagoId(null);
                          setMotivoAnulacion("");
                        }}
                      >
                        Confirmar anulación
                      </Button>
                      <Button
                        type="button"
                        variant="iconCircle"
                        aria-label="Cancelar anulación"
                        onClick={() => {
                          setAnulandoPagoId(null);
                          setMotivoAnulacion("");
                        }}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Todavía no hay pagos asentados para esta membresía.
          </p>
        )}
      </div>

      {/* Ajustes operativos y administrativos */}
      <details
        open
        className="group rounded-2xl border border-border bg-card"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-xs font-medium text-muted-foreground select-none hover:text-foreground">
          <span>Ajustes de créditos, precio y baja anticipada</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 border-t border-border p-3.5">

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-[120px] flex-1 space-y-1.5">
            <Label htmlFor={`cred-extra-${membresia.id}`}>Créditos extra</Label>
            <Input
              id={`cred-extra-${membresia.id}`}
              type="number"
              data-testid="input-creditos-extra"
              value={creditosExtra}
              onChange={(e) => setCreditosExtra(e.target.value)}
              disabled={deshabilitado}
              className="tabular-nums"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            data-testid="btn-guardar-creditos-extra"
            disabled={deshabilitado}
            onClick={() =>
              ejecutar(
                () =>
                  ajustarCreditosExtraAction(boxId, membresia.id, {
                    creditosExtra: Number(creditosExtra)
                  }),
                "Créditos extra actualizados."
              )
            }
          >
            Ajustar créditos
          </Button>
        </div>

        {esAdministrador ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="min-w-[140px] flex-1 space-y-1.5">
                <Label htmlFor={`precio-mem-${membresia.id}`}>
                  Ajustar precio ({moneda})
                </Label>
                <Input
                  id={`precio-mem-${membresia.id}`}
                  type="number"
                  min={0}
                  data-testid="input-precio-membresia"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  disabled={deshabilitado}
                  className="tabular-nums"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                data-testid="btn-guardar-precio-membresia"
                disabled={deshabilitado}
                onClick={() =>
                  ejecutar(
                    () =>
                      ajustarPrecioMembresiaAction(boxId, membresia.id, {
                        precio: Number(precio)
                      }),
                    "Precio de membresía actualizado."
                  )
                }
              >
                Ajustar precio
              </Button>
            </div>

            {!membresia.bajaAnticipadaEn ? (
              <div className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-[160px] flex-1 space-y-1.5">
                  <Label htmlFor={`fecha-baja-${membresia.id}`}>
                    Fin de vigencia tras baja anticipada
                  </Label>
                  <Input
                    id={`fecha-baja-${membresia.id}`}
                    type="date"
                    data-testid="input-fecha-baja"
                    value={fechaBaja}
                    onChange={(e) => setFechaBaja(e.target.value)}
                    disabled={deshabilitado}
                    className="tabular-nums"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="btn-baja-anticipada"
                  disabled={deshabilitado}
                  onClick={() =>
                    ejecutar(
                      () =>
                        bajaAnticipadaAction(boxId, membresia.id, {
                          fechaFin: fechaBaja
                        }),
                      "Baja anticipada aplicada."
                    )
                  }
                >
                  Baja anticipada
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ajustar precios, anular pagos o ejecutar bajas anticipadas está reservado a Administración.
          </p>
        )}
        </div>
      </details>
    </li>
  );
}
