"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Box } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { guardarConfiguracionBoxAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  ATAJOS_VENTANA_CANCELACION,
  calcularVistaPreviaOperativa,
  crearBorradorDesdeBox,
  hayCambiosPendientesConfiguracion,
  procesarGuardadoConfiguracion,
  resolverOpcionesMoneda,
  resolverOpcionesTimezone,
  type BorradorConfiguracionBox,
  type ErroresConfiguracionBox
} from "./configuracion-estado";

export interface FormularioConfiguracionBoxProps {
  box: Box;
  erroresIniciales?: ErroresConfiguracionBox;
  guardadoInicialOk?: boolean;
}

/**
 * Vista accesible para roles sin permiso de Administración en /configuracion.
 */
export function AccesoRestringidoConfiguracion({
  nombreBox
}: {
  nombreBox: string;
}) {
  return (
    <Card
      data-testid="acceso-denegado-rol"
      className="max-w-2xl border-[#FF6D6D]/28"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-xl">
          Acceso exclusivo de Administración
        </CardTitle>
        <Badge variant="coral">Permiso requerido</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tu afiliación actual en {nombreBox} no posee el rol de Administrador
          para modificar la zona horaria, moneda o reglas operativas del Box.
        </p>
        <div>
          <Link href="/inicio" className={buttonClassName("secondary")}>
            Volver al panel
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PozoVistaPrevia({
  etiqueta,
  valor,
  detalle
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-secondary px-4 py-3.5">
      <span className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </span>
      <strong className="text-[1.0625rem] font-medium text-foreground tabular-nums">
        {valor}
      </strong>
      <p className="text-sm leading-snug text-muted-foreground">
        {detalle}
      </p>
    </div>
  );
}

/**
 * Formulario Bento de configuración operativa del Box con vista previa en vivo.
 */
export function FormularioConfiguracionBox({
  box,
  erroresIniciales,
  guardadoInicialOk = false
}: FormularioConfiguracionBoxProps) {
  const router = useRouter();
  const [boxGuardado, setBoxGuardado] = useState<Box>(box);
  const [borrador, setBorrador] = useState<BorradorConfiguracionBox>(() =>
    crearBorradorDesdeBox(box)
  );
  const [errores, setErrores] = useState<ErroresConfiguracionBox>(
    () => erroresIniciales ?? {}
  );
  const [guardadoOk, setGuardadoOk] = useState(guardadoInicialOk);
  const [cambiosDescartados, setCambiosDescartados] = useState(false);
  const [isPending, startTransition] = useTransition();

  const opcionesTimezone = resolverOpcionesTimezone(borrador.timezone);
  const opcionesMoneda = resolverOpcionesMoneda(borrador.moneda);
  const hayCambios = hayCambiosPendientesConfiguracion(boxGuardado, borrador);
  const vistaPrevia = calcularVistaPreviaOperativa(borrador);
  const ventanaNumerica = Number(borrador.ventanaCancelacionMinutos.trim());

  function actualizarCampo<K extends keyof BorradorConfiguracionBox>(
    campo: K,
    valor: BorradorConfiguracionBox[K]
  ) {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => {
      if (!prev[campo] && !prev.general) {
        return prev;
      }
      const siguientes = { ...prev };
      delete siguientes[campo];
      delete siguientes.general;
      return siguientes;
    });
    setGuardadoOk(false);
    setCambiosDescartados(false);
  }

  function handleRestablecer() {
    setBorrador(crearBorradorDesdeBox(boxGuardado));
    setErrores({});
    setGuardadoOk(false);
    setCambiosDescartados(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setGuardadoOk(false);
    setCambiosDescartados(false);

    startTransition(async () => {
      const resultado = await procesarGuardadoConfiguracion(
        boxGuardado.id,
        borrador,
        guardarConfiguracionBoxAction
      );

      if (!resultado.ok) {
        setErrores(resultado.errores);
        return;
      }

      const siguienteGuardado: Box = {
        ...boxGuardado,
        nombre: resultado.datosGuardados.nombre ?? boxGuardado.nombre,
        timezone: resultado.datosGuardados.timezone,
        moneda: resultado.datosGuardados.moneda,
        anticipacionReservaDias:
          resultado.datosGuardados.anticipacionReservaDias,
        ventanaCancelacionMinutos:
          resultado.datosGuardados.ventanaCancelacionMinutos
      };
      setBoxGuardado(siguienteGuardado);
      setBorrador(crearBorradorDesdeBox(siguienteGuardado));
      setGuardadoOk(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]"
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-5">
        {errores.general ? (
          <div
            role="alert"
            data-testid="error-configuracion-box"
            className="flex items-center gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-4 py-3 text-sm text-[#FF6D6D]"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errores.general}</span>
          </div>
        ) : null}

        {guardadoOk ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="mensaje-exito-configuracion"
            className="flex items-center gap-2.5 rounded-2xl border border-[#18FFC8]/28 bg-[#18FFC8]/14 px-4 py-3 text-sm text-[#18FFC8]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Configuración del Box actualizada correctamente.</span>
          </div>
        ) : null}

        <Card aria-label="Identidad y región">
          <CardHeader className="pb-4">
            <CardTitle>Identidad y región</CardTitle>
            <CardDescription>
              Define cómo se identifica el Box y qué reloj y moneda rigen para
              agenda, planes y caja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="min-w-0">
              <Label htmlFor="cfg-nombre" className="mb-1.5 block">
                Nombre del Box
              </Label>
              <Input
                id="cfg-nombre"
                aria-invalid={errores.nombre ? true : undefined}
                aria-describedby={errores.nombre ? "error-cfg-nombre" : undefined}
                value={borrador.nombre}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                required
              />
              {errores.nombre ? (
                <p
                  id="error-cfg-nombre"
                  role="alert"
                  className="mt-1.5 text-xs text-[#FF6D6D]"
                >
                  {errores.nombre}
                </p>
              ) : null}
            </div>

            <div className="two-cols grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <Label
                  htmlFor="cfg-timezone"
                  className="field-label mb-1.5 block md:flex md:min-h-[2.5rem] md:items-end md:leading-[1.3]"
                >
                  Zona horaria del Box
                </Label>
                <Select
                  id="cfg-timezone"
                  aria-invalid={errores.timezone ? true : undefined}
                  aria-describedby={
                    errores.timezone ? "error-cfg-timezone" : "hint-cfg-timezone"
                  }
                  value={borrador.timezone}
                  onChange={(e) => actualizarCampo("timezone", e.target.value)}
                >
                  {opcionesTimezone.map((opcion) => (
                    <option
                      key={opcion.value}
                      value={opcion.value}
                      className="bg-card text-foreground"
                    >
                      {opcion.label}
                    </option>
                  ))}
                </Select>
                <p
                  id="hint-cfg-timezone"
                  className="mt-1.5 text-xs text-muted-foreground"
                >
                  Todas las clases y cancelaciones se calculan con este horario
                  local.
                </p>
                {errores.timezone ? (
                  <p
                    id="error-cfg-timezone"
                    role="alert"
                    className="mt-1.5 text-xs text-[#FF6D6D]"
                  >
                    {errores.timezone}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0">
                <Label
                  htmlFor="cfg-moneda"
                  className="field-label mb-1.5 block md:flex md:min-h-[2.5rem] md:items-end md:leading-[1.3]"
                >
                  Moneda de cobro
                </Label>
                <Select
                  id="cfg-moneda"
                  aria-invalid={errores.moneda ? true : undefined}
                  aria-describedby={
                    errores.moneda ? "error-cfg-moneda" : "hint-cfg-moneda"
                  }
                  value={borrador.moneda}
                  onChange={(e) => actualizarCampo("moneda", e.target.value)}
                >
                  {opcionesMoneda.map((opcion) => (
                    <option
                      key={opcion.value}
                      value={opcion.value}
                      className="bg-card text-foreground"
                    >
                      {opcion.label}
                    </option>
                  ))}
                </Select>
                <p
                  id="hint-cfg-moneda"
                  className="mt-1.5 text-xs text-muted-foreground"
                >
                  Se aplica al catálogo de planes, cobranzas y saldos
                  pendientes.
                </p>
                {errores.moneda ? (
                  <p
                    id="error-cfg-moneda"
                    role="alert"
                    className="mt-1.5 text-xs text-[#FF6D6D]"
                  >
                    {errores.moneda}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card aria-label="Reglas de reservas y cancelaciones">
          <CardHeader className="pb-4">
            <CardTitle>Reglas de reservas y cancelaciones</CardTitle>
            <CardDescription>
              Controlá con cuánta anticipación se abre la agenda y hasta cuándo
              se devuelve el crédito al cancelar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="two-cols grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <Label
                  htmlFor="cfg-anticipacion"
                  className="field-label mb-1.5 block md:flex md:min-h-[2.5rem] md:items-end md:leading-[1.3]"
                >
                  Anticipación de reserva (días)
                </Label>
                <Input
                  id="cfg-anticipacion"
                  type="number"
                  min={1}
                  max={90}
                  aria-invalid={
                    errores.anticipacionReservaDias ? true : undefined
                  }
                  aria-describedby={
                    errores.anticipacionReservaDias
                      ? "error-cfg-anticipacion"
                      : "hint-cfg-anticipacion"
                  }
                  className="tabular-nums"
                  value={borrador.anticipacionReservaDias}
                  onChange={(e) =>
                    actualizarCampo("anticipacionReservaDias", e.target.value)
                  }
                  required
                />
                <p
                  id="hint-cfg-anticipacion"
                  className="mt-1.5 text-xs text-muted-foreground"
                >
                  Entre <span className="tabular-nums">1</span> y{" "}
                  <span className="tabular-nums">90</span> días hacia adelante.
                </p>
                {errores.anticipacionReservaDias ? (
                  <p
                    id="error-cfg-anticipacion"
                    role="alert"
                    className="mt-1.5 text-xs text-[#FF6D6D]"
                  >
                    {errores.anticipacionReservaDias}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0">
                <Label
                  htmlFor="cfg-ventana"
                  className="field-label mb-1.5 block md:flex md:min-h-[2.5rem] md:items-end md:leading-[1.3]"
                >
                  Ventana de cancelación (minutos)
                </Label>
                <Input
                  id="cfg-ventana"
                  type="number"
                  min={0}
                  max={10080}
                  aria-invalid={
                    errores.ventanaCancelacionMinutos ? true : undefined
                  }
                  aria-describedby={
                    errores.ventanaCancelacionMinutos
                      ? "error-cfg-ventana"
                      : "hint-cfg-ventana"
                  }
                  className="tabular-nums"
                  value={borrador.ventanaCancelacionMinutos}
                  onChange={(e) =>
                    actualizarCampo("ventanaCancelacionMinutos", e.target.value)
                  }
                  required
                />
                <p
                  id="hint-cfg-ventana"
                  className="mt-1.5 text-xs text-muted-foreground tabular-nums"
                >
                  {vistaPrevia.equivalenciaVentana}
                </p>
                {errores.ventanaCancelacionMinutos ? (
                  <p
                    id="error-cfg-ventana"
                    role="alert"
                    className="mt-1.5 text-xs text-[#FF6D6D]"
                  >
                    {errores.ventanaCancelacionMinutos}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium text-foreground">
                Atajos frecuentes para ventana de cancelación
              </span>
              <div
                role="group"
                aria-label="Atajos rápidos de cancelación"
                className="flex flex-wrap gap-2"
              >
                {ATAJOS_VENTANA_CANCELACION.map((atajo) => {
                  const activo =
                    Number.isInteger(ventanaNumerica) &&
                    ventanaNumerica === atajo.minutos;
                  return (
                    <button
                      key={atajo.minutos}
                      type="button"
                      aria-pressed={activo}
                      onClick={() =>
                        actualizarCampo(
                          "ventanaCancelacionMinutos",
                          String(atajo.minutos)
                        )
                      }
                      className={cn(
                        "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3.5 py-2 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        activo
                          ? "border-primary bg-primary/14 font-semibold text-primary"
                          : "border-border bg-secondary font-medium text-muted-foreground hover:border-[#3A3C42] hover:text-foreground"
                      )}
                    >
                      {atajo.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-[20px] border bg-card px-4 py-3.5 transition-colors",
            hayCambios ? "border-[#FBBF24]/28" : "border-border"
          )}
        >
          <span
            role="status"
            aria-live="polite"
            className={cn(
              "text-sm",
              hayCambios ? "text-[#FBBF24]" : "text-muted-foreground"
            )}
          >
            {hayCambios
              ? "Tenés cambios sin guardar"
              : cambiosDescartados
                ? "Cambios descartados"
                : "Sin cambios pendientes"}
          </span>

          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              disabled={!hayCambios || isPending}
              onClick={handleRestablecer}
              className="flex-1 sm:flex-initial"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Restablecer
            </Button>
            <Button
              type="submit"
              variant={hayCambios ? "primary" : "secondary"}
              disabled={!hayCambios || isPending}
              className="flex-1 sm:flex-initial"
            >
              {isPending ? "Guardando..." : "Guardar configuración"}
            </Button>
          </div>
        </div>
      </div>

      <aside aria-label="Vista previa operativa" className="min-w-0">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle>Cómo opera hoy el Box</CardTitle>
              <CardDescription>
                Resumen en tiempo real según los valores elegidos.
              </CardDescription>
            </div>
            <Badge variant="mint">En vivo</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <PozoVistaPrevia
              etiqueta="Reloj local del Box"
              valor={vistaPrevia.relojLocal}
              detalle={`Zona elegida: ${vistaPrevia.zonaElegidaLabel}`}
            />
            <PozoVistaPrevia
              etiqueta="Ejemplo de precio en pantalla"
              valor={vistaPrevia.ejemploMoneda}
              detalle="Formato aplicado a membresías, pagos y morosos."
            />
            <PozoVistaPrevia
              etiqueta="Horizonte de reservas"
              valor={vistaPrevia.horizonteTitulo}
              detalle={vistaPrevia.horizonteDetalle}
            />
            <PozoVistaPrevia
              etiqueta="Política de cancelación"
              valor={vistaPrevia.cancelacionTitulo}
              detalle={vistaPrevia.cancelacionDetalle}
            />
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
