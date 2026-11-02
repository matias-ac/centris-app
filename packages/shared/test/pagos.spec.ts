import { describe, expect, it } from "vitest";
import {
  MEDIOS_PAGO,
  MedioPagoSchema,
  CrearPagoSchema,
  AnularPagoSchema,
  PagoSchema,
  calcularSaldoMembresia,
  determinarEstadoMoroso
} from "../src/index.js";

const UUID_MEMBRESIA = "11111111-1111-4111-8111-111111111111";
const UUID_PAGO = "22222222-2222-4222-8222-222222222222";
const UUID_BOX = "33333333-3333-4333-8333-333333333333";
const UUID_USUARIO = "44444444-4444-4444-8444-444444444444";

describe("Seam 1 — Dominio, Esquemas Zod y Cálculo de Saldos (@centris/shared)", () => {
  describe("Medios de Pago", () => {
    it("admite únicamente EFECTIVO, TRANSFERENCIA y OTRO", () => {
      expect(MEDIOS_PAGO).toEqual(["EFECTIVO", "TRANSFERENCIA", "OTRO"]);
      expect(MedioPagoSchema.safeParse("EFECTIVO").success).toBe(true);
      expect(MedioPagoSchema.safeParse("TRANSFERENCIA").success).toBe(true);
      expect(MedioPagoSchema.safeParse("OTRO").success).toBe(true);
      expect(MedioPagoSchema.safeParse("TARJETA").success).toBe(false);
      expect(MedioPagoSchema.safeParse("").success).toBe(false);
    });
  });

  describe("CrearPagoSchema", () => {
    it("valida la creación de un pago con datos correctos", () => {
      const valido = CrearPagoSchema.safeParse({
        membresiaId: UUID_MEMBRESIA,
        monto: 15000,
        medioPago: "EFECTIVO",
        fechaPago: "2026-11-02"
      });
      expect(valido.success).toBe(true);
    });

    it("rechaza montos menores o iguales a cero, o con decimales", () => {
      expect(
        CrearPagoSchema.safeParse({
          membresiaId: UUID_MEMBRESIA,
          monto: 0,
          medioPago: "EFECTIVO",
          fechaPago: "2026-11-02"
        }).success
      ).toBe(false);

      expect(
        CrearPagoSchema.safeParse({
          membresiaId: UUID_MEMBRESIA,
          monto: -500,
          medioPago: "EFECTIVO",
          fechaPago: "2026-11-02"
        }).success
      ).toBe(false);

      expect(
        CrearPagoSchema.safeParse({
          membresiaId: UUID_MEMBRESIA,
          monto: 1500.5,
          medioPago: "EFECTIVO",
          fechaPago: "2026-11-02"
        }).success
      ).toBe(false);
    });

    it("rechaza fechas con formato inválido", () => {
      expect(
        CrearPagoSchema.safeParse({
          membresiaId: UUID_MEMBRESIA,
          monto: 15000,
          medioPago: "EFECTIVO",
          fechaPago: "02/11/2026"
        }).success
      ).toBe(false);
    });
  });

  describe("AnularPagoSchema", () => {
    it("exige un motivo de anulación no vacío de al menos 3 caracteres", () => {
      expect(
        AnularPagoSchema.safeParse({
          motivoAnulacion: "Error de tipeo en mostrador"
        }).success
      ).toBe(true);

      expect(
        AnularPagoSchema.safeParse({
          motivoAnulacion: "   "
        }).success
      ).toBe(false);

      expect(
        AnularPagoSchema.safeParse({
          motivoAnulacion: "ok"
        }).success
      ).toBe(false);
    });
  });

  describe("PagoSchema", () => {
    it("valida la estructura de un pago persistido e inmutable", () => {
      const pago = {
        id: UUID_PAGO,
        boxId: UUID_BOX,
        membresiaId: UUID_MEMBRESIA,
        monto: 15000,
        medioPago: "EFECTIVO",
        fechaPago: "2026-11-02",
        registradoPorUsuarioId: UUID_USUARIO,
        anuladoEn: null,
        anuladoPorUsuarioId: null,
        motivoAnulacion: null,
        createdAt: new Date().toISOString()
      };

      const resultado = PagoSchema.safeParse(pago);
      expect(resultado.success).toBe(true);
    });
  });

  describe("Cálculo dinámico de Saldo y Morosidad (ADR 0006)", () => {
    it("calcula el saldo restando únicamente los pagos no anulados", () => {
      const precio = 30000;
      const pagos = [
        { monto: 15000, anuladoEn: null },
        { monto: 10000, anuladoEn: null },
        { monto: 5000, anuladoEn: "2026-11-02T16:00:00.000Z" } // Anulado, no resta
      ];

      const saldo = calcularSaldoMembresia(precio, pagos);
      expect(saldo).toBe(5000);
      expect(determinarEstadoMoroso(saldo)).toBe(true);
    });

    it("determina que el saldo es 0 y no es moroso si se pagó el total", () => {
      const precio = 30000;
      const pagos = [
        { monto: 20000, anuladoEn: null },
        { monto: 10000, anuladoEn: null }
      ];

      const saldo = calcularSaldoMembresia(precio, pagos);
      expect(saldo).toBe(0);
      expect(determinarEstadoMoroso(saldo)).toBe(false);
    });

    it("el saldo refleja la totalidad del precio si todos los pagos fueron anulados", () => {
      const precio = 35000;
      const pagos = [
        { monto: 35000, anuladoEn: "2026-11-02T16:00:00.000Z" }
      ];

      const saldo = calcularSaldoMembresia(precio, pagos);
      expect(saldo).toBe(35000);
      expect(determinarEstadoMoroso(saldo)).toBe(true);
    });
  });
});
