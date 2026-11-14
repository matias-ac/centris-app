import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Plan } from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  crearPlanAction: vi.fn(),
  actualizarPlanAction: vi.fn(),
  eliminarPlanAction: vi.fn()
}));

import { CatalogoPlanesBox } from "./catalogo-planes-box";
import {
  calcularKpisPlanes,
  construirVistaPreviaPlan,
  crearBorradorPlan,
  explicarReglaPlan,
  filtrarPlanes,
  formatearPrecioPlan,
  formatearRangoPreciosActivos,
  obtenerMetaModalidadPlan,
  procesarAlternarActivoPlan,
  procesarBajaPlan,
  procesarGuardadoPlan,
  resumirCreditosPlan,
  traducirErrorPlan,
  validarBorradorPlanLocal
} from "./planes-estado";

const BOX_ID = "00000000-0000-4000-8000-000000000101";

const PLANES_BASE: Plan[] = [
  {
    id: "f1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    nombre: "CrossFit 3 veces por semana",
    precioBase: 38000,
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
    precioBase: 54000,
    duracionDias: 30,
    modalidadCreditos: "ILIMITADO",
    creditosPorPeriodo: null,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  },
  {
    id: "f1000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    nombre: "Bolsa 12 Clases Flexible",
    precioBase: 41500,
    duracionDias: 45,
    modalidadCreditos: "VIGENCIA_TOTAL",
    creditosPorPeriodo: 12,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  },
  {
    id: "f1000000-0000-4000-8000-000000000004",
    boxId: BOX_ID,
    nombre: "Open Box Verano",
    precioBase: 28000,
    duracionDias: 30,
    modalidadCreditos: "SEMANAL",
    creditosPorPeriodo: 2,
    activo: false,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  }
];

describe("Rediseño Dark Bento Cockpit de /planes", () => {
  describe("Módulo planes-estado (formato, KPIs, filtros, validación y errores)", () => {
    it("traduce las modalidades a lenguaje ubicuo humano y badges semánticos sin repetir volt", () => {
      const semanal = obtenerMetaModalidadPlan("SEMANAL");
      const bolsa = obtenerMetaModalidadPlan("VIGENCIA_TOTAL");
      const ilimitado = obtenerMetaModalidadPlan("ILIMITADO");

      expect(semanal.label).toBe("Créditos semanales");
      expect(bolsa.label).toBe("Bolsa por vigencia");
      expect(ilimitado.label).toBe("Ilimitado");

      expect(["mint", "amber", "zinc"]).toContain(semanal.badgeVariant);
      expect(["mint", "amber", "zinc"]).toContain(bolsa.badgeVariant);
      expect(["mint", "amber", "zinc"]).toContain(ilimitado.badgeVariant);
    });

    it("formatea precios en la moneda del Box y resume créditos y reglas en español claro", () => {
      expect(formatearPrecioPlan(35000, "ARS").replace(/\u00a0/g, " ")).toBe(
        "$ 35.000"
      );

      expect(resumirCreditosPlan(PLANES_BASE[0]!)).toBe("3 clases por semana");
      expect(resumirCreditosPlan(PLANES_BASE[1]!)).toBe("Sin tope de clases");
      expect(resumirCreditosPlan(PLANES_BASE[2]!)).toBe("12 clases totales");

      expect(
        explicarReglaPlan({
          duracionDias: 30,
          modalidadCreditos: "SEMANAL",
          creditosPorPeriodo: 3
        })
      ).toContain("Se renuevan cada lunes");
      expect(
        explicarReglaPlan({
          duracionDias: 45,
          modalidadCreditos: "VIGENCIA_TOTAL",
          creditosPorPeriodo: 12
        })
      ).toContain("45 días");
      expect(
        explicarReglaPlan({
          duracionDias: 30,
          modalidadCreditos: "ILIMITADO",
          creditosPorPeriodo: null
        })
      ).toContain("ilimitadas");
    });

    it("calcula KPIs de planes activos, inactivos, rango de precios y modalidades", () => {
      const kpis = calcularKpisPlanes(PLANES_BASE);
      expect(kpis).toEqual({
        total: 4,
        activos: 3,
        inactivos: 1,
        precioMinActivo: 38000,
        precioMaxActivo: 54000,
        modalidadesActivas: 3
      });

      const sinActivos = calcularKpisPlanes([PLANES_BASE[3]!]);
      expect(sinActivos).toEqual({
        total: 1,
        activos: 0,
        inactivos: 1,
        precioMinActivo: null,
        precioMaxActivo: null,
        modalidadesActivas: 0
      });

      expect(formatearRangoPreciosActivos(kpis, "ARS")).toMatch(/38\.000.*54\.000/);
      expect(
        formatearRangoPreciosActivos(
          { precioMinActivo: 42000, precioMaxActivo: 42000 },
          "ARS"
        )
      ).toContain("42.000");
      expect(formatearRangoPreciosActivos(sinActivos, "ARS")).toBe(
        "Sin planes activos"
      );

      expect(
        construirVistaPreviaPlan(
          {
            precioBase: "45000",
            duracionDias: "30",
            modalidadCreditos: "SEMANAL",
            creditosPorPeriodo: "3"
          },
          "ARS"
        )
      ).toContain("Precio de lista:");
      expect(
        construirVistaPreviaPlan(
          {
            precioBase: "",
            duracionDias: "30",
            modalidadCreditos: "ILIMITADO",
            creditosPorPeriodo: ""
          },
          "ARS"
        )
      ).not.toContain("Precio de lista:");
    });

    it("filtra planes por búsqueda de nombre, estado activo/inactivo y modalidad", () => {
      expect(
        filtrarPlanes(PLANES_BASE, {
          busqueda: "bolsa",
          estado: "TODOS",
          modalidad: "TODAS"
        }).map((p) => p.id)
      ).toEqual([PLANES_BASE[2]!.id]);

      expect(
        filtrarPlanes(PLANES_BASE, {
          busqueda: "",
          estado: "INACTIVOS",
          modalidad: "TODAS"
        }).map((p) => p.id)
      ).toEqual([PLANES_BASE[3]!.id]);

      expect(
        filtrarPlanes(PLANES_BASE, {
          busqueda: "",
          estado: "ACTIVOS",
          modalidad: "SEMANAL"
        }).map((p) => p.id)
      ).toEqual([PLANES_BASE[0]!.id]);
    });

    it("valida borrador contra esquemas Zod compartidos y normaliza créditos nulos en ILIMITADO", () => {
      const borradorNuevo = crearBorradorPlan();
      expect(borradorNuevo.modalidadCreditos).toBe("SEMANAL");

      const invalido = validarBorradorPlanLocal({
        nombre: "  ",
        precioBase: "-10",
        duracionDias: "0",
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: "0"
      });
      expect(invalido.ok).toBe(false);

      const ilimitado = validarBorradorPlanLocal({
        nombre: "Pase Libre",
        precioBase: "50000",
        duracionDias: "30",
        modalidadCreditos: "ILIMITADO",
        creditosPorPeriodo: "5"
      });
      expect(ilimitado.ok).toBe(true);
      if (ilimitado.ok) {
        expect(ilimitado.data.creditosPorPeriodo).toBeNull();
      }
    });

    it("traduce códigos de error del servidor sin exponer errorCode ni códigos HTTP", async () => {
      expect(traducirErrorPlan("ACCESO_DENEGADO_ROL")).not.toMatch(
        /ACCESO_DENEGADO_ROL|403|Forbidden/i
      );
      expect(traducirErrorPlan("ERROR_DESCONOCIDO")).not.toMatch(
        /ERROR_DESCONOCIDO|500/
      );
      expect(
        traducirErrorPlan(
          "REGLA_NEGOCIO",
          "El plan tiene membresías activas asociadas."
        )
      ).toBe("El plan tiene membresías activas asociadas.");
      expect(
        traducirErrorPlan("ERROR_SERVIDOR", "SQLSTATE 23505 duplicate key")
      ).not.toMatch(/SQLSTATE|23505/);

      const crearMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        errorCode: "ACCESO_DENEGADO_ROL",
        message: "Forbidden"
      });
      const resCrear = await procesarGuardadoPlan(
        BOX_ID,
        null,
        {
          nombre: "Pase Test",
          precioBase: "35000",
          duracionDias: "30",
          modalidadCreditos: "SEMANAL",
          creditosPorPeriodo: "3"
        },
        crearMock,
        vi.fn()
      );
      expect(resCrear.ok).toBe(false);
      if (!resCrear.ok) {
        expect(resCrear.general).not.toMatch(/ACCESO_DENEGADO_ROL|Forbidden/);
      }

      const actualizarMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resToggle = await procesarAlternarActivoPlan(
        BOX_ID,
        PLANES_BASE[0]!,
        actualizarMock
      );
      expect(resToggle.ok).toBe(true);

      const eliminarMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resBaja = await procesarBajaPlan(
        BOX_ID,
        PLANES_BASE[0]!,
        eliminarMock
      );
      expect(resBaja.ok).toBe(true);
    });
  });

  describe("Render Dark Bento Cockpit, anti-overflow y accesibilidad", () => {
    it("renderiza KPIs, buscador, FilterChips, grilla anti-overflow y tarjetas sin enums crudos ni confirm()", () => {
      const html = renderToStaticMarkup(
        createElement(CatalogoPlanesBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          planesIniciales: PLANES_BASE,
          esAdmin: true
        })
      );

      // Encabezado y CTA principal
      expect(html).toContain("<h1");
      expect(html).toContain("Catálogo de Planes");
      expect(html).toContain('data-testid="btn-nuevo-plan"');

      // KPIs y filtros con tabular-nums
      expect(html).toContain("Planes activos");
      expect(html).toContain("Rango de precios");
      expect(html).toContain("Modalidades en oferta");
      expect(html).toContain("tabular-nums");
      expect(html).toContain('aria-label="Filtrar por estado"');
      expect(html).toContain('aria-label="Filtrar por modalidad de créditos"');
      expect(html).toContain('aria-pressed="true"');

      // Grilla Bento anti-overflow para notebooks (>= 300px)
      expect(html).toContain('data-testid="grilla-planes"');
      expect(html).toContain("minmax(min(100%,300px),1fr)");
      expect(html).toContain("min-w-0");
      expect(html).toContain("flex-wrap");
      expect(html).toContain("min-h-11");

      // Badges humanos y cero enums crudos ni tabla heredada
      expect(html).toContain("Créditos semanales");
      expect(html).toContain("Bolsa por vigencia");
      expect(html).toContain("Ilimitado");
      expect(html).not.toContain("SEMANAL");
      expect(html).not.toContain("VIGENCIA_TOTAL");
      expect(html).not.toContain("ILIMITADO");
      expect(html).not.toContain("<table");
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("uppercase");

      // Selectores preservados y botones táctiles
      const id = PLANES_BASE[0]!.id;
      expect(html).toContain(`data-testid="fila-plan-${id}"`);
      expect(html).toContain(`data-testid="btn-abrir-edicion-${id}"`);
      expect(html).toContain(`data-testid="btn-alternar-activo-${id}"`);
      expect(html).toContain(`data-testid="btn-eliminar-plan-${id}"`);
    });

    it("renderiza InlineConfirm dentro de la tarjeta al confirmar baja sin window.confirm()", () => {
      const id = PLANES_BASE[0]!.id;
      const html = renderToStaticMarkup(
        createElement(CatalogoPlanesBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          planesIniciales: PLANES_BASE,
          esAdmin: true,
          confirmandoBajaInicialId: id
        })
      );

      expect(html).toContain(`data-testid="baja-plan-${id}-panel"`);
      expect(html).toContain(`data-testid="baja-plan-${id}-confirm"`);
      expect(html).toContain(`data-testid="baja-plan-${id}-cancel"`);
      expect(html).toContain("Confirmar baja");
      expect(html).not.toContain("baja lógica");
    });

    it("renderiza SideDrawer accesible unificado para crear o editar plan con vista previa en vivo", () => {
      const html = renderToStaticMarkup(
        createElement(CatalogoPlanesBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          planesIniciales: PLANES_BASE,
          esAdmin: true,
          drawerAbiertoInicial: true
        })
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('data-testid="formulario-crear-plan"');
      expect(html).toContain('data-testid="input-plan-nombre"');
      expect(html).toContain('data-testid="input-plan-precio"');
      expect(html).toContain('data-testid="input-plan-duracion"');
      expect(html).toContain('data-testid="select-plan-modalidad"');
      expect(html).toContain('data-testid="input-plan-creditos"');
      expect(html).toContain('data-testid="btn-guardar-plan"');
      expect(html).toContain("Así lo entenderá recepción y el atleta");
    });

    it("renderiza banner de modo consulta para Recepcionista sin botones de mutación ni 403", () => {
      const html = renderToStaticMarkup(
        createElement(CatalogoPlanesBox, {
          boxId: BOX_ID,
          moneda: "ARS",
          planesIniciales: PLANES_BASE,
          esAdmin: false
        })
      );

      expect(html).toContain('data-testid="banner-solo-lectura"');
      expect(html).not.toContain('aria-label="Filtrar por estado"');
      expect(html).not.toContain('data-testid="btn-nuevo-plan"');
      expect(html).not.toContain("Desactivar");
      expect(html).not.toContain("Dar de baja");
      expect(html).not.toContain("403");
      expect(html).not.toContain("Forbidden");
    });
  });
});
