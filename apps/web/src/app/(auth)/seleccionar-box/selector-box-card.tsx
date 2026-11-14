"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AfiliacionConBox } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { obtenerEtiquetaRol } from "@/lib/identidad-ui";
import { cn } from "@/lib/utils";
import {
  ejecutarSeleccionBox,
  formatearUbicacionTimezone
} from "./seleccionar-box-estado";

export interface SelectorBoxCardProps {
  afiliacion: AfiliacionConBox;
  esActivo: boolean;
  onSeleccionarBox: (boxId: string) => Promise<void>;
}

/**
 * Alerta accesible dentro de la tarjeta de Box cuando falla el cambio de sede.
 */
export function AlertaErrorSeleccionBox({
  boxId,
  mensaje
}: {
  boxId: string;
  mensaje: string;
}) {
  return (
    <div
      role="alert"
      data-testid={`error-box-${boxId}`}
      className="flex items-start gap-2 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-2.5 text-xs text-[#FF6D6D]"
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6D6D]"
        aria-hidden={true}
      />
      <span>{mensaje}</span>
    </div>
  );
}

/**
 * Tarjeta Dark Bento Cockpit para elegir un Box con eyebrow independiente y
 * altura de encabezado reservada para evitar saltos de layout en desktop.
 */
export function SelectorBoxCard({
  afiliacion,
  esActivo,
  onSeleccionarBox
}: SelectorBoxCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const ubicacion = formatearUbicacionTimezone(afiliacion.box.timezone);

  function handleElegirBox() {
    setError(undefined);
    startTransition(async () => {
      const resultado = await ejecutarSeleccionBox(
        afiliacion.boxId,
        onSeleccionarBox
      );
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      router.push("/inicio");
      router.refresh();
    });
  }

  return (
    <Card
      data-testid={`opcion-box-${afiliacion.boxId}`}
      className={cn(
        "flex flex-col justify-between gap-[18px] p-[22px] transition-colors",
        esActivo
          ? "border-[#C1F429]/48"
          : "border-border hover:border-[#343740]"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex min-h-7 w-full items-center justify-between gap-2">
          <Badge variant="zinc" className="tabular-nums">
            {afiliacion.box.moneda}
          </Badge>
          {esActivo ? (
            <Badge
              variant="mint"
              data-testid={`badge-box-activo-${afiliacion.boxId}`}
            >
              Activo ahora
            </Badge>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1 sm:min-h-[4.5rem]">
          <CardTitle className="break-words">{afiliacion.box.nombre}</CardTitle>
          <p className="text-sm text-muted-foreground">{ubicacion}</p>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 rounded-2xl border border-border bg-secondary p-3.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tus permisos en este Box
          </span>
          <div className="flex flex-wrap gap-2">
            {afiliacion.roles.map((rol) => {
              const meta = obtenerEtiquetaRol(rol);
              return (
                <Badge key={rol} variant={meta.variant}>
                  {meta.label}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error ? (
          <AlertaErrorSeleccionBox boxId={afiliacion.boxId} mensaje={error} />
        ) : null}

        <Button
          type="button"
          onClick={handleElegirBox}
          disabled={isPending}
          variant={esActivo ? "secondary" : "primary"}
          className="w-full"
        >
          {isPending
            ? "Abriendo Box..."
            : esActivo
              ? "Continuar en este Box"
              : "Ingresar al Box"}
        </Button>
      </div>
    </Card>
  );
}
