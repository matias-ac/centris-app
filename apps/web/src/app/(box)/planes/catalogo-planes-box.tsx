"use client";

import { AlertCircle, CheckCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CrearPlanSchema,
  MODALIDADES_CREDITOS,
  type ModalidadCreditos,
  type Plan
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarPlanAction,
  crearPlanAction,
  eliminarPlanAction
} from "@/lib/actions";

interface CatalogoPlanesBoxProps {
  boxId: string;
  moneda: string;
  planesIniciales: Plan[];
  esAdmin: boolean;
}

export function CatalogoPlanesBox({
  boxId,
  moneda,
  planesIniciales,
  esAdmin
}: CatalogoPlanesBoxProps) {
  const router = useRouter();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [duracionDias, setDuracionDias] = useState("30");
  const [modalidadCreditos, setModalidadCreditos] =
    useState<ModalidadCreditos>("SEMANAL");
  const [creditosPorPeriodo, setCreditosPorPeriodo] = useState("3");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Formateador de moneda con números tabulares
  function formatearPrecio(monto: number): string {
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

  function handleCrearPlan(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const inputData = {
      nombre,
      precioBase: Number(precioBase),
      duracionDias: Number(duracionDias),
      modalidadCreditos,
      creditosPorPeriodo:
        modalidadCreditos === "ILIMITADO" ? null : Number(creditosPorPeriodo)
    };

    const validacion = CrearPlanSchema.safeParse(inputData);
    if (!validacion.success) {
      setErrorMsg(
        validacion.error.issues[0]?.message ?? "Error en los datos del plan."
      );
      return;
    }

    startTransition(async () => {
      const res = await crearPlanAction(boxId, validacion.data);
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }

      setExitoMsg("Plan creado correctamente en el catálogo.");
      setNombre("");
      setPrecioBase("");
      setDuracionDias("30");
      setModalidadCreditos("SEMANAL");
      setCreditosPorPeriodo("3");
      setMostrarFormulario(false);
      router.refresh();
    });
  }

  function handleEliminarPlan(planId: string, nombrePlan: string) {
    if (!confirm(`¿Dar de baja lógica el plan "${nombrePlan}"?`)) {
      return;
    }
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await eliminarPlanAction(boxId, planId);
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      setExitoMsg(`El plan "${nombrePlan}" fue desactivado del catálogo.`);
      router.refresh();
    });
  }

  function handleAlternarActivo(plan: Plan) {
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await actualizarPlanAction(boxId, plan.id, {
        activo: !plan.activo
      });
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      setExitoMsg(
        `Estado del plan "${plan.nombre}" actualizado a ${!plan.activo ? "Activo" : "Inactivo"}.`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground md:text-3xl">
            Catálogo de Planes
          </h1>
          <p className="text-sm text-muted-foreground">
            {esAdmin
              ? "Administrá las ofertas comerciales y paquetes de créditos de tu Box."
              : "Consultá las ofertas vigentes disponibles para la venta de membresías."}
          </p>
        </div>

        {esAdmin && !mostrarFormulario && (
          <Button
            type="button"
            data-testid="btn-nuevo-plan"
            onClick={() => {
              setMostrarFormulario(true);
              setErrorMsg(null);
              setExitoMsg(null);
            }}
            className="flex items-center gap-2 bg-primary font-semibold text-primary-foreground hover:bg-volt-500"
          >
            <Plus className="h-4 w-4" />
            Crear Plan
          </Button>
        )}
      </div>

      {!esAdmin && (
        <div
          data-testid="banner-solo-lectura"
          className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground"
        >
          <span className="font-semibold text-foreground">Modo Consulta de Recepción:</span> Podés visualizar los planes activos disponibles para asociar a los atletas al dar de alta una membresía.
        </div>
      )}

      {exitoMsg && (
        <div
          data-testid="plan-mensaje-exito"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          data-testid="plan-mensaje-error"
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Creación de Plan para Administrador */}
      {esAdmin && mostrarFormulario && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-xl uppercase tracking-tight text-foreground">
              Nuevo Plan Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCrearPlan}
              data-testid="formulario-crear-plan"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-nombre" className="text-foreground">
                    Nombre del Plan
                  </Label>
                  <Input
                    id="plan-nombre"
                    data-testid="input-plan-nombre"
                    placeholder="Ej. Pase 3 veces por semana"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan-precio" className="text-foreground">
                    Precio Base ({moneda})
                  </Label>
                  <Input
                    id="plan-precio"
                    data-testid="input-plan-precio"
                    type="number"
                    min="0"
                    placeholder="35000"
                    value={precioBase}
                    onChange={(e) => setPrecioBase(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan-duracion" className="text-foreground">
                    Duración (Días de Vigencia)
                  </Label>
                  <Input
                    id="plan-duracion"
                    data-testid="input-plan-duracion"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={duracionDias}
                    onChange={(e) => setDuracionDias(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan-modalidad" className="text-foreground">
                    Modalidad de Créditos
                  </Label>
                  <select
                    id="plan-modalidad"
                    data-testid="select-plan-modalidad"
                    value={modalidadCreditos}
                    onChange={(e) =>
                      setModalidadCreditos(e.target.value as ModalidadCreditos)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {MODALIDADES_CREDITOS.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod === "SEMANAL"
                          ? "Créditos Semanales (se renuevan los lunes)"
                          : mod === "VIGENCIA_TOTAL"
                            ? "Pack de Créditos (vigencia completa)"
                            : "Ilimitado (sin límite de clases)"}
                      </option>
                    ))}
                  </select>
                </div>

                {modalidadCreditos !== "ILIMITADO" && (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="plan-creditos" className="text-foreground">
                      Créditos por Período
                    </Label>
                    <Input
                      id="plan-creditos"
                      data-testid="input-plan-creditos"
                      type="number"
                      min="1"
                      placeholder="3"
                      value={creditosPorPeriodo}
                      onChange={(e) => setCreditosPorPeriodo(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {modalidadCreditos === "SEMANAL"
                        ? "Cantidad de clases disponibles cada semana calendario (lunes a domingo)."
                        : "Bolsa total de clases a consumir durante toda la vigencia del plan."}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="btn-guardar-plan"
                  disabled={isPending}
                  className="bg-primary font-semibold text-primary-foreground hover:bg-volt-500"
                >
                  {isPending ? "Guardando..." : "Guardar Plan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Planes del Box */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg uppercase tracking-tight text-foreground">
            Planes Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {planesIniciales.length === 0 ? (
            <p
              data-testid="mensaje-sin-planes"
              className="py-6 text-center text-sm text-muted-foreground"
            >
              No hay planes configurados en este Box.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="tabla-planes"
                className="w-full text-left text-sm"
              >
                <thead className="border-b border-border bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Modalidad</th>
                    <th className="px-4 py-3">Créditos</th>
                    <th className="px-4 py-3">Vigencia</th>
                    <th className="px-4 py-3">Precio Base</th>
                    <th className="px-4 py-3">Estado</th>
                    {esAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {planesIniciales.map((plan) => (
                    <tr
                      key={plan.id}
                      data-testid={`fila-plan-${plan.id}`}
                      className="hover:bg-secondary/50"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {plan.nombre}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            plan.modalidadCreditos === "ILIMITADO"
                              ? "emerald"
                              : plan.modalidadCreditos === "SEMANAL"
                                ? "amber"
                                : "zinc"
                          }
                        >
                          {plan.modalidadCreditos}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                        {plan.modalidadCreditos === "ILIMITADO"
                          ? "Ilimitado"
                          : `${plan.creditosPorPeriodo} clases`}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {plan.duracionDias} días
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums text-foreground">
                        {formatearPrecio(plan.precioBase)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={plan.activo ? "emerald" : "zinc"}>
                          {plan.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      {esAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-8 px-2.5 py-1 text-xs"
                              data-testid={`btn-alternar-activo-${plan.id}`}
                              disabled={isPending}
                              onClick={() => handleAlternarActivo(plan)}
                            >
                              {plan.activo ? "Desactivar" : "Activar"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="min-h-8 px-2.5 py-1 text-xs"
                              data-testid={`btn-eliminar-plan-${plan.id}`}
                              disabled={isPending}
                              onClick={() =>
                                handleEliminarPlan(plan.id, plan.nombre)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
