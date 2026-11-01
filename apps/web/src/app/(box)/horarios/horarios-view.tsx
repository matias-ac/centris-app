"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Dumbbell,
  Plus,
  Trash2,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DIAS_SEMANA,
  NOMBRES_DIAS_SEMANA,
  type AfiliacionConUsuario,
  type Horario,
  type TipoClase
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crearHorarioAction,
  crearTipoClaseAction,
  eliminarHorarioAction,
  eliminarTipoClaseAction
} from "@/lib/actions";

interface HorariosViewProps {
  boxId: string;
  esAdmin: boolean;
  tiposClaseIniciales: TipoClase[];
  horariosIniciales: Horario[];
  coaches: AfiliacionConUsuario[];
}

export function HorariosView({
  boxId,
  esAdmin,
  tiposClaseIniciales,
  horariosIniciales,
  coaches
}: HorariosViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mostrarFormTipoClase, setMostrarFormTipoClase] = useState(false);
  const [mostrarFormHorario, setMostrarFormHorario] = useState(false);

  // Form Tipo de Clase
  const [tipoNombre, setTipoNombre] = useState("");
  const [tipoDescripcion, setTipoDescripcion] = useState("");

  // Form Horario
  const [horarioTipoClaseId, setHorarioTipoClaseId] = useState(
    tiposClaseIniciales[0]?.id ?? ""
  );
  const [horarioCoachId, setHorarioCoachId] = useState(
    coaches[0]?.id ?? ""
  );
  const [horarioDia, setHorarioDia] = useState<number>(1);
  const [horarioHora, setHorarioHora] = useState("07:00");
  const [horarioDuracion, setHorarioDuracion] = useState("60");
  const [horarioCupos, setHorarioCupos] = useState("16");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  function handleCrearTipoClase(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await crearTipoClaseAction(boxId, {
        nombre: tipoNombre,
        descripcion: tipoDescripcion || undefined
      });

      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al crear Tipo de Clase.");
      } else {
        setExitoMsg("Tipo de Clase creado exitosamente.");
        setTipoNombre("");
        setTipoDescripcion("");
        setMostrarFormTipoClase(false);
        router.refresh();
      }
    });
  }

  function handleEliminarTipoClase(tipoClaseId: string) {
    if (!confirm("¿Dar de baja este Tipo de Clase?")) return;
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await eliminarTipoClaseAction(boxId, tipoClaseId);
      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al dar de baja Tipo de Clase.");
      } else {
        setExitoMsg("Tipo de Clase dado de baja.");
        router.refresh();
      }
    });
  }

  function handleCrearHorario(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const tipoClaseId = horarioTipoClaseId || tiposClaseIniciales[0]?.id;
    const coachAfiliacionId = horarioCoachId || coaches[0]?.id;

    if (!tipoClaseId || !coachAfiliacionId) {
      setErrorMsg("Debe haber al menos un Tipo de Clase y un Coach disponibles.");
      return;
    }

    startTransition(async () => {
      const res = await crearHorarioAction(boxId, {
        tipoClaseId,
        coachAfiliacionId,
        diaSemana: Number(horarioDia),
        horaInicio: horarioHora,
        duracionMinutos: Number(horarioDuracion),
        cuposDefault: Number(horarioCupos)
      });

      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al programar Horario.");
      } else {
        setExitoMsg("Horario recurrente creado exitosamente.");
        setMostrarFormHorario(false);
        router.refresh();
      }
    });
  }

  function handleEliminarHorario(horarioId: string) {
    if (!confirm("¿Dar de baja este Horario recurrente?")) return;
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await eliminarHorarioAction(boxId, horarioId);
      if (!res.ok) {
        setErrorMsg(res.message ?? "Error al dar de baja Horario.");
      } else {
        setExitoMsg("Horario recurrente dado de baja.");
        router.refresh();
      }
    });
  }

  // Agrupar horarios por día de la semana
  const horariosPorDia = DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = horariosIniciales
      .filter((h) => h.diaSemana === dia && h.activo && !h.deletedAt)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return acc;
  }, {} as Record<number, Horario[]>);

  const tiposActivos = tiposClaseIniciales.filter(
    (tc) => tc.activo && !tc.deletedAt
  );

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Horarios y Tipos de Clase
          </h1>
          <p className="text-sm text-muted-foreground">
            Configuración de plantilla semanal recurrente y Tipos de Clase del Box
          </p>
        </div>

        {esAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="btn-nuevo-tipo-clase"
              variant="secondary"
              onClick={() => {
                setMostrarFormTipoClase(!mostrarFormTipoClase);
                setMostrarFormHorario(false);
              }}
            >
              <Dumbbell className="mr-2 h-4 w-4" />
              {mostrarFormTipoClase ? "Cancelar Tipo" : "Nuevo Tipo de Clase"}
            </Button>
            <Button
              data-testid="btn-nuevo-horario"
              onClick={() => {
                setMostrarFormHorario(!mostrarFormHorario);
                setMostrarFormTipoClase(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {mostrarFormHorario ? "Cancelar Horario" : "Nuevo Horario"}
            </Button>
          </div>
        )}
      </div>

      {/* Mensajes de feedback */}
      {errorMsg && (
        <div
          data-testid="alerta-error"
          className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {exitoMsg && (
        <div
          data-testid="alerta-exito"
          className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      )}

      {/* Formulario Crear Tipo de Clase */}
      {esAdmin && mostrarFormTipoClase && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Alta de Tipo de Clase</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCrearTipoClase} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo-nombre">Nombre del Tipo de Clase</Label>
                  <Input
                    id="tipo-nombre"
                    data-testid="input-tipo-clase-nombre"
                    placeholder="Ej: WOD, Halterofilia, Open Box"
                    value={tipoNombre}
                    onChange={(e) => setTipoNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo-descripcion">Descripción</Label>
                  <Input
                    id="tipo-descripcion"
                    data-testid="input-tipo-clase-descripcion"
                    placeholder="Breve descripción del Tipo de Clase"
                    value={tipoDescripcion}
                    onChange={(e) => setTipoDescripcion(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  data-testid="btn-guardar-tipo-clase"
                  disabled={isPending}
                >
                  {isPending ? "Guardando..." : "Guardar Tipo de Clase"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulario Crear Horario */}
      {esAdmin && mostrarFormHorario && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Programar Horario Recurrente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCrearHorario} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="horario-tipo">Tipo de Clase</Label>
                  <select
                    id="horario-tipo"
                    data-testid="select-horario-tipo-clase"
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background"
                    value={horarioTipoClaseId}
                    onChange={(e) => setHorarioTipoClaseId(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar Tipo...</option>
                    {tiposActivos.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario-coach">Coach por Defecto</Label>
                  <select
                    id="horario-coach"
                    data-testid="select-horario-coach"
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background"
                    value={horarioCoachId}
                    onChange={(e) => setHorarioCoachId(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar Coach...</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.usuario.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario-dia">Día de la Semana</Label>
                  <select
                    id="horario-dia"
                    data-testid="select-horario-dia"
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background"
                    value={horarioDia}
                    onChange={(e) => setHorarioDia(Number(e.target.value))}
                    required
                  >
                    {DIAS_SEMANA.map((dia) => (
                      <option key={dia} value={dia}>
                        {NOMBRES_DIAS_SEMANA[dia]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario-hora">Hora Inicio (HH:mm local)</Label>
                  <Input
                    id="horario-hora"
                    data-testid="input-horario-hora"
                    placeholder="07:00"
                    value={horarioHora}
                    onChange={(e) => setHorarioHora(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario-duracion">Duración (minutos)</Label>
                  <Input
                    id="horario-duracion"
                    data-testid="input-horario-duracion"
                    type="number"
                    min="1"
                    value={horarioDuracion}
                    onChange={(e) => setHorarioDuracion(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario-cupos">Cupos por Defecto</Label>
                  <Input
                    id="horario-cupos"
                    data-testid="input-horario-cupos"
                    type="number"
                    min="1"
                    value={horarioCupos}
                    onChange={(e) => setHorarioCupos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  data-testid="btn-guardar-horario"
                  disabled={isPending}
                >
                  {isPending ? "Programando..." : "Guardar Horario"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sección 1: Grilla Semanal de Horarios */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Plantilla Semanal Recurrente
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
          {DIAS_SEMANA.map((dia) => {
            const listaDia = horariosPorDia[dia] ?? [];
            return (
              <div
                key={dia}
                className="flex flex-col rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="mb-3 border-b border-border pb-2 text-center">
                  <span className="text-sm font-bold text-foreground">
                    {NOMBRES_DIAS_SEMANA[dia]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {listaDia.length} {listaDia.length === 1 ? "bloque" : "bloques"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {listaDia.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Sin horarios
                    </div>
                  ) : (
                    listaDia.map((h) => {
                      const horaCorta = h.horaInicio.slice(0, 5);
                      return (
                        <div
                          key={h.id}
                          data-testid={`bloque-horario-dia-${h.diaSemana}-${horaCorta}`}
                          className="group relative rounded-md border border-border/80 bg-background p-2.5 shadow-sm transition hover:border-primary/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold tracking-tight text-foreground tabular-nums">
                              {horaCorta}
                            </span>
                            <Badge variant="zinc" className="text-[0.6875rem] tabular-nums">
                              {h.duracionMinutos} min
                            </Badge>
                          </div>

                          <div className="mt-1.5 font-medium text-xs text-foreground">
                            {h.tipoClaseNombre ?? "Clase"}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[0.6875rem] text-muted-foreground">
                            <span className="truncate">
                              {h.coachNombre ?? "Coach"}
                            </span>
                            <span className="flex items-center gap-0.5 tabular-nums">
                              <Users className="h-3 w-3" />
                              {h.cuposDefault}
                            </span>
                          </div>

                          {esAdmin && (
                            <div className="mt-2 flex justify-end border-t border-border/50 pt-1.5">
                              <button
                                type="button"
                                data-testid={`btn-eliminar-horario-${horaCorta}`}
                                onClick={() => handleEliminarHorario(h.id)}
                                className="text-muted-foreground transition hover:text-destructive"
                                title="Dar de baja este bloque"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección 2: Catálogo de Tipos de Clase */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Catálogo de Tipos de Clase
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {tiposActivos.length === 0 ? (
            <div className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No hay Tipos de Clase activos en el catálogo.
            </div>
          ) : (
            tiposActivos.map((tc) => (
              <div
                key={tc.id}
                data-testid={`item-tipo-clase-${tc.nombre}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {tc.nombre}
                  </h3>
                  {tc.descripcion && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tc.descripcion}
                    </p>
                  )}
                </div>

                {esAdmin && (
                  <button
                    type="button"
                    data-testid={`btn-eliminar-tipo-clase-${tc.nombre}`}
                    onClick={() => handleEliminarTipoClase(tc.id)}
                    className="ml-3 rounded p-1 text-muted-foreground transition hover:text-destructive"
                    title="Dar de baja Tipo de Clase"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
