import { describe, expect, it } from "vitest";
import {
  ResumenPanelSchema,
  construirDiasSemanaPanel,
  obtenerRangoMesLocal
} from "../src/index.js";

const UUID_BOX = "55555555-5555-4555-8555-555555555555";
const UUID_AFILIACION = "22222222-2222-4222-8222-222222222222";
const UUID_MEMBRESIA = "44444444-4444-4444-8444-444444444444";
const UUID_RESERVA = "88888888-8888-4888-8888-888888888888";
const UUID_CLASE = "77777777-7777-4777-8777-777777777777";

describe("Seam 1 — Esquemas Zod y cálculos calendario del Panel (@centris/shared)", () => {
  describe("obtenerRangoMesLocal", () => {
    it("resuelve correctamente inicio, fin, clave y nombre en español para noviembre", () => {
      expect(obtenerRangoMesLocal("2026-11-14")).toEqual({
        inicioMes: "2026-11-01",
        finMes: "2026-11-30",
        clave: "2026-11",
        etiqueta: "noviembre"
      });
    });

    it("contempla febrero bisiesto y no bisiesto", () => {
      expect(obtenerRangoMesLocal("2024-02-10")).toEqual({
        inicioMes: "2024-02-01",
        finMes: "2024-02-29",
        clave: "2024-02",
        etiqueta: "febrero"
      });
      expect(obtenerRangoMesLocal("2026-02-10")).toEqual({
        inicioMes: "2026-02-01",
        finMes: "2026-02-28",
        clave: "2026-02",
        etiqueta: "febrero"
      });
    });
  });

  describe("construirDiasSemanaPanel", () => {
    it("genera los 7 días de lunes a domingo marcando el día actual", () => {
      const dias = construirDiasSemanaPanel("2026-11-09", "2026-11-14");
      expect(dias).toHaveLength(7);
      expect(dias[0]).toEqual({
        fecha: "2026-11-09",
        diaCorto: "Lun",
        esHoy: false
      });
      expect(dias[5]).toEqual({
        fecha: "2026-11-14",
        diaCorto: "Sáb",
        esHoy: true
      });
      expect(dias[6]).toEqual({
        fecha: "2026-11-15",
        diaCorto: "Dom",
        esHoy: false
      });
    });
  });

  describe("ResumenPanelSchema", () => {
    it("valida un resumen completo para Administrador / Recepcionista y null en secciones no activas", () => {
      const valido = ResumenPanelSchema.parse({
        box: {
          id: UUID_BOX,
          nombre: "Box Centris Norte",
          slug: "centris-norte",
          timezone: "America/Argentina/Buenos_Aires",
          moneda: "ARS",
          anticipacionReservaDias: 7,
          ventanaCancelacionMinutos: 120
        },
        fechaLocal: "2026-11-14",
        semana: {
          desde: "2026-11-09",
          hasta: "2026-11-15"
        },
        mes: {
          clave: "2026-11",
          etiqueta: "noviembre"
        },
        gestion: {
          ocupacionSemanal: {
            dias: [
              {
                fecha: "2026-11-14",
                diaCorto: "Sáb",
                cuposTotales: 40,
                reservasConfirmadas: 32,
                porcentaje: 80,
                esHoy: true
              }
            ],
            reservasSemana: 32,
            cuposSemana: 40,
            porcentajeHoy: 80
          },
          cobranzaMes: {
            totalCobrado: 450000,
            totalPendiente: 75000,
            porcentajeCobrado: 86,
            desglosePorMedio: [
              {
                medioPago: "TRANSFERENCIA",
                label: "Transferencia",
                total: 300000
              },
              {
                medioPago: "EFECTIVO",
                label: "Efectivo",
                total: 150000
              }
            ]
          },
          morosos: {
            totalCantidad: 2,
            totalDeuda: 75000,
            top: [
              {
                afiliacionId: UUID_AFILIACION,
                nombre: "Nicolás Pérez",
                planNombre: "Plan 3x Semana",
                deuda: 42000
              }
            ]
          },
          resumenOperativo: {
            membresiasActivas: 28,
            membresiasPorVencer7Dias: 4,
            clasesHoy: 6,
            asistenciasSemana: 27,
            reservasCerradasSemana: 30,
            tasaAsistenciaPorcentaje: 90
          }
        },
        coach: null,
        atleta: {
          membresiaVigente: {
            id: UUID_MEMBRESIA,
            planNombre: "Plan 3x Semana",
            modalidadCreditos: "SEMANAL",
            fechaInicio: "2026-11-01",
            fechaFin: "2026-11-30",
            creditosPorPeriodo: 3,
            creditosDisponiblesPeriodo: 2,
            creditosExtra: 1,
            saldoPendiente: 0,
            esMoroso: false
          },
          membresiaFutura: null,
          esMoroso: false,
          saldoPendienteTotal: 0,
          proximasReservas: [
            {
              reservaId: UUID_RESERVA,
              claseId: UUID_CLASE,
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
        }
      });

      expect(valido.gestion?.morosos.totalCantidad).toBe(2);
      expect(valido.coach).toBeNull();
      expect(valido.atleta?.proximasReservas).toHaveLength(1);
    });
  });
});
