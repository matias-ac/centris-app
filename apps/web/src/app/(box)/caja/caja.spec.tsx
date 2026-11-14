import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ERROR_CODES,
  type Moroso,
  type PagoConRegistrador
} from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  anularPagoAction: vi.fn()
}));

import { anularPagoAction } from "@/lib/actions";
import {
  AccesoRestringidoCaja,
  PanelCajaMorosos
} from "./panel-caja-morosos";
import {
  calcularKpisCaja,
  construirUrlFichaAtleta,
  filtrarAuditoriaCaja,
  filtrarMorososCaja,
  formatearMedioPagoCaja,
  procesarAnulacionPago,
  traducirErrorCaja
} from "./caja-estado";

const BOX_ID = "00000000-0000-4000-8000-000000000101";

const MOROSOS_BASE: Moroso[] = [
  {
    afiliacionId: "a1000000-0000-4000-8000-000000000001",
    usuarioId: "u1000000-0000-4000-8000-000000000001",
    nombre: "Nicolás Pérez",
    email: "atleta.moroso@centris.dev",
    totalDeuda: 35000,
    membresiasConDeuda: [
      {
        membresiaId: "m1000000-0000-4000-8000-000000000001",
        nombrePlan: "Pase Libre Mensual",
        precio: 55000,
        totalPagado: 20000,
        saldo: 35000,
        fechaInicio: "2026-11-01",
        fechaFin: "2026-11-30"
      }
    ]
  },
  {
    afiliacionId: "a1000000-0000-4000-8000-000000000002",
    usuarioId: "u1000000-0000-4000-8000-000000000002",
    nombre: "Valentina Gómez",
    email: "valen.gomez@centris.dev",
    totalDeuda: 19000,
    membresiasConDeuda: [
      {
        membresiaId: "m1000000-0000-4000-8000-000000000002",
        nombrePlan: "Plan 3x Semana",
        precio: 38000,
        totalPagado: 19000,
        saldo: 19000,
        fechaInicio: "2026-11-01",
        fechaFin: "2026-11-30"
      }
    ]
  }
];

const PAGOS_BASE: PagoConRegistrador[] = [
  {
    id: "p1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    membresiaId: "m1000000-0000-4000-8000-000000000001",
    monto: 20000,
    medioPago: "EFECTIVO",
    fechaPago: "2026-11-12",
    registradoPorUsuarioId: "00000000-0000-4000-8000-000000000202",
    registradoPorNombre: "Lucía Fernández",
    anuladoEn: null,
    anuladoPorUsuarioId: null,
    motivoAnulacion: null,
    createdAt: "2026-11-12T12:00:00.000Z"
  },
  {
    id: "p1000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    membresiaId: "m1000000-0000-4000-8000-000000000002",
    monto: 19000,
    medioPago: "TRANSFERENCIA",
    fechaPago: "2026-11-13",
    registradoPorUsuarioId: "00000000-0000-4000-8000-000000000201",
    registradoPorNombre: "Martín Gómez",
    anuladoEn: null,
    anuladoPorUsuarioId: null,
    motivoAnulacion: null,
    createdAt: "2026-11-13T12:00:00.000Z"
  },
  {
    id: "p1000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    membresiaId: "m1000000-0000-4000-8000-000000000002",
    monto: 38000,
    medioPago: "OTRO",
    fechaPago: "2026-11-10",
    registradoPorUsuarioId: "00000000-0000-4000-8000-000000000202",
    registradoPorNombre: "Lucía Fernández",
    anuladoEn: "2026-11-10T18:10:00.000Z",
    anuladoPorUsuarioId: "00000000-0000-4000-8000-000000000201",
    motivoAnulacion: "Comprobante duplicado por error de carga",
    createdAt: "2026-11-10T12:00:00.000Z"
  }
];

describe("Rediseño Dark Bento Cockpit de /caja", () => {
  describe("Módulo caja-estado (KPIs, filtros, deep-link, errores y anulación)", () => {
    it("calcula KPIs de deuda pendiente, morosos e ingresos válidos excluyendo anulados", () => {
      const kpis = calcularKpisCaja(MOROSOS_BASE, PAGOS_BASE);

      expect(kpis).toEqual({
        deudaTotalPendiente: 54000,
        cantidadMorosos: 2,
        ingresosValidos: 39000,
        cantidadPagosValidos: 2,
        cantidadPagosAnulados: 1,
        totalPagos: 3
      });
    });

    it("filtra morosos por nombre o email sin distinguir mayúsculas", () => {
      expect(
        filtrarMorososCaja(MOROSOS_BASE, "nicolás").map((m) => m.nombre)
      ).toEqual(["Nicolás Pérez"]);

      expect(
        filtrarMorososCaja(MOROSOS_BASE, "VALEN.GOMEZ").map((m) => m.nombre)
      ).toEqual(["Valentina Gómez"]);

      expect(filtrarMorososCaja(MOROSOS_BASE, "   ")).toHaveLength(2);
    });

    it("filtra auditoría por estado (VALIDOS / ANULADOS), medio de pago y búsqueda textual", () => {
      expect(
        filtrarAuditoriaCaja(PAGOS_BASE, {
          busqueda: "",
          estado: "VALIDOS",
          medioPago: "TODOS"
        }).map((p) => p.id)
      ).toEqual([PAGOS_BASE[0]!.id, PAGOS_BASE[1]!.id]);

      expect(
        filtrarAuditoriaCaja(PAGOS_BASE, {
          busqueda: "",
          estado: "ANULADOS",
          medioPago: "TODOS"
        }).map((p) => p.id)
      ).toEqual([PAGOS_BASE[2]!.id]);

      expect(
        filtrarAuditoriaCaja(PAGOS_BASE, {
          busqueda: "",
          estado: "TODOS",
          medioPago: "TRANSFERENCIA"
        }).map((p) => p.id)
      ).toEqual([PAGOS_BASE[1]!.id]);

      expect(
        filtrarAuditoriaCaja(PAGOS_BASE, {
          busqueda: "duplicado",
          estado: "TODOS",
          medioPago: "TODOS"
        }).map((p) => p.id)
      ).toEqual([PAGOS_BASE[2]!.id]);
    });

    it("construye la URL de deep-link hacia la ficha del atleta en /atletas", () => {
      expect(
        construirUrlFichaAtleta("a1000000-0000-4000-8000-000000000001")
      ).toBe("/atletas?afiliacionId=a1000000-0000-4000-8000-000000000001");
    });

    it("traduce medios de pago y códigos de error sin exponer enums crudos ni 403 Forbidden", () => {
      expect(formatearMedioPagoCaja("EFECTIVO")).toBe("Efectivo");
      expect(formatearMedioPagoCaja("TRANSFERENCIA")).toBe("Transferencia");
      expect(formatearMedioPagoCaja("OTRO")).toBe("Otro");

      const msgAnulado = traducirErrorCaja(
        ERROR_CODES.PAGO_YA_ANULADO,
        "PAGO_YA_ANULADO"
      );
      expect(msgAnulado).toMatch(/anulado/i);
      expect(msgAnulado).not.toContain("PAGO_YA_ANULADO");

      const msgPermiso = traducirErrorCaja(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "403 Forbidden"
      );
      expect(msgPermiso).not.toMatch(/403|Forbidden|ACCESO_DENEGADO_ROL/);
    });

    it("valida localmente el motivo de anulación y delega a anularPagoAction", async () => {
      const anularMock = vi
        .mocked(anularPagoAction)
        .mockReset()
        .mockResolvedValue({ ok: true });

      const invalido = await procesarAnulacionPago(
        BOX_ID,
        PAGOS_BASE[0]!.id,
        "ab"
      );
      expect(invalido.ok).toBe(false);
      expect(anularMock).not.toHaveBeenCalled();

      const valido = await procesarAnulacionPago(
        BOX_ID,
        PAGOS_BASE[0]!.id,
        "  Transferencia duplicada  "
      );
      expect(valido.ok).toBe(true);
      expect(anularMock).toHaveBeenCalledWith(BOX_ID, PAGOS_BASE[0]!.id, {
        motivoAnulacion: "Transferencia duplicada"
      });
    });
  });

  describe("Renderizado Dark Bento Cockpit, Deep-Link, Roles y Estabilidad Mobile", () => {
    it("renderiza AccesoRestringidoCaja con role='alert' y sin código 403 Forbidden", () => {
      const html = renderToStaticMarkup(
        createElement(AccesoRestringidoCaja, {
          nombreBox: "Box Centris Norte"
        })
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('data-testid="acceso-denegado-rol"');
      expect(html).toContain("<h1");
      expect(html).toContain("Volver al panel");
      expect(html).not.toMatch(/403|Forbidden/i);
    });

    it("renderiza KPIs con badges wrapables en móvil, deep-link a ficha y sin font-mono", () => {
      const html = renderToStaticMarkup(
        createElement(PanelCajaMorosos, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: true,
          morososIniciales: MOROSOS_BASE,
          pagosIniciales: PAGOS_BASE
        })
      );

      expect(html).toContain("Caja y seguimiento de deuda");
      expect(html).toContain('data-testid="total-deuda-acumulada"');
      expect(html).toContain('data-testid="cantidad-atletas-morosos"');
      expect(html).toContain('data-testid="total-ingresos-validos"');
      expect(html).toContain("2 válidos · 1 anulado");
      expect(html).toContain("max-w-full whitespace-normal");
      expect(html).toContain(
        '/atletas?afiliacionId=a1000000-0000-4000-8000-000000000001'
      );
      expect(html).toContain("Abrir ficha y cobrar");
      expect(html).toContain("tabular-nums");
      expect(html).not.toContain("font-mono");
    });

    it("oculta Auditoría de Caja y KPI de ingresos a Recepción y muestra el aviso de alcance", () => {
      const html = renderToStaticMarkup(
        createElement(PanelCajaMorosos, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: false,
          morososIniciales: MOROSOS_BASE,
          pagosIniciales: []
        })
      );

      expect(html).toContain('data-testid="banner-alcance-recepcion"');
      expect(html).not.toContain('data-testid="tab-auditoria"');
      expect(html).not.toContain('data-testid="total-ingresos-validos"');
      expect(html).not.toContain('data-testid="btn-anular-pago-');
    });

    it("renderiza Auditoría de Caja con FilterChips, filas .audit-row en 2 columnas y medios humanos", () => {
      const html = renderToStaticMarkup(
        createElement(PanelCajaMorosos, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: true,
          morososIniciales: MOROSOS_BASE,
          pagosIniciales: PAGOS_BASE,
          tabInicial: "auditoria"
        })
      );

      expect(html).toContain('data-testid="seccion-auditoria-caja"');
      expect(html).toContain('data-testid="tabla-auditoria-caja"');
      expect(html).toContain('data-testid="filtro-auditoria-estado-todos"');
      expect(html).toContain('data-testid="filtro-auditoria-estado-validos"');
      expect(html).toContain('data-testid="filtro-auditoria-estado-anulados"');
      expect(html).toContain('data-testid="filtro-auditoria-medio-efectivo"');
      expect(html).toContain("audit-row");
      expect(html).toContain("Efectivo");
      expect(html).toContain("Transferencia");
      expect(html).toContain("Otro");
      expect(html).not.toContain(">EFECTIVO<");
      expect(html).not.toContain(">TRANSFERENCIA<");
      expect(html).not.toContain(">OTRO<");
      expect(html).not.toContain("font-mono");
    });

    it("renderiza SideDrawer de anulación de pago cuando hay un pago seleccionado", () => {
      const html = renderToStaticMarkup(
        createElement(PanelCajaMorosos, {
          boxId: BOX_ID,
          moneda: "ARS",
          esAdministrador: true,
          morososIniciales: MOROSOS_BASE,
          pagosIniciales: PAGOS_BASE,
          tabInicial: "auditoria",
          pagoParaAnularInicial: PAGOS_BASE[0]!
        })
      );

      expect(html).toContain('data-testid="modal-anular-pago"');
      expect(html).toContain('data-testid="input-motivo-anulacion"');
      expect(html).toContain('data-testid="btn-confirmar-anulacion"');
      expect(html).toContain("Anular pago registrado");
      expect(html).toContain("Efectivo");
      expect(html).toContain("20.000");
    });
  });
});
