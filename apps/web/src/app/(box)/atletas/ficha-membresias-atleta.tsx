"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type Membresia, type Plan } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ajustarCreditosExtraAction,
  ajustarPrecioMembresiaAction,
  asignarMembresiaAction,
  bajaAnticipadaAction,
  type ResultadoAccion
} from "@/lib/actions";

interface FichaMembresiasAtletaProps {
  boxId: string;
  moneda: string;
  afiliacionId: string;
  planes: Plan[];
  membresias: Membresia[];
  esAdministrador: boolean;
}

function formatearPrecio(monto: number, moneda: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0
    }).format(monto);
  } catch {
    return `$ ${monto.toLocaleString("es-AR")}`;
  }
}

export function FichaMembresiasAtleta({
  boxId,
  moneda,
  afiliacionId,
  planes,
  membresias,
  esAdministrador
}: FichaMembresiasAtletaProps) {
  const router = useRouter();
  const planesActivos = planes.filter((plan) => plan.activo);
  const [planId, setPlanId] = useState(planesActivos[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      <h3 className="font-display text-sm uppercase tracking-tight text-foreground">
        Membresías
      </h3>

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
            className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
          >
            {planesActivos.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} — {formatearPrecio(plan.precioBase, moneda)}
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
        <ul className="space-y-3">
          {membresias.map((membresia) => (
            <FilaMembresia
              key={membresia.id}
              boxId={boxId}
              moneda={moneda}
              membresia={membresia}
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
  esAdministrador: boolean;
  deshabilitado: boolean;
  ejecutar: (accion: () => Promise<ResultadoAccion>) => void;
}

function FilaMembresia({
  boxId,
  moneda,
  membresia,
  esAdministrador,
  deshabilitado,
  ejecutar
}: FilaMembresiaProps) {
  const [creditosExtra, setCreditosExtra] = useState(
    String(membresia.creditosExtra)
  );
  const [precio, setPrecio] = useState(String(membresia.precio));
  const [fechaBaja, setFechaBaja] = useState("");

  return (
    <li
      data-testid="fila-membresia"
      className="space-y-3 rounded-md border border-border bg-card p-3 text-sm"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <span className="block text-xs text-muted-foreground">Precio</span>
          <span
            className="tabular-nums"
            data-testid="membresia-precio"
            data-precio={membresia.precio}
          >
            {formatearPrecio(membresia.precio, moneda)}
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
        <Badge variant="amber">Baja Anticipada</Badge>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <Input
          type="number"
          aria-label="Créditos extra"
          data-testid="input-creditos-extra"
          value={creditosExtra}
          onChange={(e) => setCreditosExtra(e.target.value)}
          disabled={deshabilitado}
          className="w-28"
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
        >
          Ajustar créditos extra
        </Button>
      </div>

      {esAdministrador ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-end gap-2">
            <Input
              type="number"
              min={0}
              aria-label="Precio de la Membresía"
              data-testid="input-precio-membresia"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              disabled={deshabilitado}
              className="w-32"
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
            >
              Ajustar Precio
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Input
              type="date"
              aria-label="Fin de la Vigencia tras la Baja Anticipada"
              data-testid="input-fecha-baja"
              value={fechaBaja}
              onChange={(e) => setFechaBaja(e.target.value)}
              disabled={deshabilitado}
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
            >
              Baja Anticipada
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
