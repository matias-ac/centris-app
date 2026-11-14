"use client";

import Link from "next/link";
import { AlertCircle, Check, CheckCircle2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { AfiliacionConUsuario, RolAfiliacion } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FilterChips,
  type FilterChipOption
} from "@/components/ui/filter-chips";
import { manejarTeclaInlineConfirm } from "@/components/ui/inline-confirm";
import { Input } from "@/components/ui/input";
import {
  bajaAfiliacionAction,
  guardarRolesAfiliacionAction
} from "@/lib/actions";
import { obtenerInicialesUsuario } from "@/lib/identidad-ui";
import { cn } from "@/lib/utils";
import {
  OPCIONES_ROLES_AFILIACION,
  alternarRolEnBorrador,
  calcularKpisAfiliaciones,
  filtrarAfiliaciones,
  procesarBajaAfiliacion,
  procesarGuardadoRoles,
  sonRolesIguales,
  type FiltroRolAfiliacion
} from "./afiliaciones-estado";

export interface TablaAfiliacionesBoxProps {
  afiliaciones: AfiliacionConUsuario[];
  boxId: string;
  nombreBox: string;
  borradoresIniciales?: Record<string, RolAfiliacion[]>;
  confirmandoBajaInicialId?: string | null;
}

/**
 * Vista accesible cuando el usuario no posee el rol de Administrador en el Box activo.
 */
export function AccesoRestringidoAfiliaciones({
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
          Tu afiliación actual en {nombreBox} no tiene permiso de Administrador
          para modificar roles o quitar accesos de integrantes.
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

function TarjetaKpiAfiliacion({
  etiqueta,
  valor,
  badgeLabel,
  badgeVariant,
  pie
}: {
  etiqueta: string;
  valor: number;
  badgeLabel: string;
  badgeVariant: "mint" | "amber" | "zinc";
  pie: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">
          {etiqueta}
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <strong className="text-[clamp(1.375rem,1.2rem+0.8vw,1.625rem)] font-medium leading-none tracking-[-0.02em] text-foreground tabular-nums">
            {valor}
          </strong>
          <Badge
            variant={badgeVariant}
            className="max-w-full whitespace-normal text-left"
          >
            {badgeLabel}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{pie}</span>
      </div>
    </Card>
  );
}

function FilaAfiliacionBox({
  afiliacion,
  boxId,
  nombreBox,
  borradorInicial,
  confirmandoInicial,
  onRolesGuardados,
  onBajaCompletada
}: {
  afiliacion: AfiliacionConUsuario;
  boxId: string;
  nombreBox: string;
  borradorInicial?: RolAfiliacion[];
  confirmandoInicial?: boolean;
  onRolesGuardados: (afiliacionId: string, roles: RolAfiliacion[]) => void;
  onBajaCompletada: (afiliacionId: string) => void;
}) {
  const router = useRouter();
  const [rolesGuardados, setRolesGuardados] = useState<RolAfiliacion[]>(
    afiliacion.roles
  );
  const [rolesSeleccionados, setRolesSeleccionados] = useState<RolAfiliacion[]>(
    () => borradorInicial ?? afiliacion.roles
  );
  const [confirmandoBaja, setConfirmandoBaja] = useState(
    Boolean(confirmandoInicial)
  );
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const darDeBajaBtnRef = useRef<HTMLButtonElement>(null);
  const cancelarBajaBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setRolesGuardados(afiliacion.roles);
    if (!borradorInicial) {
      setRolesSeleccionados(afiliacion.roles);
    }
  }, [afiliacion.roles, borradorInicial]);

  useEffect(() => {
    if (confirmandoBaja && !confirmandoInicial) {
      cancelarBajaBtnRef.current?.focus();
    }
  }, [confirmandoBaja, confirmandoInicial]);

  const isDirty = !sonRolesIguales(rolesGuardados, rolesSeleccionados);
  const iniciales = obtenerInicialesUsuario(afiliacion.usuario.nombre);

  function alternarRol(rol: RolAfiliacion) {
    setGuardadoOk(false);
    setErrorMsg(null);
    setRolesSeleccionados((prev) => alternarRolEnBorrador(prev, rol));
  }

  function handleDescartar() {
    setErrorMsg(null);
    setGuardadoOk(false);
    setRolesSeleccionados(rolesGuardados);
  }

  function handleGuardarRoles() {
    setErrorMsg(null);
    setGuardadoOk(false);

    startTransition(async () => {
      const resultado = await procesarGuardadoRoles(
        boxId,
        afiliacion.id,
        rolesSeleccionados,
        guardarRolesAfiliacionAction
      );

      if (!resultado.ok) {
        setErrorMsg(resultado.error);
        return;
      }

      setRolesGuardados(resultado.rolesGuardados);
      setRolesSeleccionados(resultado.rolesGuardados);
      setGuardadoOk(true);
      onRolesGuardados(afiliacion.id, resultado.rolesGuardados);
      router.refresh();
    });
  }

  function abrirConfirmacionBaja() {
    setErrorMsg(null);
    setConfirmandoBaja(true);
  }

  function cerrarConfirmacionBaja() {
    if (isPending) {
      return;
    }
    setConfirmandoBaja(false);
    queueMicrotask(() => darDeBajaBtnRef.current?.focus());
  }

  function handleConfirmarBaja() {
    setErrorMsg(null);

    startTransition(async () => {
      const resultado = await procesarBajaAfiliacion(
        boxId,
        afiliacion.id,
        bajaAfiliacionAction
      );

      if (!resultado.ok) {
        setConfirmandoBaja(false);
        setErrorMsg(resultado.error);
        return;
      }

      setConfirmandoBaja(false);
      onBajaCompletada(afiliacion.id);
      router.refresh();
    });
  }

  return (
    <article
      data-testid={`fila-afiliacion-${afiliacion.id}`}
      className={cn(
        "flex min-w-0 flex-col gap-3.5 rounded-2xl border bg-secondary p-4 transition-colors",
        isDirty ? "border-[#FBBF24]/28" : "border-border"
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5 min-[1100px]:grid min-[1100px]:grid-cols-[minmax(210px,1fr)_minmax(300px,1.55fr)_264px] min-[1100px]:items-center min-[1100px]:gap-[18px]">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-semibold text-primary"
          >
            {iniciales}
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-[0.9375rem] font-medium text-foreground">
              {afiliacion.usuario.nombre}
            </strong>
            <span className="block break-words text-sm text-muted-foreground">
              {afiliacion.usuario.email}
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label={`Roles de ${afiliacion.usuario.nombre}`}
          className="flex min-w-0 flex-wrap gap-2"
        >
          {OPCIONES_ROLES_AFILIACION.map((opcion) => {
            const activo = rolesSeleccionados.includes(opcion.id);
            return (
              <button
                key={opcion.id}
                type="button"
                role="switch"
                aria-checked={activo}
                data-testid={`checkbox-rol-${opcion.id}-${afiliacion.id}`}
                disabled={isPending}
                onClick={() => alternarRol(opcion.id)}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                  activo
                    ? "border-primary bg-primary/14 font-semibold text-primary"
                    : "border-border bg-card font-medium text-muted-foreground hover:border-[#3A3C42] hover:text-foreground"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                    activo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {activo ? (
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  ) : null}
                </span>
                <span>{opcion.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 min-[1100px]:justify-end">
          <Button
            type="button"
            variant={isDirty ? "primary" : "secondary"}
            disabled={!isDirty || isPending}
            onClick={handleGuardarRoles}
            className="flex-1 whitespace-nowrap min-[1100px]:flex-initial"
          >
            {isPending && !confirmandoBaja ? "Guardando..." : "Guardar roles"}
          </Button>
          <Button
            ref={darDeBajaBtnRef}
            type="button"
            variant="destructive"
            disabled={isPending || confirmandoBaja}
            onClick={abrirConfirmacionBaja}
            className="flex-1 whitespace-nowrap min-[1100px]:flex-initial"
          >
            Dar de baja
          </Button>
        </div>
      </div>

      {isDirty ? (
        <div
          role="status"
          className="dirty-strip flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] border border-[#FBBF24]/28 bg-[#FBBF24]/14 px-3.5 py-2.5 text-sm text-[#FDE68A]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="amber">Cambios sin guardar</Badge>
            <span>
              Presioná <strong>Guardar roles</strong> para aplicar los nuevos
              permisos.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={handleDescartar}
          >
            Descartar
          </Button>
        </div>
      ) : null}

      {guardadoOk && !isDirty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid={`estado-guardado-${afiliacion.id}`}
          className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[#18FFC8]/28 bg-[#18FFC8]/14 px-3.5 py-2.5 text-sm text-[#18FFC8]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <Badge variant="mint">Roles actualizados</Badge>
          <span>Permisos guardados para {afiliacion.usuario.nombre}.</span>
        </div>
      ) : null}

      {errorMsg ? (
        <div
          role="alert"
          className="flex items-center gap-2 text-sm text-[#FF6D6D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {confirmandoBaja ? (
        <div
          role="group"
          aria-label={`Confirmar baja de ${afiliacion.usuario.nombre}`}
          onKeyDown={(e) =>
            manejarTeclaInlineConfirm(e.key, isPending, cerrarConfirmacionBaja)
          }
          className="confirm-inline flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-3 text-sm text-[#FECACA]"
        >
          <span>
            ¿Quitar el acceso de <strong>{afiliacion.usuario.nombre}</strong> a{" "}
            {nombreBox}? No afectará sus cuentas en otros Boxes.
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmarBaja}
            >
              {isPending ? "Procesando..." : "Confirmar baja"}
            </Button>
            <Button
              ref={cancelarBajaBtnRef}
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={cerrarConfirmacionBaja}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Directorio Bento Dark Cockpit de afiliaciones del Box con filtros, edición de roles y baja inline.
 */
export function TablaAfiliacionesBox({
  afiliaciones,
  boxId,
  nombreBox,
  borradoresIniciales,
  confirmandoBajaInicialId = null
}: TablaAfiliacionesBoxProps) {
  const [listaAfiliaciones, setListaAfiliaciones] =
    useState<AfiliacionConUsuario[]>(afiliaciones);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<FiltroRolAfiliacion>("ALL");

  useEffect(() => {
    setListaAfiliaciones(afiliaciones);
  }, [afiliaciones]);

  const kpis = useMemo(
    () => calcularKpisAfiliaciones(listaAfiliaciones),
    [listaAfiliaciones]
  );

  const afiliacionesFiltradas = useMemo(
    () => filtrarAfiliaciones(listaAfiliaciones, busqueda, filtroRol),
    [listaAfiliaciones, busqueda, filtroRol]
  );

  const opcionesFiltroRol: FilterChipOption<FiltroRolAfiliacion>[] = useMemo(
    () => [
      { value: "ALL", label: "Todos" },
      ...OPCIONES_ROLES_AFILIACION.map((rol) => ({
        value: rol.id,
        label: rol.label
      }))
    ],
    []
  );

  function handleRolesGuardados(
    afiliacionId: string,
    rolesActualizados: RolAfiliacion[]
  ) {
    setListaAfiliaciones((prev) =>
      prev.map((item) =>
        item.id === afiliacionId ? { ...item, roles: rolesActualizados } : item
      )
    );
  }

  function handleBajaCompletada(afiliacionId: string) {
    setListaAfiliaciones((prev) =>
      prev.filter((item) => item.id !== afiliacionId)
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Resumen de integrantes"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4"
      >
        <TarjetaKpiAfiliacion
          etiqueta="Integrantes activos"
          valor={kpis.total}
          badgeLabel="Con acceso"
          badgeVariant="mint"
          pie="Personas vinculadas a este Box"
        />
        <TarjetaKpiAfiliacion
          etiqueta="Staff con acceso operativo"
          valor={kpis.staff}
          badgeLabel="Admin · Coach · Recep"
          badgeVariant="zinc"
          pie="Pueden operar clases, caja o configuración"
        />
        <TarjetaKpiAfiliacion
          etiqueta="Con rol Atleta"
          valor={kpis.atletas}
          badgeLabel="Habilitados a reservar"
          badgeVariant="zinc"
          pie="Incluye miembros del staff que también entrenan"
        />
      </section>

      <Card className="p-4">
        <section
          aria-label="Buscar y filtrar afiliaciones"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="relative min-w-0 flex-1 basis-[260px] max-w-[400px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o email..."
              aria-label="Buscar integrante"
              className="rounded-full pl-10"
            />
          </div>

          <FilterChips
            options={opcionesFiltroRol}
            value={filtroRol}
            onChange={setFiltroRol}
            ariaLabel="Filtrar por rol"
          />
        </section>
      </Card>

      <Card className="p-4 sm:p-5">
        <section aria-label="Listado de afiliaciones activas">
          {afiliacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay afiliaciones activas que coincidan con los filtros.
              </p>
              {busqueda || filtroRol !== "ALL" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroRol("ALL");
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {afiliacionesFiltradas.map((afiliacion) => (
                <FilaAfiliacionBox
                  key={afiliacion.id}
                  afiliacion={afiliacion}
                  boxId={boxId}
                  nombreBox={nombreBox}
                  borradorInicial={borradoresIniciales?.[afiliacion.id]}
                  confirmandoInicial={
                    confirmandoBajaInicialId === afiliacion.id
                  }
                  onRolesGuardados={handleRolesGuardados}
                  onBajaCompletada={handleBajaCompletada}
                />
              ))}
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
