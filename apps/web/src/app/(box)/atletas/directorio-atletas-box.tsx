"use client";

import {
  Edit3,
  Eye,
  Search,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  obtenerFechaLocal,
  type Atleta,
  type Membresia,
  type Moroso,
  type PagoConRegistrador,
  type Plan
} from "@centris/shared";
import { AccesoRestringidoCard } from "@/components/ui/acceso-restringido-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FilterChips,
  type FilterChipOption
} from "@/components/ui/filter-chips";
import {
  InlineConfirmPanel,
  useInlineConfirm
} from "@/components/ui/inline-confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SideDrawer } from "@/components/ui/side-drawer";
import { obtenerEtiquetaRol } from "@/lib/identidad-ui";
import { cn, formatearMoneda } from "@/lib/utils";
import {
  calcularKpisAtletas,
  construirResumenesAtletas,
  filtrarAtletasDirectorio,
  procesarAltaAtleta,
  procesarBajaAtleta,
  procesarEdicionAtleta,
  resolverAtletaDeepLink,
  type FiltroDirectorioAtletas,
  type ResumenAtletaDirectorio
} from "./atletas-estado";
import {
  AlertaOperacionAtletas,
  FichaMembresiasAtleta
} from "./ficha-membresias-atleta";

export interface DirectorioAtletasBoxProps {
  boxId: string;
  moneda: string;
  esAdministrador: boolean;
  fechaHoyBox?: string;
  afiliacionIdInicial?: string | null;
  atletasIniciales: Atleta[];
  planes: Plan[];
  membresias: Membresia[];
  morosos?: Moroso[];
  pagosPorMembresia?: Record<string, PagoConRegistrador[]>;
  confirmandoBajaInicialId?: string | null;
}

type DrawerAtletaState =
  | { tipo: "alta" }
  | { tipo: "editar"; atletaId: string }
  | { tipo: "ficha"; atletaId: string }
  | null;

const FORM_ALTA_ID = "form-alta-atleta";
const FORM_EDICION_ID = "form-editar-atleta";

/**
 * Vista accesible cuando el usuario no posee permisos de Recepción o Administración.
 */
export function AccesoRestringidoAtletas({
  nombreBox
}: {
  nombreBox: string;
}) {
  return (
    <AccesoRestringidoCard
      headingAs="h1"
      titulo="Acceso restringido a Recepción y Administración"
      badgeLabel="Permiso requerido"
      descripcion={`Tu afiliación en ${nombreBox} no posee permisos de Recepción o Administración para consultar o gestionar el directorio de atletas.`}
    />
  );
}

function TarjetaKpiAtletas({
  etiqueta,
  valor,
  badgeLabel,
  badgeVariant,
  pie
}: {
  etiqueta: string;
  valor: number;
  badgeLabel: string;
  badgeVariant: "mint" | "coral" | "zinc";
  pie: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <strong className="text-[clamp(1.75rem,1.45rem+1.4vw,2.375rem)] font-bold leading-[1.1] tracking-[-0.025em] text-foreground tabular-nums">
            {valor}
          </strong>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{pie}</span>
      </div>
    </Card>
  );
}

function InsigniasAfiliacion({
  atleta,
  conTestIds = false
}: {
  atleta: Pick<Atleta, "id" | "activo" | "roles">;
  conTestIds?: boolean;
}) {
  return (
    <>
      {atleta.activo ? (
        <Badge
          variant="mint"
          data-testid={conTestIds ? `badge-estado-activo-${atleta.id}` : undefined}
        >
          Activo
        </Badge>
      ) : (
        <Badge
          variant="zinc"
          data-testid={conTestIds ? `badge-estado-inactivo-${atleta.id}` : undefined}
        >
          Inactivo
        </Badge>
      )}
      {atleta.roles.map((rol) => {
        const meta = obtenerEtiquetaRol(rol);
        return (
          <Badge key={rol} variant={meta.variant}>
            {meta.label}
          </Badge>
        );
      })}
    </>
  );
}

function FilaAtleta({
  resumen,
  moneda,
  isPending,
  confirmandoInicial,
  onAbrirFicha,
  onAbrirEditar,
  onConfirmarBaja
}: {
  resumen: ResumenAtletaDirectorio;
  moneda: string;
  isPending: boolean;
  confirmandoInicial: boolean;
  onAbrirFicha: (atleta: Atleta) => void;
  onAbrirEditar: (atleta: Atleta) => void;
  onConfirmarBaja: (atleta: Atleta) => Promise<void>;
}) {
  const {
    atleta,
    iniciales,
    membresiaPrincipal,
    nombrePlanPrincipal,
    estadoMembresiaPrincipal,
    saldoTotal,
    esMoroso
  } = resumen;

  const confirmBaja = useInlineConfirm({
    defaultOpen: confirmandoInicial,
    pending: isPending,
    onConfirm: async () => {
      await onConfirmarBaja(atleta);
    }
  });

  return (
    <article
      data-testid={`fila-atleta-${atleta.id}`}
      className={cn(
        "flex flex-col gap-3.5 rounded-2xl border border-border bg-secondary p-4 transition-colors hover:border-[#32343B] lg:grid lg:grid-cols-[minmax(210px,1.35fr)_minmax(180px,1fr)_170px_auto] lg:items-center lg:gap-4",
        !atleta.activo && "opacity-70"
      )}
    >
      {/* Identidad del Atleta */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-semibold text-foreground"
        >
          {iniciales}
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              data-testid={`atleta-nombre-${atleta.id}`}
              className="truncate font-medium text-foreground"
            >
              {atleta.nombre}
            </span>
            <InsigniasAfiliacion atleta={atleta} conTestIds />
          </div>
          <p
            data-testid={`atleta-email-${atleta.id}`}
            className="truncate text-xs text-muted-foreground"
          >
            {atleta.email}
          </p>
        </div>
      </div>

      {/* Plan y Vigencia */}
      <div className="min-w-0 space-y-0.5 text-xs">
        {membresiaPrincipal ? (
          <>
            <div className="truncate text-sm font-medium text-foreground">
              {nombrePlanPrincipal}
            </div>
            <div className="text-muted-foreground tabular-nums">
              {estadoMembresiaPrincipal === "FUTURA"
                ? `Inicia ${membresiaPrincipal.fechaInicio}`
                : `Hasta ${membresiaPrincipal.fechaFin}`}
              {membresiaPrincipal.creditosExtra !== 0
                ? ` · ${membresiaPrincipal.creditosExtra > 0 ? `+${membresiaPrincipal.creditosExtra}` : membresiaPrincipal.creditosExtra} extra`
                : ""}
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            Sin membresía asignada
          </span>
        )}
      </div>

      {/* Estado Contable / Saldo */}
      <div className="flex flex-wrap items-center gap-2">
        {esMoroso ? (
          <Badge
            variant="coral"
            data-testid="badge-atleta-moroso"
            className="tabular-nums"
          >
            Debe {formatearMoneda(saldoTotal, moneda)}
          </Badge>
        ) : estadoMembresiaPrincipal === "VIGENTE" ||
          estadoMembresiaPrincipal === "FUTURA" ? (
          <Badge variant="mint">Al día</Badge>
        ) : estadoMembresiaPrincipal === "VENCIDA" ? (
          <Badge variant="zinc">Vencida</Badge>
        ) : estadoMembresiaPrincipal === "BAJA_ANTICIPADA" ? (
          <Badge variant="zinc">Baja anticipada</Badge>
        ) : (
          <Badge variant="amber">Pendiente de alta</Badge>
        )}
      </div>

      {/* Acciones por Fila */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          data-testid={`btn-ficha-atleta-${atleta.id}`}
          disabled={isPending}
          onClick={() => onAbrirFicha(atleta)}
        >
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ficha y pagos</span>
        </Button>

        <Button
          type="button"
          variant="iconCircle"
          aria-label={`Editar ${atleta.nombre}`}
          title="Editar atleta"
          data-testid={`btn-editar-atleta-${atleta.id}`}
          disabled={isPending}
          onClick={() => onAbrirEditar(atleta)}
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
        </Button>

        {atleta.activo ? (
          <Button
            ref={confirmBaja.triggerRef}
            type="button"
            variant="iconCircle"
            aria-label={`Desactivar ${atleta.nombre}`}
            title="Desactivar atleta"
            data-testid={`btn-eliminar-atleta-${atleta.id}`}
            disabled={isPending}
            onClick={confirmBaja.abrir}
            className="border-[#FF6D6D]/28 bg-[#FF6D6D]/14 text-[#FF6D6D] hover:border-[#FF6D6D]/45 hover:bg-[#FF6D6D]/22"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {confirmBaja.confirmando ? (
        <InlineConfirmPanel
          ariaLabel={`Confirmar desactivación de ${atleta.nombre}`}
          message={
            <span>
              ¿Desactivar a <strong>{atleta.nombre}</strong> en este Box?
            </span>
          }
          confirmLabel="Confirmar baja"
          cancelLabel="Mantener"
          bloqueado={confirmBaja.bloqueado}
          cancelRef={confirmBaja.cancelRef}
          onConfirm={() => {
            void confirmBaja.confirmar();
          }}
          onCancel={confirmBaja.cancelar}
          testIdPrefix={`baja-atleta-${atleta.id}`}
          className="col-span-full border-[#FF6D6D]/28 bg-[#FF6D6D]/14"
          messageClassName="text-foreground"
        />
      ) : null}
    </article>
  );
}

/**
 * Directorio de Atletas del Box en estética Dark Bento Cockpit con SideDrawer y baja inline.
 */
export function DirectorioAtletasBox({
  boxId,
  moneda,
  esAdministrador,
  fechaHoyBox = obtenerFechaLocal(new Date(), "America/Argentina/Buenos_Aires"),
  afiliacionIdInicial = null,
  atletasIniciales,
  planes,
  membresias,
  morosos = [],
  pagosPorMembresia = {},
  confirmandoBajaInicialId = null
}: DirectorioAtletasBoxProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroDirectorioAtletas>("ACTIVOS");

  const atletaDeepLinkInicial = resolverAtletaDeepLink(
    atletasIniciales,
    afiliacionIdInicial
  );
  const [drawer, setDrawer] = useState<DrawerAtletaState>(() =>
    atletaDeepLinkInicial
      ? { tipo: "ficha", atletaId: atletaDeepLinkInicial.id }
      : null
  );
  const ultimoDeepLinkRef = useRef<string | null>(afiliacionIdInicial ?? null);

  useEffect(() => {
    if (
      afiliacionIdInicial &&
      afiliacionIdInicial !== ultimoDeepLinkRef.current
    ) {
      ultimoDeepLinkRef.current = afiliacionIdInicial;
      const encontrado = resolverAtletaDeepLink(
        atletasIniciales,
        afiliacionIdInicial
      );
      if (encontrado) {
        setDrawer({ tipo: "ficha", atletaId: encontrado.id });
      }
    }
  }, [afiliacionIdInicial, atletasIniciales]);

  // Estados de alta
  const [nombreAlta, setNombreAlta] = useState("");
  const [emailAlta, setEmailAlta] = useState("");

  // Estados de edición
  const [editNombre, setEditNombre] = useState("");
  const [editActivo, setEditActivo] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resumenes = useMemo(
    () =>
      construirResumenesAtletas({
        atletas: atletasIniciales,
        planes,
        membresias,
        pagosPorMembresia,
        morosos,
        fechaHoyBox
      }),
    [atletasIniciales, planes, membresias, pagosPorMembresia, morosos, fechaHoyBox]
  );

  const kpis = useMemo(() => calcularKpisAtletas(resumenes), [resumenes]);

  const resumenesFiltrados = useMemo(
    () => filtrarAtletasDirectorio(resumenes, { busqueda, filtro }),
    [resumenes, busqueda, filtro]
  );

  const atletaEnEdicion = useMemo(() => {
    if (drawer?.tipo !== "editar") return null;
    return atletasIniciales.find((a) => a.id === drawer.atletaId) ?? null;
  }, [drawer, atletasIniciales]);

  const atletaEnFicha = useMemo(() => {
    if (drawer?.tipo !== "ficha") return null;
    return atletasIniciales.find((a) => a.id === drawer.atletaId) ?? null;
  }, [drawer, atletasIniciales]);

  const opcionesFiltro: readonly FilterChipOption<FiltroDirectorioAtletas>[] = [
    {
      value: "ACTIVOS",
      label: "Activos",
      count: kpis.activos,
      testId: "filtro-atletas-activos"
    },
    {
      value: "AL_DIA",
      label: "Al día",
      count: kpis.alDia,
      testId: "filtro-atletas-al-dia"
    },
    {
      value: "MOROSOS",
      label: "Morosos",
      count: kpis.morosos,
      testId: "filtro-atletas-morosos"
    },
    {
      value: "SIN_MEMBRESIA",
      label: "Sin membresía",
      count: kpis.sinMembresia,
      testId: "filtro-atletas-sin-membresia"
    },
    {
      value: "TODOS",
      label: "Todos",
      count: kpis.todos,
      testId: "filtro-atletas-todos"
    }
  ];

  function abrirDrawerAlta() {
    setErrorMsg(null);
    setExitoMsg(null);
    setNombreAlta("");
    setEmailAlta("");
    setDrawer({ tipo: "alta" });
  }

  function abrirDrawerEditar(atleta: Atleta) {
    setErrorMsg(null);
    setExitoMsg(null);
    setEditNombre(atleta.nombre);
    setEditActivo(atleta.activo);
    setDrawer({ tipo: "editar", atletaId: atleta.id });
  }

  function abrirDrawerFicha(atleta: Atleta) {
    setErrorMsg(null);
    setExitoMsg(null);
    setDrawer({ tipo: "ficha", atletaId: atleta.id });
  }

  function cerrarDrawer() {
    const veniaDeDeepLink = Boolean(afiliacionIdInicial);
    setDrawer(null);
    if (veniaDeDeepLink) {
      ultimoDeepLinkRef.current = null;
      router.replace("/atletas", { scroll: false });
    }
  }

  function handleCrearAtleta(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const resultado = await procesarAltaAtleta(boxId, {
        nombre: nombreAlta,
        email: emailAlta
      });
      if (!resultado.ok) {
        setErrorMsg(resultado.error);
        return;
      }

      setExitoMsg(resultado.mensajeExito);
      setNombreAlta("");
      setEmailAlta("");
      cerrarDrawer();
      router.refresh();
    });
  }

  function handleActualizarAtleta(e: React.FormEvent) {
    e.preventDefault();
    if (!atletaEnEdicion) return;
    setErrorMsg(null);
    setExitoMsg(null);

    startTransition(async () => {
      const resultado = await procesarEdicionAtleta(boxId, atletaEnEdicion.id, {
        nombre: editNombre,
        activo: editActivo
      });
      if (!resultado.ok) {
        setErrorMsg(resultado.error);
        return;
      }

      setExitoMsg(resultado.mensajeExito);
      cerrarDrawer();
      router.refresh();
    });
  }

  async function handleConfirmarBaja(atleta: Atleta) {
    setErrorMsg(null);
    setExitoMsg(null);

    const resultado = await procesarBajaAtleta(boxId, atleta);
    if (!resultado.ok) {
      setErrorMsg(resultado.error);
      return;
    }

    setExitoMsg(resultado.mensajeExito);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
            Directorio de atletas
          </h1>
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            Buscá atletas del Box, consultá su membresía vigente o abrí su ficha para cobrar y asignar planes.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          data-testid="btn-nuevo-atleta"
          onClick={abrirDrawerAlta}
        >
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Nuevo atleta</span>
        </Button>
      </header>

      {errorMsg && drawer?.tipo !== "alta" && drawer?.tipo !== "editar" ? (
        <AlertaOperacionAtletas
          tipo="error"
          mensaje={errorMsg}
          testId="alerta-error"
        />
      ) : null}

      {exitoMsg ? (
        <AlertaOperacionAtletas
          tipo="exito"
          mensaje={exitoMsg}
          testId="alerta-exito"
        />
      ) : null}

      {/* KPIs Resumen */}
      <section
        aria-label="Resumen del padrón"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4"
      >
        <TarjetaKpiAtletas
          etiqueta="Atletas activos"
          valor={kpis.activos}
          badgeLabel="Padrón"
          badgeVariant="mint"
          pie="Con afiliación activa en este Box"
        />
        <TarjetaKpiAtletas
          etiqueta="Con plan vigente"
          valor={kpis.conPlanVigente}
          badgeLabel="Membresías"
          badgeVariant="zinc"
          pie="Vigencia en curso o renovación futura"
        />
        <TarjetaKpiAtletas
          etiqueta="Con saldo pendiente"
          valor={kpis.morosos}
          badgeLabel={kpis.morosos > 0 ? "Seguimiento" : "Al día"}
          badgeVariant={kpis.morosos > 0 ? "coral" : "mint"}
          pie="No bloquea reservas ni asistencias"
        />
      </section>

      {/* Buscador y Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar atleta por nombre o correo"
              placeholder="Buscar por nombre o correo..."
              data-testid="input-buscar-atleta"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="rounded-full pl-10"
            />
          </div>

          <FilterChips
            ariaLabel="Filtrar atletas por estado"
            options={opcionesFiltro}
            value={filtro}
            onChange={setFiltro}
          />
        </div>
      </Card>

      {/* Listado de Atletas en Bento */}
      <section
        aria-label="Listado de atletas"
        data-testid="tabla-atletas"
        className="space-y-2.5 rounded-3xl border border-border bg-card p-3.5"
      >
        {resumenesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No se encontraron atletas con esos filtros
              </p>
              <p className="text-xs text-muted-foreground">
                Probá cambiando el término de búsqueda o seleccionando otro filtro.
              </p>
            </div>
            {busqueda.trim().length > 0 || filtro !== "ACTIVOS" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setBusqueda("");
                  setFiltro("ACTIVOS");
                }}
              >
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        ) : (
          resumenesFiltrados.map((resumen) => (
            <FilaAtleta
              key={resumen.atleta.id}
              resumen={resumen}
              moneda={moneda}
              isPending={isPending}
              confirmandoInicial={confirmandoBajaInicialId === resumen.atleta.id}
              onAbrirFicha={abrirDrawerFicha}
              onAbrirEditar={abrirDrawerEditar}
              onConfirmarBaja={handleConfirmarBaja}
            />
          ))
        )}
      </section>

      {/* SideDrawer: Alta de Atleta */}
      <SideDrawer
        open={drawer?.tipo === "alta"}
        onClose={cerrarDrawer}
        title="Nuevo atleta en mostrador"
        description="Creá la ficha del atleta para vincularlo al Box y asignarle su plan."
        testId="drawer-alta-atleta"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              data-testid="btn-cancelar-alta"
              disabled={isPending}
              onClick={cerrarDrawer}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_ALTA_ID}
              variant="primary"
              data-testid="btn-guardar-atleta"
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Registrar atleta"}
            </Button>
          </>
        }
      >
        <form
          id={FORM_ALTA_ID}
          data-testid="form-alta-atleta"
          onSubmit={handleCrearAtleta}
          className="space-y-4"
        >
          {errorMsg ? (
            <AlertaOperacionAtletas
              tipo="error"
              mensaje={errorMsg}
              testId="alerta-error"
            />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="atleta-nombre">Nombre y apellido</Label>
            <Input
              id="atleta-nombre"
              data-testid="input-atleta-nombre"
              placeholder="Ej. Valentina Gómez"
              value={nombreAlta}
              onChange={(e) => setNombreAlta(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atleta-email">Correo electrónico</Label>
            <Input
              id="atleta-email"
              type="email"
              data-testid="input-atleta-email"
              placeholder="atleta@correo.com"
              value={emailAlta}
              onChange={(e) => setEmailAlta(e.target.value)}
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Si el usuario no tenía cuenta en Centris, podrá activar su contraseña en el primer ingreso.
            </p>
          </div>
        </form>
      </SideDrawer>

      {/* SideDrawer: Edición de Atleta */}
      <SideDrawer
        open={drawer?.tipo === "editar" && atletaEnEdicion !== null}
        onClose={cerrarDrawer}
        title="Editar ficha de atleta"
        description={atletaEnEdicion?.email}
        testId="drawer-editar-atleta"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              data-testid="btn-cancelar-edicion-atleta"
              disabled={isPending}
              onClick={cerrarDrawer}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_EDICION_ID}
              variant="primary"
              data-testid="btn-guardar-edicion-atleta"
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </>
        }
      >
        {atletaEnEdicion ? (
          <form
            id={FORM_EDICION_ID}
            data-testid="form-editar-atleta"
            onSubmit={handleActualizarAtleta}
            className="space-y-4"
          >
            {errorMsg ? (
              <AlertaOperacionAtletas
                tipo="error"
                mensaje={errorMsg}
                testId="alerta-error"
              />
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-atleta-nombre">Nombre y apellido</Label>
              <Input
                id="edit-atleta-nombre"
                data-testid="input-edit-atleta-nombre"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-atleta-email">
                Correo electrónico (identidad global)
              </Label>
              <Input
                id="edit-atleta-email"
                value={atletaEnEdicion.email}
                disabled
              />
            </div>

            <label
              htmlFor="edit-atleta-activo"
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-foreground"
            >
              <input
                type="checkbox"
                id="edit-atleta-activo"
                data-testid="input-edit-atleta-activo"
                checked={editActivo}
                onChange={(e) => setEditActivo(e.target.checked)}
                disabled={isPending}
                className="h-4 w-4 rounded border-border bg-background accent-[#C1F429]"
              />
              <span>Atleta con afiliación activa en este Box</span>
            </label>
          </form>
        ) : null}
      </SideDrawer>

      {/* SideDrawer: Ficha Individual del Atleta y Membresías */}
      <SideDrawer
        open={drawer?.tipo === "ficha" && atletaEnFicha !== null}
        onClose={cerrarDrawer}
        title={atletaEnFicha?.nombre ?? "Ficha de atleta"}
        description={atletaEnFicha?.email}
        testId="modal-ficha-atleta"
        closeTestId="btn-cerrar-ficha-atleta"
        className="lg:max-w-2xl"
      >
        {atletaEnFicha ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-secondary p-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs text-muted-foreground">
                  Nombre y apellido
                </span>
                <span
                  className="font-medium text-foreground"
                  data-testid="ficha-atleta-nombre"
                >
                  {atletaEnFicha.nombre}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Correo electrónico
                </span>
                <span
                  className="break-all text-sm text-foreground"
                  data-testid="ficha-atleta-email"
                >
                  {atletaEnFicha.email}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Roles y estado en el Box
                </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <InsigniasAfiliacion atleta={atletaEnFicha} />
                </div>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Fecha de registro
                </span>
                <span className="text-sm text-foreground tabular-nums">
                  {new Date(atletaEnFicha.createdAt).toLocaleDateString("es-AR")}
                </span>
              </div>
            </div>

            <FichaMembresiasAtleta
              key={atletaEnFicha.afiliacionId}
              boxId={boxId}
              moneda={moneda}
              afiliacionId={atletaEnFicha.afiliacionId}
              planes={planes}
              membresias={membresias.filter(
                (membresia) =>
                  membresia.afiliacionId === atletaEnFicha.afiliacionId
              )}
              pagosPorMembresia={pagosPorMembresia}
              esAdministrador={esAdministrador}
              fechaHoyBox={fechaHoyBox}
            />
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}
