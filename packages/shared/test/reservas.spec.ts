import { describe, expect, it } from "vitest";
import {
  CrearReservaSchema,
  ESTADOS_RESERVA,
  ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO,
  FiltroReservasSchema,
  ReservaSchema,
  calcularDisponibilidadCreditos,
  evaluarVentanaCancelacion,
  obtenerPeriodoSemanalDeInstante,
  obtenerRangoPeriodoSemanal
} from "../src/index.js";

const BUENOS_AIRES = "America/Argentina/Buenos_Aires";

const UUID_RESERVA = "88888888-8888-4888-8888-888888888888";
const UUID_BOX = "55555555-5555-4555-8555-555555555555";
const UUID_CLASE = "77777777-7777-4777-8777-777777777777";
const UUID_AFILIACION = "22222222-2222-4222-8222-222222222222";
const UUID_MEMBRESIA = "44444444-4444-4444-8444-444444444444";
const UUID_USUARIO = "11111111-1111-4111-8111-111111111111";

describe("Seam 1 — Esquemas Zod y cálculo de Período y Créditos de Reservas (@centris/shared)", () => {
  describe("ReservaSchema y CrearReservaSchema", () => {
    const reservaValida = {
      id: UUID_RESERVA,
      boxId: UUID_BOX,
      claseId: UUID_CLASE,
      afiliacionId: UUID_AFILIACION,
      membresiaId: UUID_MEMBRESIA,
      creadaPorUsuarioId: UUID_USUARIO,
      estado: "CONFIRMADA" as const,
      asistenciaMarcadaEn: null,
      asistenciaPorUsuarioId: null,
      canceladaEn: null,
      createdAt: "2026-11-08T20:00:00.000Z",
      updatedAt: "2026-11-08T20:00:00.000Z"
    };

    it("expone los 4 estados canónicos de una Reserva", () => {
      expect(ESTADOS_RESERVA).toEqual([
        "CONFIRMADA",
        "CANCELADA",
        "CANCELADA_TARDIA",
        "CANCELADA_POR_BOX"
      ]);
    });

    it("valida una Reserva confirmada completa", () => {
      expect(ReservaSchema.safeParse(reservaValida).success).toBe(true);
    });

    it("rechaza una Reserva con estado inválido", () => {
      expect(
        ReservaSchema.safeParse({ ...reservaValida, estado: "PENDIENTE" })
          .success
      ).toBe(false);
    });

    it("valida CrearReservaSchema con claseId obligatorio y afiliacionId opcional", () => {
      expect(CrearReservaSchema.safeParse({ claseId: UUID_CLASE }).success).toBe(
        true
      );
      expect(
        CrearReservaSchema.safeParse({
          claseId: UUID_CLASE,
          afiliacionId: UUID_AFILIACION
        }).success
      ).toBe(true);
      expect(CrearReservaSchema.safeParse({ claseId: "no-uuid" }).success).toBe(
        false
      );
    });

    it("valida FiltroReservasSchema y rechaza rangos de fechas invertidos", () => {
      expect(
        FiltroReservasSchema.safeParse({
          afiliacionId: UUID_AFILIACION,
          desde: "2026-11-02",
          hasta: "2026-11-08"
        }).success
      ).toBe(true);

      expect(
        FiltroReservasSchema.safeParse({
          desde: "2026-11-10",
          hasta: "2026-11-02"
        }).success
      ).toBe(false);
    });
  });

  describe("Corte de Período semanal en zona horaria del Box (ADR 0005)", () => {
    it("calcula lunes y domingo de la semana ISO para una fecha local", () => {
      expect(obtenerRangoPeriodoSemanal("2026-11-02")).toEqual({
        lunes: "2026-11-02",
        domingo: "2026-11-08"
      });
      expect(obtenerRangoPeriodoSemanal("2026-11-05")).toEqual({
        lunes: "2026-11-02",
        domingo: "2026-11-08"
      });
      expect(obtenerRangoPeriodoSemanal("2026-11-08")).toEqual({
        lunes: "2026-11-02",
        domingo: "2026-11-08"
      });
    });

    it("imputa una Clase del domingo 22:30 en Buenos Aires (lunes 01:30 UTC) al Período que termina ese domingo", () => {
      // Domingo 2026-11-08 22:30 en America/Argentina/Buenos_Aires (UTC-3) = 2026-11-09T01:30:00.000Z
      const inicioClaseUtc = new Date("2026-11-09T01:30:00.000Z");
      const periodo = obtenerPeriodoSemanalDeInstante(
        inicioClaseUtc,
        BUENOS_AIRES
      );

      expect(periodo).toEqual({
        fechaLocal: "2026-11-08",
        lunes: "2026-11-02",
        domingo: "2026-11-08"
      });
    });
  });

  describe("Cálculo de disponibilidad de Créditos y bolsa creditos_extra", () => {
    it("permite siempre reservar en modalidad ILIMITADO", () => {
      const resultado = calcularDisponibilidadCreditos({
        modalidadCreditos: "ILIMITADO",
        creditosPorPeriodo: null,
        creditosExtra: 0,
        fechasClasesConsumidas: [
          "2026-11-02",
          "2026-11-03",
          "2026-11-04",
          "2026-11-05",
          "2026-11-06"
        ],
        fechaClaseObjetivo: "2026-11-07"
      });

      expect(resultado.disponible).toBe(true);
      expect(resultado.creditosRestantesPeriodo).toBeNull();
    });

    it("suma creditos_por_periodo + creditos_extra para toda la Vigencia en modalidad VIGENCIA_TOTAL", () => {
      const conCreditosBase = calcularDisponibilidadCreditos({
        modalidadCreditos: "VIGENCIA_TOTAL",
        creditosPorPeriodo: 2,
        creditosExtra: 1,
        fechasClasesConsumidas: ["2026-11-02", "2026-11-04"],
        fechaClaseObjetivo: "2026-11-10"
      });
      expect(conCreditosBase).toEqual({
        disponible: true,
        creditosRestantesPeriodo: 0,
        creditosExtraRestantes: 1,
        usaCreditoExtra: true
      });

      const agotado = calcularDisponibilidadCreditos({
        modalidadCreditos: "VIGENCIA_TOTAL",
        creditosPorPeriodo: 2,
        creditosExtra: 1,
        fechasClasesConsumidas: ["2026-11-02", "2026-11-04", "2026-11-10"],
        fechaClaseObjetivo: "2026-11-12"
      });
      expect(agotado.disponible).toBe(false);
      expect(agotado.creditosRestantesPeriodo).toBe(0);
      expect(agotado.creditosExtraRestantes).toBe(0);
    });

    it("en modalidad SEMANAL consume primero creditos_por_periodo de la semana y luego creditos_extra sin renovarse el lunes siguiente", () => {
      // Semana 1 (2026-11-02 al 2026-11-08): tiene 2 créditos semanales y 1 crédito extra en la Membresía.
      // Ya reservó 2 clases en Semana 1: le quedan 0 del período semanal, pero 1 en creditos_extra.
      const terceraClaseSemana1 = calcularDisponibilidadCreditos({
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: 2,
        creditosExtra: 1,
        fechasClasesConsumidas: ["2026-11-03", "2026-11-05"],
        fechaClaseObjetivo: "2026-11-08"
      });
      expect(terceraClaseSemana1).toEqual({
        disponible: true,
        creditosRestantesPeriodo: 0,
        creditosExtraRestantes: 1,
        usaCreditoExtra: true
      });

      // Una vez consumida esa 3ra clase en Semana 1 (que usó la bolsa creditos_extra),
      // en Semana 2 (2026-11-09 al 2026-11-15) se renuevan solo los 2 créditos semanales,
      // pero creditos_extra queda en 0 (no se renueva).
      const terceraClaseSemana2 = calcularDisponibilidadCreditos({
        modalidadCreditos: "SEMANAL",
        creditosPorPeriodo: 2,
        creditosExtra: 1,
        fechasClasesConsumidas: [
          "2026-11-03",
          "2026-11-05",
          "2026-11-08", // consumió el único crédito extra en Semana 1
          "2026-11-09", // 1ro de Semana 2
          "2026-11-11" // 2do de Semana 2
        ],
        fechaClaseObjetivo: "2026-11-13"
      });
      expect(terceraClaseSemana2).toEqual({
        disponible: false,
        creditosRestantesPeriodo: 0,
        creditosExtraRestantes: 0,
        usaCreditoExtra: false
      });
    });
  });

  describe("Ventana de Cancelación, Cancelación Tardía y reintegro de Créditos (Ticket 10)", () => {
    const inicioClase = new Date("2026-11-10T20:00:00.000Z");

    it("clasifica como CANCELADA (en término, devuelve Crédito) cuando se cancela 125 min antes con ventana de 120 min", () => {
      const ahora125MinAntes = new Date("2026-11-10T17:55:00.000Z");
      const resultado = evaluarVentanaCancelacion({
        claseInicio: inicioClase,
        ahora: ahora125MinAntes,
        ventanaCancelacionMinutos: 120
      });

      expect(resultado).toEqual({
        permitida: true,
        esTardia: false,
        estadoResultante: "CANCELADA",
        devuelveCredito: true
      });
    });

    it("clasifica como CANCELADA en el borde exacto de la Ventana de Cancelación (120 min antes)", () => {
      const ahora120MinAntes = new Date("2026-11-10T18:00:00.000Z");
      const resultado = evaluarVentanaCancelacion({
        claseInicio: inicioClase,
        ahora: ahora120MinAntes,
        ventanaCancelacionMinutos: 120
      });

      expect(resultado).toEqual({
        permitida: true,
        esTardia: false,
        estadoResultante: "CANCELADA",
        devuelveCredito: true
      });
    });

    it("clasifica como CANCELADA_TARDIA (no devuelve Crédito) cuando se cancela 90 min antes con ventana de 120 min", () => {
      const ahora90MinAntes = new Date("2026-11-10T18:30:00.000Z");
      const resultado = evaluarVentanaCancelacion({
        claseInicio: inicioClase,
        ahora: ahora90MinAntes,
        ventanaCancelacionMinutos: 120
      });

      expect(resultado).toEqual({
        permitida: true,
        esTardia: true,
        estadoResultante: "CANCELADA_TARDIA",
        devuelveCredito: false
      });
    });

    it("rechaza la cancelación por el Atleta cuando la Clase ya inició", () => {
      const despuesDeInicio = new Date("2026-11-10T20:01:00.000Z");
      const resultado = evaluarVentanaCancelacion({
        claseInicio: inicioClase,
        ahora: despuesDeInicio,
        ventanaCancelacionMinutos: 120
      });

      expect(resultado.permitida).toBe(false);
      expect(resultado.estadoResultante).toBeNull();
    });

    it("solo CONFIRMADA y CANCELADA_TARDIA mantienen el Crédito consumido; CANCELADA y CANCELADA_POR_BOX lo restituyen", () => {
      expect(ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO).toContain("CONFIRMADA");
      expect(ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO).toContain("CANCELADA_TARDIA");
      expect(ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO).not.toContain("CANCELADA");
      expect(ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO).not.toContain(
        "CANCELADA_POR_BOX"
      );
    });
  });
});
