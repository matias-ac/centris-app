"use client";

import { AlertCircle, CheckCircle, Edit3, Eye, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ActualizarAtletaSchema,
  CrearAtletaSchema,
  type Atleta
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarAtletaAction,
  crearAtletaAction,
  eliminarAtletaAction
} from "@/lib/actions";

interface DirectorioAtletasBoxProps {
  boxId: string;
  atletasIniciales: Atleta[];
}

export function DirectorioAtletasBox({
  boxId,
  atletasIniciales
}: DirectorioAtletasBoxProps) {
  const router = useRouter();
  const [mostrarFormularioAlta, setMostrarFormularioAlta] = useState(false);
  const [atletaEditando, setAtletaEditando] = useState<Atleta | null>(null);
  const [atletaFicha, setAtletaFicha] = useState<Atleta | null>(null);

  // Filtros de búsqueda
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  // Estados de alta
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");

  // Estados de edición
  const [editNombre, setEditNombre] = useState("");
  const [editActivo, setEditActivo] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtrado de atletas en memoria
  const atletasFiltrados = useMemo(() => {
    return atletasIniciales.filter((atleta) => {
      if (soloActivos && !atleta.activo) {
        return false;
      }
      if (!terminoBusqueda) {
        return true;
      }
      const busqueda = terminoBusqueda.toLowerCase();
      return (
        atleta.nombre.toLowerCase().includes(busqueda) ||
        atleta.email.toLowerCase().includes(busqueda)
      );
    });
  }, [atletasIniciales, terminoBusqueda, soloActivos]);

  function handleCrearAtleta(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const validacion = CrearAtletaSchema.safeParse({ nombre, email });
    if (!validacion.success) {
      setErrorMsg(
        validacion.error.issues[0]?.message ?? "Error en los datos del atleta."
      );
      return;
    }

    startTransition(async () => {
      const res = await crearAtletaAction(boxId, validacion.data);
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }

      setExitoMsg(`Atleta "${nombre}" registrado con éxito.`);
      setNombre("");
      setEmail("");
      setMostrarFormularioAlta(false);
      router.refresh();
    });
  }

  function handleActualizarAtleta(e: React.FormEvent) {
    e.preventDefault();
    if (!atletaEditando) return;
    setErrorMsg(null);
    setExitoMsg(null);

    const validacion = ActualizarAtletaSchema.safeParse({
      nombre: editNombre,
      activo: editActivo
    });

    if (!validacion.success) {
      setErrorMsg(
        validacion.error.issues[0]?.message ??
          "Error en los datos de actualización."
      );
      return;
    }

    startTransition(async () => {
      const res = await actualizarAtletaAction(
        boxId,
        atletaEditando.id,
        validacion.data
      );
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }

      setExitoMsg(`Atleta actualizado con éxito.`);
      setAtletaEditando(null);
      router.refresh();
    });
  }

  function handleEliminarAtleta(atletaId: string, nombreAtleta: string) {
    if (
      !confirm(
        `¿Confirmás la desactivación de "${nombreAtleta}" en este Box?`
      )
    ) {
      return;
    }

    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const res = await eliminarAtletaAction(boxId, atletaId);
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }

      setExitoMsg(`Atleta desactivado con éxito.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
            Directorio de Atletas
          </h1>
          <p className="text-sm text-muted-foreground">
            Alta y gestión del padrón de atletas del Box
          </p>
        </div>

        <Button
          type="button"
          data-testid="btn-nuevo-atleta"
          onClick={() => {
            setMostrarFormularioAlta(!mostrarFormularioAlta);
            setAtletaEditando(null);
            setErrorMsg(null);
            setExitoMsg(null);
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-volt-500 font-semibold"
        >
          <UserPlus className="h-4 w-4" />
          {mostrarFormularioAlta ? "Cerrar Formulario" : "Nuevo Atleta"}
        </Button>
      </div>

      {/* Alertas de error o éxito */}
      {errorMsg ? (
        <div
          data-testid="alerta-error"
          className="flex items-center gap-3 rounded-md border border-rose-500/30 bg-rose-500/15 p-4 text-sm text-rose-400"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {exitoMsg ? (
        <div
          data-testid="alerta-exito"
          className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/15 p-4 text-sm text-emerald-400"
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      ) : null}

      {/* Formulario de Alta de Atleta */}
      {mostrarFormularioAlta ? (
        <Card className="border-border bg-card shadow-sm" data-testid="form-alta-atleta">
          <CardHeader>
            <CardTitle className="font-display text-lg uppercase tracking-tight text-foreground">
              Registrar Nuevo Atleta en Mostrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCrearAtleta} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="atleta-nombre">Nombre y Apellido</Label>
                  <Input
                    id="atleta-nombre"
                    data-testid="input-atleta-nombre"
                    placeholder="Ej. Rodrigo De Paul"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="atleta-email">Correo Electrónico</Label>
                  <Input
                    id="atleta-email"
                    type="email"
                    data-testid="input-atleta-email"
                    placeholder="atleta@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="btn-cancelar-alta"
                  onClick={() => setMostrarFormularioAlta(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="btn-guardar-atleta"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground hover:bg-volt-500 font-semibold"
                >
                  {isPending ? "Guardando..." : "Registrar Atleta"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Formulario de Edición de Atleta */}
      {atletaEditando ? (
        <Card className="border-border bg-card shadow-sm" data-testid="form-editar-atleta">
          <CardHeader>
            <CardTitle className="font-display text-lg uppercase tracking-tight text-foreground">
              Editar Ficha de Atleta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActualizarAtleta} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-atleta-nombre">Nombre y Apellido</Label>
                  <Input
                    id="edit-atleta-nombre"
                    data-testid="input-edit-atleta-nombre"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-atleta-email">Email (No modificable)</Label>
                  <Input
                    id="edit-atleta-email"
                    value={atletaEditando.email}
                    disabled
                    className="opacity-70"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-atleta-activo"
                  data-testid="input-edit-atleta-activo"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-border bg-secondary text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-atleta-activo" className="text-sm font-medium">
                  Atleta con Afiliación Activa en este Box
                </Label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="btn-cancelar-edicion-atleta"
                  onClick={() => setAtletaEditando(null)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="btn-guardar-edicion-atleta"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground hover:bg-volt-500 font-semibold"
                >
                  {isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Ficha Individual del Atleta */}
      {atletaFicha ? (
        <Card className="border-border bg-card shadow-sm" data-testid="modal-ficha-atleta">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display text-lg uppercase tracking-tight text-foreground">
                Ficha Individual del Atleta
              </CardTitle>
              <p className="text-xs text-muted-foreground">Datos de identidad y afiliación al Box</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              data-testid="btn-cerrar-ficha-atleta"
              onClick={() => setAtletaFicha(null)}
              className="min-h-8 px-2 py-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Nombre y Apellido</span>
                <span className="font-semibold text-foreground" data-testid="ficha-atleta-nombre">
                  {atletaFicha.nombre}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Correo Electrónico</span>
                <span className="text-foreground" data-testid="ficha-atleta-email">
                  {atletaFicha.email}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Identificador de Afiliación</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {atletaFicha.id}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Roles en este Box</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {atletaFicha.roles.map((rol) => (
                    <Badge key={rol} variant="emerald">
                      {rol}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Estado de la Afiliación</span>
                <div className="mt-1">
                  {atletaFicha.activo ? (
                    <Badge variant="emerald">Activo</Badge>
                  ) : (
                    <Badge variant="zinc">Inactivo</Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Fecha de Registro</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {new Date(atletaFicha.createdAt).toLocaleDateString("es-AR")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar atleta por nombre o correo..."
            data-testid="input-buscar-atleta"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              data-testid="checkbox-solo-activos"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-secondary text-primary focus:ring-primary"
            />
            Solo activos
          </label>
        </div>
      </div>

      {/* Listado / Tabla de Atletas */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="tabla-atletas">
            <thead className="border-b border-border bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {atletasFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      <span>No se encontraron atletas registrados.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                atletasFiltrados.map((atleta) => (
                  <tr
                    key={atleta.id}
                    data-testid={`fila-atleta-${atleta.id}`}
                    className="hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span data-testid={`atleta-nombre-${atleta.id}`}>
                        {atleta.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span data-testid={`atleta-email-${atleta.id}`}>
                        {atleta.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {atleta.roles.map((rol) => (
                          <Badge key={rol} variant="emerald">
                            {rol}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {atleta.activo ? (
                        <Badge variant="emerald" data-testid={`badge-estado-activo-${atleta.id}`}>
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="zinc" data-testid={`badge-estado-inactivo-${atleta.id}`}>
                          Inactivo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          data-testid={`btn-ficha-atleta-${atleta.id}`}
                          onClick={() => {
                            setAtletaFicha(atleta);
                            setAtletaEditando(null);
                            setMostrarFormularioAlta(false);
                          }}
                          className="min-h-8 px-2.5 py-1 text-xs text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only sm:not-sr-only sm:ml-1.5">Ficha</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          data-testid={`btn-editar-atleta-${atleta.id}`}
                          onClick={() => {
                            setAtletaEditando(atleta);
                            setEditNombre(atleta.nombre);
                            setEditActivo(atleta.activo);
                            setAtletaFicha(null);
                            setMostrarFormularioAlta(false);
                            setErrorMsg(null);
                            setExitoMsg(null);
                          }}
                          className="min-h-8 px-2.5 py-1 text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span className="sr-only sm:not-sr-only sm:ml-1.5">Editar</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          data-testid={`btn-eliminar-atleta-${atleta.id}`}
                          onClick={() => handleEliminarAtleta(atleta.id, atleta.nombre)}
                          className="min-h-8 px-2.5 py-1 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only sm:not-sr-only sm:ml-1.5">Desactivar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
