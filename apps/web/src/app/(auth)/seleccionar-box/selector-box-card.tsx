"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AfiliacionConBox } from "@centris/shared";
import { obtenerEtiquetaRol } from "@/app/(box)/navegacion-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { seleccionarBoxAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  ejecutarSeleccionBox,
  formatearUbicacionTimezone
} from "./seleccionar-box-estado";

export interface SelectorBoxCardProps {
  afiliacion: AfiliacionConBox;
  esActivo?: boolean;
  errorInicial?: string;
  onSeleccionarBox?: (boxId: string) => Promise<void>;
}

/**
 * Tarjeta Dark Bento Cockpit para elegir un Box con eyebrow independiente y
 * altura de encabezado reservada para evitar saltos de layout en desktop.
 */
export function SelectorBoxCard({
  afiliacion,
  esActivo = false,
  errorInicial,
  onSeleccionarBox
}: SelectorBoxCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(errorInicial);

  const ubicacion = formatearUbicacionTimezone(afiliacion.box.timezone);
  const accionSeleccion = onSeleccionarBox ?? seleccionarBoxAction;

  function handleElegirBox() {
    setError(undefined);
    startTransition(async () => {
      const resultado = await ejecutarSeleccionBox(
        afiliacion.boxId,
        accionSeleccion
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
          <div
            role="alert"
            data-testid={`error-box-${afiliacion.boxId}`}
            className="flex items-start gap-2 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-2.5 text-xs text-[#FF6D6D]"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6D6D]"
              aria-hidden={true}
            />
            <span>{error}</span>
          </div>
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
