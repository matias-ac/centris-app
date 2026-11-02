"use client";

import { AlertCircle, CheckCircle, DollarSign, FileText, Search, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { type Moroso, type PagoConRegistrador } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { anularPagoAction } from "@/lib/actions";
import { formatearMoneda } from "@/lib/utils";

interface PanelCajaMorososProps {
  boxId: string;
  moneda: string;
  esAdministrador: boolean;
  morososIniciales: Moroso[];
  pagosIniciales: PagoConRegistrador[];
}

export function PanelCajaMorosos({
  boxId,
  moneda,
  esAdministrador,
  morososIniciales,
  pagosIniciales
}: PanelCajaMorososProps) {
  const router = useRouter();
  const [tabActiva, setTabActiva] = useState<"morosos" | "auditoria">("morosos");
  const [busquedaMorosos, setBusquedaMorosos] = useState("");
  const [pagoParaAnular, setPagoParaAnular] = useState<PagoConRegistrador | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const morososFiltrados = useMemo(() => {
    if (!busquedaMorosos.trim()) {
      return morososIniciales;
    }
    const termino = busquedaMorosos.toLowerCase();
    return morososIniciales.filter(
      (m) =>
        m.nombre.toLowerCase().includes(termino) ||
        m.email.toLowerCase().includes(termino)
    );
  }, [morososIniciales, busquedaMorosos]);

  const totalDeudaAcumulada = useMemo(() => {
    return morososIniciales.reduce((acc, m) => acc + m.totalDeuda, 0);
  }, [morososIniciales]);

  function handleAnularPago(e: React.FormEvent) {
    e.preventDefault();
    if (!pagoParaAnular) return;

    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await anularPagoAction(boxId, pagoParaAnular.id, {
        motivoAnulacion
      });

      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? "Error al anular el pago"}`);
        return;
      }

      setExitoMsg("El Pago fue anulado exitosamente y el saldo recalculado.");
      setPagoParaAnular(null);
      setMotivoAnulacion("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6" data-testid="panel-caja-morosos">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
            Caja y Reporte de Morosos
          </h1>
          <p className="text-sm text-muted-foreground">
            Control contable inmutable, seguimiento de saldos y auditoría de ingresos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tabActiva === "morosos" ? "default" : "secondary"}
            onClick={() => setTabActiva("morosos")}
            data-testid="tab-morosos"
            className="gap-2"
          >
            <ShieldAlert className="h-4 w-4" />
            Reporte de Morosos ({morososIniciales.length})
          </Button>

          {esAdministrador ? (
            <Button
              type="button"
              variant={tabActiva === "auditoria" ? "default" : "secondary"}
              onClick={() => setTabActiva("auditoria")}
              data-testid="tab-auditoria"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Auditoría de Caja
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda Total Exigible
            </CardTitle>
            <DollarSign className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div
              className="font-display text-3xl font-bold uppercase tracking-tight text-rose-400 tabular-nums"
              data-testid="total-deuda-acumulada"
            >
              {formatearMoneda(totalDeudaAcumulada, moneda)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma de saldos pendientes en Membresías no anuladas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atletas Morosos
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div
              className="font-display text-3xl font-bold uppercase tracking-tight text-foreground tabular-nums"
              data-testid="cantidad-atletas-morosos"
            >
              {morososIniciales.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atletas identificados como Morosos con Saldo &gt; 0
            </p>
          </CardContent>
        </Card>
      </div>

      {errorMsg ? (
        <div
          data-testid="alerta-error-caja"
          className="flex items-center gap-3 rounded-md border border-rose-500/30 bg-rose-500/15 p-3 text-sm text-rose-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {exitoMsg ? (
        <div
          data-testid="alerta-exito-caja"
          className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/15 p-3 text-sm text-emerald-400"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      {/* Modal / Formulario de Anulación de Pago */}
      {pagoParaAnular ? (
        <Card className="border-rose-500/40 bg-card shadow-md" data-testid="modal-anular-pago">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-display text-lg uppercase tracking-tight text-rose-400">
                Anular Pago Registrado
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                La Anulación es auditable e irreversible: el pago deja de restar en el Saldo.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                setPagoParaAnular(null);
                setMotivoAnulacion("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnularPago} className="space-y-4">
              <div className="rounded-md border border-border bg-secondary/50 p-3 text-xs space-y-1">
                <p>
                  <strong>Monto del Pago:</strong>{" "}
                  <span className="tabular-nums font-semibold">
                    {formatearMoneda(pagoParaAnular.monto, moneda)}
                  </span>{" "}
                  ({pagoParaAnular.medioPago})
                </p>
                <p>
                  <strong>Fecha de Pago:</strong>{" "}
                  <span className="tabular-nums">{pagoParaAnular.fechaPago}</span>
                </p>
                {pagoParaAnular.registradoPorNombre ? (
                  <p>
                    <strong>Asentado por:</strong> {pagoParaAnular.registradoPorNombre}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo-anulacion">Motivo de Anulación (obligatorio)</Label>
                <Input
                  id="motivo-anulacion"
                  data-testid="input-motivo-anulacion"
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Ej. Transferencia duplicada por error de carga"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPagoParaAnular(null)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  data-testid="btn-confirmar-anulacion"
                  disabled={isPending || motivoAnulacion.trim().length < 3}
                >
                  {isPending ? "Anulando..." : "Confirmar Anulación"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Contenido según Tab seleccionada */}
      {tabActiva === "morosos" ? (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-lg uppercase tracking-tight text-foreground">
                Listado de Atletas Morosos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Atletas con al menos una Membresía con Saldo mayor a cero
              </p>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={busquedaMorosos}
                onChange={(e) => setBusquedaMorosos(e.target.value)}
                data-testid="input-buscar-moroso"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {morososFiltrados.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground" data-testid="msg-sin-morosos">
                No hay Atletas Morosos en este momento.
              </p>
            ) : (
              <div className="space-y-4" data-testid="listado-morosos">
                {morososFiltrados.map((moroso) => (
                  <div
                    key={moroso.afiliacionId}
                    data-testid="fila-moroso"
                    className="flex flex-col gap-3 rounded-md border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground" data-testid="moroso-nombre">
                          {moroso.nombre}
                        </span>
                        <Badge variant="rose" data-testid="badge-moroso">
                          Moroso
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{moroso.email}</p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {moroso.membresiasConDeuda.map((m) => (
                          <span
                            key={m.membresiaId}
                            className="rounded border border-border bg-card px-2 py-1 text-muted-foreground tabular-nums"
                          >
                            {m.nombrePlan}: Saldo{" "}
                            <strong className="text-rose-400 tabular-nums">
                              {formatearMoneda(m.saldo, moneda)}
                            </strong>{" "}
                            (Precio {formatearMoneda(m.precio, moneda)} − Pagado {formatearMoneda(m.totalPagado, moneda)})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-xs text-muted-foreground">Deuda Total</span>
                        <span
                          className="font-display text-xl font-bold uppercase text-rose-400 tabular-nums"
                          data-testid="moroso-total-deuda"
                        >
                          {formatearMoneda(moroso.totalDeuda, moneda)}
                        </span>
                      </div>

                      <Link href="/atletas">
                        <Button variant="secondary" className="h-9 px-3 text-xs" data-testid="btn-ver-atleta">
                          Ficha del Atleta
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Tab Auditoría de Caja */
        <Card className="border-border bg-card" data-testid="seccion-auditoria-caja">
          <CardHeader>
            <CardTitle className="font-display text-lg uppercase tracking-tight text-foreground">
              Auditoría de Pagos y Anulaciones
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Registro inmutable de movimientos de caja ingresados en el Box
            </p>
          </CardHeader>
          <CardContent>
            {pagosIniciales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay pagos registrados en la caja del Box.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="tabla-auditoria-caja">
                  <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Fecha de Pago</th>
                      <th className="py-2.5 px-3">Monto</th>
                      <th className="py-2.5 px-3">Medio</th>
                      <th className="py-2.5 px-3">Registrado Por</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagosIniciales.map((pago) => {
                      const estaAnulado = pago.anuladoEn !== null;
                      return (
                        <tr key={pago.id} data-testid="fila-auditoria-pago" className="hover:bg-secondary/40">
                          <td className="py-3 px-3 tabular-nums">{pago.fechaPago}</td>
                          <td className="py-3 px-3 tabular-nums font-semibold">
                            {formatearMoneda(pago.monto, moneda)}
                          </td>
                          <td className="py-3 px-3">{pago.medioPago}</td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {pago.registradoPorNombre ?? "Usuario del Box"}
                          </td>
                          <td className="py-3 px-3">
                            {estaAnulado ? (
                              <div className="space-y-1">
                                <Badge variant="rose" data-testid="badge-pago-anulado">
                                  Anulado
                                </Badge>
                                <span
                                  className="block text-xs text-muted-foreground italic"
                                  data-testid="pago-motivo-anulacion"
                                >
                                  {pago.motivoAnulacion}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="emerald">Válido</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!estaAnulado && esAdministrador ? (
                              <Button
                                type="button"
                                variant="destructive"
                                className="h-8 px-2 text-xs"
                                data-testid={`btn-anular-pago-${pago.id}`}
                                onClick={() => setPagoParaAnular(pago)}
                              >
                                Anular
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
