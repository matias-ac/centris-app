"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  calcularSaldoMembresia,
  type Membresia,
  type PagoConRegistrador,
  type Plan
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface FichaMembresiasAtletaProps {
  boxId: string;
  moneda: string;
  afiliacionId: string;
  planes: Plan[];
  membresias: Membresia[];
  pagosPorMembresia?: Record<string, PagoConRegistrador[]>;
  esAdministrador: boolean;
}

export function FichaMembresiasAtleta({
  boxId,
  moneda,
  afiliacionId,
  planes,
  membresias,
  pagosPorMembresia = {},
  esAdministrador
}: FichaMembresiasAtletaProps) {
  const router = useRouter();
  const planesActivos = planes.filter((plan) => plan.activo);
  const [planId, setPlanId] = useState(planesActivos[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const saldoTotalAtleta = membresias.reduce((acc, m) => {
    const pagosMembresia = pagosPorMembresia[m.id] ?? [];
    return acc + calcularSaldoMembresia(m.precio, pagosMembresia);
  }, 0);

  const esMoroso = saldoTotalAtleta > 0;

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await accion();
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      router.refresh();
    });
  }

  function handleAsignar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(() =>
      asignarMembresiaAction(boxId, { afiliacionId, planId, fechaInicio })
    );
  }

  return (
    <div className="space-y-4 border-t border-border pt-4" data-testid="seccion-membresias">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg uppercase tracking-tight text-foreground">
            Membresías
          </h3>
          {esMoroso ? (
            <Badge variant="rose" data-testid="badge-moroso">
              Moroso
            </Badge>
          ) : null}
        </div>

        {saldoTotalAtleta > 0 ? (
          <span className="text-xs text-rose-400">
            Deuda Total:{" "}
            <strong className="tabular-nums" data-testid="atleta-saldo-total">
              {formatearMoneda(saldoTotalAtleta, moneda)}
            </strong>
          </span>
        ) : null}
      </div>

      {errorMsg ? (
        <div
          data-testid="alerta-error-membresias"
          className="flex items-center gap-3 rounded-md border border-rose-500/30 bg-rose-500/15 p-3 text-sm text-rose-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <form
        onSubmit={handleAsignar}
        className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3"
        data-testid="form-asignar-membresia"
      >
        <div className="space-y-2">
          <Label htmlFor="membresia-plan">Plan</Label>
          <select
            id="membresia-plan"
            data-testid="select-plan-membresia"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            disabled={isPending}
            className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-base text-foreground sm:text-sm"
          >
            {planesActivos.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} — {formatearMoneda(plan.precioBase, moneda)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="membresia-fecha-inicio">Inicio de la Vigencia</Label>
          <Input
            id="membresia-fecha-inicio"
            type="date"
            data-testid="input-fecha-inicio-membresia"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
        <Button
          type="submit"
          data-testid="btn-asignar-membresia"
          disabled={isPending || !planId}
          className="bg-primary font-semibold text-primary-foreground hover:bg-volt-500"
        >
          {isPending ? "Guardando..." : "Asignar Membresía"}
        </Button>
      </form>

      {membresias.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          El Atleta no tiene Membresías asignadas.
        </p>
      ) : (
        <ul className="space-y-4">
          {membresias.map((membresia) => (
            <FilaMembresia
              key={membresia.id}
              boxId={boxId}
              moneda={moneda}
              membresia={membresia}
              pagos={pagosPorMembresia[membresia.id] ?? []}
              esAdministrador={esAdministrador}
              deshabilitado={isPending}
              ejecutar={ejecutar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface FilaMembresiaProps {
  boxId: string;
  moneda: string;
  membresia: Membresia;
  pagos: PagoConRegistrador[];
  esAdministrador: boolean;
  deshabilitado: boolean;
  ejecutar: (accion: () => Promise<ResultadoAccion>) => void;
}

function FilaMembresia({
  boxId,
  moneda,
  membresia,
  pagos,
  esAdministrador,
  deshabilitado,
  ejecutar
}: FilaMembresiaProps) {
  const [creditosExtra, setCreditosExtra] = useState(
    String(membresia.creditosExtra)
  );
  const [precio, setPrecio] = useState(String(membresia.precio));
  const [fechaBaja, setFechaBaja] = useState("");

  // Estados para nuevo pago
  const saldo = calcularSaldoMembresia(membresia.precio, pagos);
  const totalPagado = pagos
    .filter((p) => !p.anuladoEn)
    .reduce((acc, p) => acc + p.monto, 0);

  const [montoPago, setMontoPago] = useState(saldo > 0 ? String(saldo) : "");
  const [medioPago, setMedioPago] = useState<"EFECTIVO" | "TRANSFERENCIA" | "OTRO">("EFECTIVO");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));

  // Estado para anulación puntual
  const [anulandoPagoId, setAnulandoPagoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  function handleRegistrarPago(e: React.FormEvent) {
    e.preventDefault();
    if (!montoPago || Number(montoPago) <= 0) return;

    ejecutar(() =>
      registrarPagoAction(boxId, {
        membresiaId: membresia.id,
        monto: Number(montoPago),
        medioPago,
        fechaPago
      })
    );
    setMontoPago("");
  }

  return (
    <li
      data-testid="fila-membresia"
      className="space-y-3 rounded-md border border-border bg-card p-4 text-sm"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div>
          <span className="block text-xs text-muted-foreground">Inicio</span>
          <span className="tabular-nums" data-testid="membresia-fecha-inicio">
            {membresia.fechaInicio}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Fin</span>
          <span className="tabular-nums" data-testid="membresia-fecha-fin">
            {membresia.fechaFin}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Condiciones</span>
          <span className="tabular-nums" data-testid="membresia-condiciones">
            {membresia.modalidadCreditos === "ILIMITADO"
              ? "ILIMITADO"
              : `${membresia.creditosPorPeriodo} (${membresia.modalidadCreditos})`}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Precio</span>
          <span
            className="tabular-nums font-semibold"
            data-testid="membresia-precio"
            data-precio={membresia.precio}
          >
            {formatearMoneda(membresia.precio, moneda)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Saldo</span>
          <span
            className={`tabular-nums font-bold ${saldo > 0 ? "text-rose-400" : "text-emerald-400"}`}
            data-testid="membresia-saldo"
            data-saldo={saldo}
          >
            {formatearMoneda(saldo, moneda)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Créditos extra</span>
          <span className="tabular-nums" data-testid="membresia-creditos-extra">
            {membresia.creditosExtra}
          </span>
        </div>
      </div>

      {membresia.bajaAnticipadaEn ? (
        <Badge variant="rose">Baja Anticipada</Badge>
      ) : null}

      {/* Ajustes operativos (Créditos / Precio / Baja) */}
      <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-border/50">
        <div className="flex items-end gap-2">
          <Input
            type="number"
            aria-label="Créditos extra"
            data-testid="input-creditos-extra"
            value={creditosExtra}
            onChange={(e) => setCreditosExtra(e.target.value)}
            disabled={deshabilitado}
            className="w-24 h-8 text-base sm:text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            data-testid="btn-guardar-creditos-extra"
            disabled={deshabilitado}
            onClick={() =>
              ejecutar(() =>
                ajustarCreditosExtraAction(boxId, membresia.id, {
                  creditosExtra: Number(creditosExtra)
                })
              )
            }
            className="h-8 text-xs"
          >
            Ajustar créditos
          </Button>
        </div>

        {esAdministrador ? (
          <>
            <div className="flex items-end gap-2">
              <Input
                type="number"
                min={0}
                aria-label="Precio de la Membresía"
                data-testid="input-precio-membresia"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                disabled={deshabilitado}
                className="w-28 h-8 text-base sm:text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                data-testid="btn-guardar-precio-membresia"
                disabled={deshabilitado}
                onClick={() =>
                  ejecutar(() =>
                    ajustarPrecioMembresiaAction(boxId, membresia.id, {
                      precio: Number(precio)
                    })
                  )
                }
                className="h-8 text-xs"
              >
                Ajustar Precio
              </Button>
            </div>
            {!membresia.bajaAnticipadaEn ? (
              <div className="flex items-end gap-2">
                <Input
                  type="date"
                  aria-label="Fin de la Vigencia tras la Baja Anticipada"
                  data-testid="input-fecha-baja"
                  value={fechaBaja}
                  onChange={(e) => setFechaBaja(e.target.value)}
                  disabled={deshabilitado}
                  className="h-8 text-base sm:text-xs"
                />
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="btn-baja-anticipada"
                  disabled={deshabilitado}
                  onClick={() =>
                    ejecutar(() =>
                      bajaAnticipadaAction(boxId, membresia.id, {
                        fechaFin: fechaBaja
                      })
                    )
                  }
                  className="h-8 text-xs"
                >
                  Baja Anticipada
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Sección Contable: Pagos y Caja */}
      <div className="rounded-md border border-border/70 bg-secondary/20 p-3 space-y-3" data-testid="seccion-pagos-membresia">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
            Caja y Pagos
          </span>
          <span className="text-muted-foreground">
            Total pagado: <strong className="tabular-nums text-foreground">{formatearMoneda(totalPagado, moneda)}</strong>
          </span>
        </div>

        {/* Formulario para asentar un Pago */}
        <form
          onSubmit={handleRegistrarPago}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end pt-1"
          data-testid="form-registrar-pago"
        >
          <div>
            <Label htmlFor={`pago-monto-${membresia.id}`} className="text-xs">
              Monto del Pago
            </Label>
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
              className="h-9 text-base sm:text-xs"
            />
          </div>
          <div>
            <Label htmlFor={`pago-medio-${membresia.id}`} className="text-xs">
              Medio de Pago
            </Label>
            <select
              id={`pago-medio-${membresia.id}`}
              data-testid="select-medio-pago"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as "EFECTIVO" | "TRANSFERENCIA" | "OTRO")}
              disabled={deshabilitado}
              className="h-9 w-full rounded-md border border-border bg-secondary px-2 text-base text-foreground sm:text-xs"
            >
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>
          <div>
            <Label htmlFor={`pago-fecha-${membresia.id}`} className="text-xs">
              Fecha de Pago
            </Label>
            <Input
              id={`pago-fecha-${membresia.id}`}
              type="date"
              data-testid="input-fecha-pago"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              required
              disabled={deshabilitado}
              className="h-9 text-base sm:text-xs"
            />
          </div>
          <Button
            type="submit"
            data-testid="btn-registrar-pago"
            disabled={deshabilitado || !montoPago}
            className="h-9 text-xs bg-primary text-primary-foreground font-semibold hover:bg-volt-500"
          >
            Registrar Pago
          </Button>
        </form>

        {/* Historial inmutable de Pagos */}
        {pagos.length > 0 ? (
          <ul className="space-y-1.5" data-testid="lista-pagos-membresia">
            {pagos.map((pago) => {
              const estaAnulado = pago.anuladoEn !== null;
              return (
                <li
                  key={pago.id}
                  data-testid="item-pago"
                  className="flex flex-wrap items-center justify-between rounded border border-border bg-card p-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums" data-testid="pago-monto">
                      {formatearMoneda(pago.monto, moneda)}
                    </span>
                    <span className="text-muted-foreground" data-testid="pago-medio">
                      ({pago.medioPago})
                    </span>
                    <span className="tabular-nums text-muted-foreground" data-testid="pago-fecha">
                      {pago.fechaPago}
                    </span>
                    {pago.registradoPorNombre ? (
                      <span className="text-muted-foreground" data-testid="pago-registrado-por">
                        por {pago.registradoPorNombre}
                      </span>
                    ) : null}
                    {estaAnulado ? (
                      <Badge variant="rose" data-testid="badge-pago-anulado">
                        Anulado: <span data-testid="pago-motivo-anulacion">{pago.motivoAnulacion}</span>
                      </Badge>
                    ) : null}
                  </div>

                  {!estaAnulado && esAdministrador ? (
                    <div className="flex items-center gap-1">
                      {anulandoPagoId === pago.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            placeholder="Motivo de anulación..."
                            value={motivoAnulacion}
                            onChange={(e) => setMotivoAnulacion(e.target.value)}
                            data-testid="input-motivo-anulacion"
                            className="h-8 w-44 text-base sm:text-xs"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            data-testid="btn-confirmar-anulacion"
                            disabled={motivoAnulacion.trim().length < 3}
                            onClick={() => {
                              ejecutar(() =>
                                anularPagoAction(boxId, pago.id, { motivoAnulacion })
                              );
                              setAnulandoPagoId(null);
                              setMotivoAnulacion("");
                            }}
                            className="h-7 text-xs px-2 min-h-7"
                          >
                            Confirmar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setAnulandoPagoId(null);
                              setMotivoAnulacion("");
                            }}
                            className="h-7 text-xs px-2 min-h-7"
                          >
                            X
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          data-testid={`btn-anular-pago-${pago.id}`}
                          onClick={() => {
                            setAnulandoPagoId(pago.id);
                            setMotivoAnulacion("");
                          }}
                          className="h-7 text-xs px-2 min-h-7"
                        >
                          Anular
                        </Button>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No hay pagos registrados para esta Membresía.
          </p>
        )}
      </div>
    </li>
  );
}
