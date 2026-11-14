import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ERROR_CODES,
  type Atleta,
  type Membresia,
  type PagoConRegistrador,
  type Plan
} from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  crearAtletaAction: vi.fn(),
  actualizarAtletaAction: vi.fn(),
  eliminarAtletaAction: vi.fn(),
  asignarMembresiaAction: vi.fn(),
  ajustarCreditosExtraAction: vi.fn(),
  ajustarPrecioMembresiaAction: vi.fn(),
  bajaAnticipadaAction: vi.fn(),
  registrarPagoAction: vi.fn(),
  anularPagoAction: vi.fn()
}));

import {
  AccesoRestringidoAtletas,
  DirectorioAtletasBox
} from "./directorio-atletas-box";
import { FichaMembresiasAtleta } from "./ficha-membresias-atleta";
import {
  calcularKpisAtletas,
  construirResumenesAtletas,
  filtrarAtletasDirectorio,
  formatearCondicionesMembresia,
  formatearMedioPagoHumano,
  procesarAltaAtleta,
  procesarBajaAtleta,
  procesarEdicionAtleta,
  resolverAtletaDeepLink,
  traducirErrorAtleta
} from "./atletas-estado";

const BOX_ID = "00000000-0000-4000-8000-000000000101";
const FECHA_HOY = "2026-11-14";

const PLANES_BASE: Plan[] = [
  {
    id: "f1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    nombre: "Plan 3x Semana",
    precioBase: 42000,
    duracionDias: 30,
    modalidadCreditos: "SEMANAL",
    creditosPorPeriodo: 3,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  },
  {
    id: "f1000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    nombre: "Pase Libre Mensual",
    precioBase: 55000,
    duracionDias: 30,
    modalidadCreditos: "ILIMITADO",
    creditosPorPeriodo: null,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  }
];

const ATLETAS_BASE: Atleta[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    afiliacionId: "a1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    usuarioId: "u1000000-0000-4000-8000-000000000001",
    nombre: "Sofía Castro",
    email: "atleta.aldia@centris.dev",
    roles: ["atleta"],
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z"
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    afiliacionId: "a1000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    usuarioId: "u1000000-0000-4000-8000-000000000002",
    nombre: "Nicolás Pérez",
    email: "atleta.moroso@centris.dev",
    roles: ["atleta"],
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z"
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    afiliacionId: "a1000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    usuarioId: "u1000000-0000-4000-8000-000000000003",
    nombre: "Camila Díaz",
    email: "atleta.nuevo@centris.dev",
    roles: ["atleta"],
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z"
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    afiliacionId: "a1000000-0000-4000-8000-000000000004",
    boxId: BOX_ID,
    usuarioId: "u1000000-0000-4000-8000-000000000004",
    nombre: "Matías Duarte",
    email: "atleta.inactivo@centris.dev",
    roles: ["atleta"],
    activo: false,
    createdAt: "2026-11-01T12:00:00.000Z"
  }
];

const MEMBRESIAS_BASE: Membresia[] = [
  {
    id: "m1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    afiliacionId: ATLETAS_BASE[0]!.afiliacionId,
    planId: PLANES_BASE[0]!.id,
    precio: 42000,
    modalidadCreditos: "SEMANAL",
    creditosPorPeriodo: 3,
    creditosExtra: 1,
    fechaInicio: "2026-11-01",
    fechaFin: "2026-11-30",
    bajaAnticipadaEn: null,
    bajaPorUsuarioId: null,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  },
  {
    id: "m1000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    afiliacionId: ATLETAS_BASE[1]!.afiliacionId,
    planId: PLANES_BASE[1]!.id,
    precio: 55000,
    modalidadCreditos: "ILIMITADO",
    creditosPorPeriodo: null,
    creditosExtra: 0,
    fechaInicio: "2026-11-01",
    fechaFin: "2026-11-30",
    bajaAnticipadaEn: null,
    bajaPorUsuarioId: null,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  }
];

const PAGOS_POR_MEMBRESIA: Record<string, PagoConRegistrador[]> = {
  [MEMBRESIAS_BASE[0]!.id]: [
    {
      id: "p1000000-0000-4000-8000-000000000001",
      boxId: BOX_ID,
      membresiaId: MEMBRESIAS_BASE[0]!.id,
      monto: 42000,
      medioPago: "TRANSFERENCIA",
      fechaPago: "2026-11-01",
      registradoPorUsuarioId: "00000000-0000-4000-8000-000000000201",
      registradoPorNombre: "Martín Gómez",
      anuladoEn: null,
      anuladoPorUsuarioId: null,
      motivoAnulacion: null,
      createdAt: "2026-11-01T12:00:00.000Z"
    }
  ],
  [MEMBRESIAS_BASE[1]!.id]: [
    {
      id: "p1000000-0000-4000-8000-000000000002",
      boxId: BOX_ID,
      membresiaId: MEMBRESIAS_BASE[1]!.id,
      monto: 20000,
      medioPago: "EFECTIVO",
      fechaPago: "2026-11-02",
      registradoPorUsuarioId: "00000000-0000-4000-8000-000000000202",
      registradoPorNombre: "Lucía Fernández",
      anuladoEn: null,
      anuladoPorUsuarioId: null,
      motivoAnulacion: null,
      createdAt: "2026-11-02T12:00:00.000Z"
    }
  ]
};

describe("Rediseño Dark Bento Cockpit de /atletas", () => {
  describe("Módulo atletas-estado (resúmenes, KPIs, filtros, deep-link y errores)", () => {
    it("calcula saldos, planes vigentes y KPIs correctamente en la fecha del Box", () => {
      const resumenes = construirResumenesAtletas({
        atletas: ATLETAS_BASE,
        planes: PLANES_BASE,
        membresias: MEMBRESIAS_BASE,
        pagosPorMembresia: PAGOS_POR_MEMBRESIA,
        fechaHoyBox: FECHA_HOY
      });

      const sofia = resumenes.find((r) => r.atleta.id === ATLETAS_BASE[0]!.id)!;
      const nicolas = resumenes.find((r) => r.atleta.id === ATLETAS_BASE[1]!.id)!;
      const camila = resumenes.find((r) => r.atleta.id === ATLETAS_BASE[2]!.id)!;

      expect(sofia.nombrePlanPrincipal).toBe("Plan 3x Semana");
      expect(sofia.saldoTotal).toBe(0);
      expect(sofia.esMoroso).toBe(false);
      expect(sofia.estadoMembresiaPrincipal).toBe("VIGENTE");

      expect(nicolas.nombrePlanPrincipal).toBe("Pase Libre Mensual");
      expect(nicolas.saldoTotal).toBe(35000);
      expect(nicolas.esMoroso).toBe(true);

      expect(camila.nombrePlanPrincipal).toBeNull();
      expect(camila.estadoMembresiaPrincipal).toBe("SIN_MEMBRESIA");

      const kpis = calcularKpisAtletas(resumenes);
      expect(kpis).toEqual({
        activos: 3,
        conPlanVigente: 2,
        alDia: 2,
        morosos: 1,
        sinMembresia: 1,
        todos: 4
      });
    });

    it("filtra por ACTIVOS, AL_DIA, MOROSOS, SIN_MEMBRESIA, TODOS y búsqueda textual", () => {
      const resumenes = construirResumenesAtletas({
        atletas: ATLETAS_BASE,
        planes: PLANES_BASE,
        membresias: MEMBRESIAS_BASE,
        pagosPorMembresia: PAGOS_POR_MEMBRESIA,
        fechaHoyBox: FECHA_HOY
      });

      expect(
        filtrarAtletasDirectorio(resumenes, { busqueda: "", filtro: "ACTIVOS" }).map(
          (r) => r.atleta.nombre
        )
      ).toEqual(["Sofía Castro", "Nicolás Pérez", "Camila Díaz"]);

      expect(
        filtrarAtletasDirectorio(resumenes, { busqueda: "", filtro: "AL_DIA" }).map(
          (r) => r.atleta.nombre
        )
      ).toEqual(["Sofía Castro", "Camila Díaz"]);

      expect(
        filtrarAtletasDirectorio(resumenes, { busqueda: "", filtro: "MOROSOS" }).map(
          (r) => r.atleta.nombre
        )
      ).toEqual(["Nicolás Pérez"]);

      expect(
        filtrarAtletasDirectorio(resumenes, {
          busqueda: "",
          filtro: "SIN_MEMBRESIA"
        }).map((r) => r.atleta.nombre)
      ).toEqual(["Camila Díaz"]);

      expect(
        filtrarAtletasDirectorio(resumenes, { busqueda: "", filtro: "TODOS" }).map(
          (r) => r.atleta.nombre
        )
      ).toEqual(["Sofía Castro", "Nicolás Pérez", "Camila Díaz", "Matías Duarte"]);

      expect(
        filtrarAtletasDirectorio(resumenes, {
          busqueda: "moroso",
          filtro: "TODOS"
        }).map((r) => r.atleta.nombre)
      ).toEqual(["Nicolás Pérez"]);
    });

    it("resuelve el atleta objetivo cuando llega ?afiliacionId= en la URL", () => {
      const encontrado = resolverAtletaDeepLink(
        ATLETAS_BASE,
        ATLETAS_BASE[1]!.afiliacionId
      );
      expect(encontrado?.nombre).toBe("Nicolás Pérez");
      expect(resolverAtletaDeepLink(ATLETAS_BASE, "no-existe")).toBeNull();
      expect(resolverAtletaDeepLink(ATLETAS_BASE, null)).toBeNull();
    });

    it("traduce condiciones de membresía, medios de pago y códigos de error sin jerga técnica", () => {
      expect(
        formatearCondicionesMembresia({
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null
        })
      ).toBe("Ilimitado");
      expect(
        formatearCondicionesMembresia({
          modalidadCreditos: "SEMANAL",
          creditosPorPeriodo: 3
        })
      ).toBe("3 por semana");
      expect(
        formatearCondicionesMembresia({
          modalidadCreditos: "VIGENCIA_TOTAL",
          creditosPorPeriodo: 8
        })
      ).toBe("8 totales");

      expect(formatearMedioPagoHumano("EFECTIVO")).toBe("Efectivo");
      expect(formatearMedioPagoHumano("TRANSFERENCIA")).toBe("Transferencia");
      expect(formatearMedioPagoHumano("OTRO")).toBe("Otro");

      const msgSuperpuesta = traducirErrorAtleta(
        ERROR_CODES.MEMBRESIA_SUPERPUESTA,
        "MEMBRESIA_SUPERPUESTA"
      );
      expect(msgSuperpuesta).toMatch(/superpone/i);
      expect(msgSuperpuesta).not.toContain("MEMBRESIA_SUPERPUESTA");

      const msgRol = traducirErrorAtleta(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "403 Forbidden"
      );
      expect(msgRol).not.toMatch(/403|Forbidden|ACCESO_DENEGADO_ROL/);
    });

    it("valida localmente el alta, edición y baja de atleta y delega a las actions", async () => {
      const crearMock = vi.fn().mockResolvedValue({ ok: true });
      const editarMock = vi.fn().mockResolvedValue({ ok: true });
      const eliminarMock = vi.fn().mockResolvedValue({ ok: true });

      const invalido = await procesarAltaAtleta(
        BOX_ID,
        { nombre: "", email: "mal" },
        crearMock
      );
      expect(invalido.ok).toBe(false);
      expect(crearMock).not.toHaveBeenCalled();

      const altaOk = await procesarAltaAtleta(
        BOX_ID,
        { nombre: "Luciana Vega", email: "LUCIANA@CENTRIS.DEV" },
        crearMock
      );
      expect(altaOk.ok).toBe(true);
      expect(crearMock).toHaveBeenCalledWith(BOX_ID, {
        nombre: "Luciana Vega",
        email: "luciana@centris.dev"
      });

      const edicionOk = await procesarEdicionAtleta(
        BOX_ID,
        ATLETAS_BASE[0]!.id,
        { nombre: "Sofía Castro Nuevo", activo: true },
        editarMock
      );
      expect(edicionOk.ok).toBe(true);
      expect(editarMock).toHaveBeenCalledWith(BOX_ID, ATLETAS_BASE[0]!.id, {
        nombre: "Sofía Castro Nuevo",
        activo: true
      });

      const bajaOk = await procesarBajaAtleta(
        BOX_ID,
        ATLETAS_BASE[0]!,
        eliminarMock
      );
      expect(bajaOk.ok).toBe(true);
      expect(eliminarMock).toHaveBeenCalledWith(BOX_ID, ATLETAS_BASE[0]!.id);
    });
  });

  describe("Renderizado Dark Bento Cockpit, Deep-Link y Accesibilidad", () => {
    it("renderiza vista de acceso restringido sin 403 Forbidden y con enlace al panel", () => {
      const html = renderToStaticMarkup(
        createElement(AccesoRestringidoAtletas, { nombreBox: "Box Centris Norte" })
      );

      expect(html).toContain('data-testid="acceso-denegado-rol"');
      expect(html).toContain("<h1");
      expect(html).toContain("Volver al panel");
      expect(html).not.toMatch(/403|Forbidden/i);
    });

    it("renderiza KPIs, FilterChips, filas estables con tabular-nums y sin UUIDs en font-mono ni confirm()", () => {
      const html = renderToStaticMarkup(
        createElement(DirectorioAtletasBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: true,
          fechaHoyBox: FECHA_HOY,
          atletasIniciales: ATLETAS_BASE,
          planes: PLANES_BASE,
          membresias: MEMBRESIAS_BASE,
          pagosPorMembresia: PAGOS_POR_MEMBRESIA
        })
      );

      expect(html).toContain('data-testid="filtro-atletas-activos"');
      expect(html).toContain('data-testid="filtro-atletas-al-dia"');
      expect(html).toContain('data-testid="filtro-atletas-morosos"');
      expect(html).toContain('data-testid="filtro-atletas-sin-membresia"');
      expect(html).toContain('data-testid="filtro-atletas-todos"');

      expect(html).toContain("Sofía Castro");
      expect(html).toContain("Nicolás Pérez");
      expect(html).toContain("Debe");
      expect(html).toContain("35.000");
      expect(html).toContain("tabular-nums");
      expect(html).not.toContain("font-mono");
      expect(html).not.toContain("Matías Duarte");
    });

    it("renderiza InlineConfirmPanel dentro de la fila al confirmar baja sin window.confirm()", () => {
      const html = renderToStaticMarkup(
        createElement(DirectorioAtletasBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: true,
          fechaHoyBox: FECHA_HOY,
          atletasIniciales: ATLETAS_BASE,
          planes: PLANES_BASE,
          membresias: MEMBRESIAS_BASE,
          pagosPorMembresia: PAGOS_POR_MEMBRESIA,
          confirmandoBajaInicialId: ATLETAS_BASE[0]!.id
        })
      );

      expect(html).toContain(`data-testid="baja-atleta-${ATLETAS_BASE[0]!.id}-panel"`);
      expect(html).toContain(`data-testid="baja-atleta-${ATLETAS_BASE[0]!.id}-confirm"`);
      expect(html).toContain("Confirmar baja");
    });

    it("abre automáticamente el SideDrawer de ficha cuando recibe ?afiliacionId= válido", () => {
      const html = renderToStaticMarkup(
        createElement(DirectorioAtletasBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: true,
          fechaHoyBox: FECHA_HOY,
          afiliacionIdInicial: ATLETAS_BASE[1]!.afiliacionId,
          atletasIniciales: ATLETAS_BASE,
          planes: PLANES_BASE,
          membresias: MEMBRESIAS_BASE,
          pagosPorMembresia: PAGOS_POR_MEMBRESIA
        })
      );

      expect(html).toContain('data-testid="modal-ficha-atleta"');
      expect(html).toContain('data-testid="btn-cerrar-ficha-atleta"');
      expect(html).toContain("Nicolás Pérez");
      expect(html).toContain("35.000");
      expect(html).toContain('data-testid="badge-moroso"');
      expect(html).not.toContain("font-mono");
    });

    it("renderiza FichaMembresiasAtleta con controles >= 44px, text-base, sin enums crudos y ocultando acciones admin a Recepción", () => {
      const htmlAdmin = renderToStaticMarkup(
        createElement(FichaMembresiasAtleta, {
          boxId: BOX_ID,
          moneda: "ARS",
          afiliacionId: ATLETAS_BASE[1]!.afiliacionId,
          planes: PLANES_BASE,
          membresias: [MEMBRESIAS_BASE[1]!],
          pagosPorMembresia: PAGOS_POR_MEMBRESIA,
          esAdministrador: true,
          fechaHoyBox: FECHA_HOY
        })
      );

      expect(htmlAdmin).toContain("Pase Libre Mensual");
      expect(htmlAdmin).toContain("Ilimitado");
      expect(htmlAdmin).toContain("Efectivo");
      expect(htmlAdmin).toContain("min-h-11");
      expect(htmlAdmin).toContain("text-base");
      expect(htmlAdmin).toContain('data-testid="btn-guardar-precio-membresia"');
      expect(htmlAdmin).toContain('data-testid="btn-baja-anticipada"');
      expect(htmlAdmin).not.toContain("sm:text-xs");
      expect(htmlAdmin).not.toContain("h-7 ");
      expect(htmlAdmin).not.toContain("h-8 ");

      const htmlRecepcion = renderToStaticMarkup(
        createElement(FichaMembresiasAtleta, {
          boxId: BOX_ID,
          moneda: "ARS",
          afiliacionId: ATLETAS_BASE[1]!.afiliacionId,
          planes: PLANES_BASE,
          membresias: [MEMBRESIAS_BASE[1]!],
          pagosPorMembresia: PAGOS_POR_MEMBRESIA,
          esAdministrador: false,
          fechaHoyBox: FECHA_HOY
        })
      );

      expect(htmlRecepcion).not.toContain('data-testid="btn-guardar-precio-membresia"');
      expect(htmlRecepcion).not.toContain('data-testid="btn-baja-anticipada"');
      expect(htmlRecepcion).not.toContain('data-testid="btn-anular-pago-');
    });
  });
});
