import { describe, expect, it } from "vitest";
import {
  AjustarCreditosExtraSchema,
  AjustarPrecioMembresiaSchema,
  BajaAnticipadaSchema,
  CrearMembresiaSchema,
  calcularFechaFinVigencia
} from "../src/index.js";

const UUID_AFILIACION = "11111111-1111-4111-8111-111111111111";
const UUID_PLAN = "22222222-2222-4222-8222-222222222222";

describe("Seam 1 — Esquemas Zod y cálculo de Vigencia de Membresías (@centris/shared)", () => {
  describe("calcularFechaFinVigencia", () => {
    it("trata la Vigencia como intervalo inclusivo: 30 días desde el 01/11 terminan el 30/11", () => {
      expect(calcularFechaFinVigencia("2026-11-01", 30)).toBe("2026-11-30");
    });

    it("una Vigencia de 1 día termina el mismo día de inicio", () => {
      expect(calcularFechaFinVigencia("2026-11-15", 1)).toBe("2026-11-15");
    });

    it("cruza fin de mes y de año sin desfasajes", () => {
      expect(calcularFechaFinVigencia("2026-12-15", 30)).toBe("2027-01-13");
    });

    it("respeta años bisiestos", () => {
      expect(calcularFechaFinVigencia("2028-02-01", 29)).toBe("2028-02-29");
      expect(calcularFechaFinVigencia("2028-02-01", 30)).toBe("2028-03-01");
    });
  });

  describe("CrearMembresiaSchema", () => {
    it("acepta afiliación, plan y fecha de inicio calendario", () => {
      const resultado = CrearMembresiaSchema.safeParse({
        afiliacionId: UUID_AFILIACION,
        planId: UUID_PLAN,
        fechaInicio: "2026-11-01"
      });
      expect(resultado.success).toBe(true);
    });

    it("rechaza fechas que no son YYYY-MM-DD o no existen en el calendario", () => {
      for (const fechaInicio of ["01/11/2026", "2026-13-01", "2026-02-30", ""]) {
        const resultado = CrearMembresiaSchema.safeParse({
          afiliacionId: UUID_AFILIACION,
          planId: UUID_PLAN,
          fechaInicio
        });
        expect(resultado.success, fechaInicio).toBe(false);
      }
    });

    it("rechaza identificadores que no son UUID", () => {
      const resultado = CrearMembresiaSchema.safeParse({
        afiliacionId: "no-es-uuid",
        planId: UUID_PLAN,
        fechaInicio: "2026-11-01"
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("AjustarCreditosExtraSchema", () => {
    it("acepta enteros positivos, cero y negativos (ajuste de la bolsa)", () => {
      for (const creditosExtra of [3, 0, -2]) {
        expect(
          AjustarCreditosExtraSchema.safeParse({ creditosExtra }).success,
          String(creditosExtra)
        ).toBe(true);
      }
    });

    it("rechaza valores no enteros", () => {
      expect(
        AjustarCreditosExtraSchema.safeParse({ creditosExtra: 1.5 }).success
      ).toBe(false);
    });
  });

  describe("AjustarPrecioMembresiaSchema", () => {
    it("acepta una beca a $0 y un descuento en centavos enteros", () => {
      expect(AjustarPrecioMembresiaSchema.safeParse({ precio: 0 }).success).toBe(
        true
      );
      expect(
        AjustarPrecioMembresiaSchema.safeParse({ precio: 25000 }).success
      ).toBe(true);
    });

    it("rechaza precios negativos o fraccionarios", () => {
      expect(
        AjustarPrecioMembresiaSchema.safeParse({ precio: -1 }).success
      ).toBe(false);
      expect(
        AjustarPrecioMembresiaSchema.safeParse({ precio: 10.5 }).success
      ).toBe(false);
    });
  });

  describe("BajaAnticipadaSchema", () => {
    it("acepta la nueva fecha de fin como fecha calendario", () => {
      expect(
        BajaAnticipadaSchema.safeParse({ fechaFin: "2026-11-15" }).success
      ).toBe(true);
    });

    it("rechaza fecha de fin inválida", () => {
      expect(
        BajaAnticipadaSchema.safeParse({ fechaFin: "mañana" }).success
      ).toBe(false);
    });
  });
});
