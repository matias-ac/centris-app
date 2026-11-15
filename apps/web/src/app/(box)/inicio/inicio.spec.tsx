import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResumenPanel } from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

import { InicioBentoView } from "./inicio-bento-view";
import {
  construirAccesosRapidosPanel,
  formatearImporteMoneda,
  prepararDatosGraficoCobranza,
  prepararDatosGraficoOcupacion,
  resolverEncabezadoPanel,
  traducirErrorPanel
} from "./inicio-estado";

const BOX_BASE: ResumenPanel["box"] = {
  id: "00000000-0000-4000-8000-000000000101",
  nombre: "Box Centris Norte",
  slug: "centris-norte",
  timezone: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
  anticipacionReservaDias: 7,
  ventanaCancelacionMinutos: 120
};

const RESUMEN_GESTION_COMPLETO: NonNullable<ResumenPanel["gestion"]> = {
  ocupacionSemanal: {
    dias: [
      {
        fecha: "2026-11-09",
        diaCorto: "Lun",
        cuposTotales: 60,
        reservasConfirmadas: 38,
        porcentaje: 63,
        esHoy: false
      },
      {
        fecha: "2026-11-10",
        diaCorto: "Mar",
        cuposTotales: 60,
        reservasConfirmadas: 42,
        porcentaje: 70,
        esHoy: false
      },
      {
        fecha: "2026-11-11",
        diaCorto: "Mié",
        cuposTotales: 60,
        reservasConfirmadas: 35,
        porcentaje: 58,
        esHoy: false
      },
      {
        fecha: "2026-11-12",
        diaCorto: "Jue",
        cuposTotales: 60,
        reservasConfirmadas: 45,
        porcentaje: 75,
        esHoy: false
      },
      {
        fecha: "2026-11-13",
        diaCorto: "Vie",
        cuposTotales: 60,
        reservasConfirmadas: 49,
        porcentaje: 82,
        esHoy: false
      },
      {
        fecha: "2026-11-14",
        diaCorto: "Sáb",
        cuposTotales: 40,
        reservasConfirmadas: 34,
        porcentaje: 85,
        esHoy: true
      },
      {
        fecha: "2026-11-15",
        diaCorto: "Dom",
        cuposTotales: 0,
        reservasConfirmadas: 0,
        porcentaje: 0,
        esHoy: false
      }
    ],
    reservasSemana: 243,
    cuposSemana: 340,
    porcentajeHoy: 85
  },
  cobranzaMes: {
    totalCobrado: 684000,
    totalPendiente: 192000,
    porcentajeCobrado: 78,
    desglosePorMedio: [
      { medioPago: "TRANSFERENCIA", label: "Transferencia", total: 460000 },
      { medioPago: "EFECTIVO", label: "Efectivo", total: 224000 }
    ]
  },
  morosos: {
    totalCantidad: 4,
    totalDeuda: 192000,
    top: [
      {
        afiliacionId: "a1000000-0000-4000-8000-000000000001",
        nombre: "Nicolás Pérez",
        planNombre: "Plan Full",
        deuda: 55000
      },
      {
        afiliacionId: "a1000000-0000-4000-8000-000000000002",
        nombre: "Camila Pereyra",
        planNombre: "Plan 3x Semana",
        deuda: 42000
      }
    ]
  },
  resumenOperativo: {
    membresiasActivas: 62,
    membresiasPorVencer7Dias: 9,
    clasesHoy: 6,
    asistenciasSemana: 84,
    reservasCerradasSemana: 95,
    tasaAsistenciaPorcentaje: 88
  }
};

const RESUMEN_COACH: NonNullable<ResumenPanel["coach"]> = {
  clasesHoy: [
    {
      id: "c1000000-0000-4000-8000-000000000001",
      tipoClaseNombre: "WOD",
      inicio: "2026-11-14T11:00:00.000Z",
      fin: "2026-11-14T12:00:00.000Z",
      cupos: 20,
      reservasConfirmadas: 18,
      asistenciasMarcadas: 17,
      canceladaEn: null,
      ventanaCorreccionAbierta: true
    },
    {
      id: "c1000000-0000-4000-8000-000000000002",
      tipoClaseNombre: "Halterofilia",
      inicio: "2026-11-14T22:00:00.000Z",
      fin: "2026-11-14T23:00:00.000Z",
      cupos: 15,
      reservasConfirmadas: 12,
      asistenciasMarcadas: 0,
      canceladaEn: null,
      ventanaCorreccionAbierta: false
    }
  ],
  clasesPendientesAsistencia24h: 1,
  atletasHoyACargo: 30,
  ventanaCorreccionHoras: 24
};

const RESUMEN_ATLETA_MOROSO: NonNullable<ResumenPanel["atleta"]> = {
  membresiaVigente: {
    id: "m1000000-0000-4000-8000-000000000001",
    planNombre: "Plan 3x Semana",
    modalidadCreditos: "SEMANAL",
    fechaInicio: "2026-11-01",
    fechaFin: "2026-11-30",
    creditosPorPeriodo: 3,
    creditosDisponiblesPeriodo: 2,
    creditosExtra: 1,
    saldoPendiente: 42000,
    esMoroso: true
  },
  membresiaFutura: null,
  esMoroso: true,
  saldoPendienteTotal: 42000,
  proximasReservas: [
    {
      reservaId: "r1000000-0000-4000-8000-000000000001",
      claseId: "c1000000-0000-4000-8000-000000000002",
      tipoClaseNombre: "WOD",
      coachNombre: "Valentina Ruiz",
      inicio: "2026-11-14T22:00:00.000Z",
      fin: "2026-11-14T23:00:00.000Z",
      cupos: 20,
      reservasConfirmadas: 15,
      enCurso: false,
      puedeCancelarSinCargo: true,
      horaLimiteSinCargo: "17:00"
    }
  ]
};

describe("Seam 3 — Panel Bento /inicio y adaptación por roles (@centris/web)", () => {
  describe("Helpers de estado y formato", () => {
    it("formatea importes en moneda local sin decimales innecesarios", () => {
      const texto = formatearImporteMoneda(684000, "ARS");
      expect(texto).toContain("684.000");
    });

    it("adapta encabezado y CTA primario según roles componibles", () => {
      expect(resolverEncabezadoPanel(["administrador"], "Box Centris Norte")).toMatchObject({
        titulo: "Panel operativo",
        ctaPrimario: { label: "+ Registrar pago", href: "/caja" }
      });
      expect(resolverEncabezadoPanel(["coach"], "Box Centris Norte")).toMatchObject({
        titulo: "Piso de entrenamiento",
        ctaPrimario: { label: "Abrir clases de hoy", href: "/clases" }
      });
      expect(resolverEncabezadoPanel(["atleta"], "Box Centris Norte")).toMatchObject({
        titulo: "Tu entrenamiento",
        ctaPrimario: { label: "Reservar lugar", href: "/reservas" }
      });
    });

    it("filtra accesos rápidos ↗ según permisos de rol sin exponer rutas restringidas", () => {
      const accesosAdmin = construirAccesosRapidosPanel(["administrador"]);
      expect(accesosAdmin.map((a) => a.href)).toEqual([
        "/reservas",
        "/clases",
        "/horarios",
        "/planes",
        "/atletas",
        "/caja",
        "/afiliaciones"
      ]);

      const accesosCoach = construirAccesosRapidosPanel(["coach"]);
      expect(accesosCoach.map((a) => a.href)).toEqual(["/clases", "/horarios"]);

      const accesosAtleta = construirAccesosRapidosPanel(["atleta"]);
      expect(accesosAtleta.map((a) => a.href)).toEqual(["/reservas", "/clases"]);
    });

    it("prepara serie de ocupación semanal y dona de cobranza para recharts", () => {
      const ocupacion = prepararDatosGraficoOcupacion(
        RESUMEN_GESTION_COMPLETO.ocupacionSemanal.dias
      );
      expect(ocupacion).toHaveLength(7);
      expect(ocupacion[5]).toMatchObject({
        diaCorto: "Sáb",
        porcentaje: 85,
        fondoPista: 100,
        esHoy: true
      });

      const cobranza = prepararDatosGraficoCobranza(
        RESUMEN_GESTION_COMPLETO.cobranzaMes
      );
      expect(cobranza.map((s) => s.nombre)).toEqual([
        "Transferencia",
        "Efectivo",
        "Pendiente"
      ]);
    });

    it("traduce errores sin filtrar jerga HTTP como 403 Forbidden", () => {
      expect(traducirErrorPanel("ACCESO_DENEGADO_ROL", "403 Forbidden")).not.toContain(
        "403"
      );
      expect(traducirErrorPanel(undefined, "403 Forbidden")).not.toContain(
        "Forbidden"
      );
    });
  });

  describe("Renderizado Bento adaptado por Rol (ADR 0007)", () => {
    it("Administrador ve KPIs reales, ocupación semanal, cobranza, morosos y botones ↗", () => {
      const html = renderToStaticMarkup(
        createElement(InicioBentoView, {
          roles: ["administrador"],
          resumen: {
            box: BOX_BASE,
            fechaLocal: "2026-11-14",
            semana: { desde: "2026-11-09", hasta: "2026-11-15" },
            mes: { clave: "2026-11", etiqueta: "noviembre" },
            gestion: RESUMEN_GESTION_COMPLETO,
            coach: null,
            atleta: null
          },
          errorCarga: null
        })
      );

      expect(html).toContain('data-testid="panel-rol-administrador"');
      expect(html).toContain("Ocupación semanal de clases");
      expect(html).toContain("Cobranza de noviembre");
      expect(html).toContain("684.000");
      expect(html).toContain("Seguimiento de cobros");
      expect(html).toContain("Nicolás Pérez");
      expect(html).toContain("tabular-nums");
      expect(html).toContain('href="/reservas"');
      expect(html).toContain('href="/clases"');
      expect(html).toContain('href="/horarios"');
      expect(html).toContain('href="/planes"');
      expect(html).toContain('href="/atletas"');
      expect(html).toContain('href="/caja"');
      expect(html).toContain('href="/afiliaciones"');
    });

    it("Coach exclusivo NO recibe ni visualiza cifras financieras ni accesos de caja", () => {
      const html = renderToStaticMarkup(
        createElement(InicioBentoView, {
          roles: ["coach"],
          resumen: {
            box: BOX_BASE,
            fechaLocal: "2026-11-14",
            semana: { desde: "2026-11-09", hasta: "2026-11-15" },
            mes: { clave: "2026-11", etiqueta: "noviembre" },
            gestion: null,
            coach: RESUMEN_COACH,
            atleta: null
          },
          errorCarga: null
        })
      );

      expect(html).toContain('data-testid="panel-rol-coach"');
      expect(html).toContain("Tus clases de hoy");
      expect(html).toContain("24 hs");
      expect(html).toContain("30");
      expect(html).not.toContain('data-testid="panel-rol-administrador"');
      expect(html).not.toContain('data-testid="panel-rol-recepcionista"');
      expect(html).not.toContain("Cobranza");
      expect(html).not.toContain("Moroso");
      expect(html).not.toContain('href="/caja"');
      expect(html).not.toContain('href="/afiliaciones"');
    });

    it("Atleta exclusivo con saldo pendiente ve su membresía, aviso no bloqueante ADR 0006 y CTA a /reservas", () => {
      const html = renderToStaticMarkup(
        createElement(InicioBentoView, {
          roles: ["atleta"],
          resumen: {
            box: BOX_BASE,
            fechaLocal: "2026-11-14",
            semana: { desde: "2026-11-09", hasta: "2026-11-15" },
            mes: { clave: "2026-11", etiqueta: "noviembre" },
            gestion: null,
            coach: null,
            atleta: RESUMEN_ATLETA_MOROSO
          },
          errorCarga: null
        })
      );

      expect(html).toContain('data-testid="panel-rol-atleta"');
      expect(html).toContain("Plan 3x Semana");
      expect(html).toContain("2 / 3");
      expect(html).toContain("Podés seguir reservando tus clases con normalidad");
      expect(html).toContain('href="/reservas"');
      expect(html).toContain("Valentina Ruiz");
      expect(html).not.toContain("Cobranza de noviembre");
      expect(html).not.toContain('href="/caja"');
    });

    it("Usuario combinado ['coach', 'recepcionista'] muestra ambos bloques sin acceso de Administrador", () => {
      const html = renderToStaticMarkup(
        createElement(InicioBentoView, {
          roles: ["coach", "recepcionista"],
          resumen: {
            box: BOX_BASE,
            fechaLocal: "2026-11-14",
            semana: { desde: "2026-11-09", hasta: "2026-11-15" },
            mes: { clave: "2026-11", etiqueta: "noviembre" },
            gestion: RESUMEN_GESTION_COMPLETO,
            coach: RESUMEN_COACH,
            atleta: null
          },
          errorCarga: null
        })
      );

      expect(html).toContain('data-testid="panel-rol-coach"');
      expect(html).toContain('data-testid="panel-rol-recepcionista"');
      expect(html).not.toContain('data-testid="panel-rol-administrador"');
      expect(html).not.toContain('href="/afiliaciones"');
    });
  });
});
