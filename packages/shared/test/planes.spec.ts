import { describe, expect, it } from "vitest";
import {
  ActualizarPlanSchema,
  CrearPlanSchema,
  MODALIDADES_CREDITOS,
  ModalidadCreditosSchema,
  PlanSchema
} from "../src/index.js";

describe("Seam 1 — Esquemas Zod y Contratos de Dominio de Planes (@centris/shared)", () => {
  it("expone las tres modalidades de créditos del glosario", () => {
    expect(MODALIDADES_CREDITOS).toEqual([
      "SEMANAL",
      "VIGENCIA_TOTAL",
      "ILIMITADO"
    ]);
    expect(ModalidadCreditosSchema.safeParse("SEMANAL").success).toBe(true);
    expect(ModalidadCreditosSchema.safeParse("VIGENCIA_TOTAL").success).toBe(
      true
    );
    expect(ModalidadCreditosSchema.safeParse("ILIMITADO").success).toBe(true);
    expect(ModalidadCreditosSchema.safeParse("MENSUAL").success).toBe(false);
  });

  it("exige creditos_por_periodo > 0 para modalidades SEMANAL y VIGENCIA_TOTAL", () => {
    const semanalValido = CrearPlanSchema.safeParse({
      nombre: "Pase 3 veces por semana",
      precioBase: 35000,
      duracionDias: 30,
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 3
    });
    expect(semanalValido.success).toBe(true);
    if (semanalValido.success) {
      expect(semanalValido.data.creditosPorPeriodo).toBe(3);
    }

    const vigenciaTotalValida = CrearPlanSchema.safeParse({
      nombre: "Pack 10 clases",
      precioBase: 42000,
      duracionDias: 60,
      modalidadCreditos: "VIGENCIA_TOTAL",
      creditosPorPeriodo: 10
    });
    expect(vigenciaTotalValida.success).toBe(true);
    if (vigenciaTotalValida.success) {
      expect(vigenciaTotalValida.data.creditosPorPeriodo).toBe(10);
    }

    // Falla si no se indican créditos o si es 0 en modalidad finita
    const semanalSinCreditos = CrearPlanSchema.safeParse({
      nombre: "Incompleto",
      precioBase: 25000,
      duracionDias: 30,
      modalidadCreditos: "SEMANAL"
    });
    expect(semanalSinCreditos.success).toBe(false);

    const vigenciaTotalCero = CrearPlanSchema.safeParse({
      nombre: "Cero créditos",
      precioBase: 25000,
      duracionDias: 30,
      modalidadCreditos: "VIGENCIA_TOTAL",
      creditosPorPeriodo: 0
    });
    expect(vigenciaTotalCero.success).toBe(false);
  });

  it("fuerza creditos_por_periodo como NULL cuando la modalidad es ILIMITADO", () => {
    const ilimitadoValido = CrearPlanSchema.safeParse({
      nombre: "Plan Libre Mensual",
      precioBase: 48000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO"
    });
    expect(ilimitadoValido.success).toBe(true);
    if (ilimitadoValido.success) {
      expect(ilimitadoValido.data.creditosPorPeriodo).toBeNull();
    }

    const ilimitadoConNumero = CrearPlanSchema.safeParse({
      nombre: "Plan Libre Mensual",
      precioBase: 48000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO",
      creditosPorPeriodo: 99
    });
    expect(ilimitadoConNumero.success).toBe(true);
    if (ilimitadoConNumero.success) {
      // Debe guardarse estrictamente como NULL según el criterio de aceptación
      expect(ilimitadoConNumero.data.creditosPorPeriodo).toBeNull();
    }

    const ilimitadoConCero = CrearPlanSchema.safeParse({
      nombre: "Plan Libre Mensual",
      precioBase: 48000,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO",
      creditosPorPeriodo: 0
    });
    expect(ilimitadoConCero.success).toBe(true);
    if (ilimitadoConCero.success) {
      expect(ilimitadoConCero.data.creditosPorPeriodo).toBeNull();
    }
  });

  it("rechaza duracion_dias menor a 1 o precio_base negativo", () => {
    const duracionInvalida = CrearPlanSchema.safeParse({
      nombre: "Plan Fallido",
      precioBase: 1000,
      duracionDias: 0,
      modalidadCreditos: "ILIMITADO"
    });
    expect(duracionInvalida.success).toBe(false);

    const precioInvalido = CrearPlanSchema.safeParse({
      nombre: "Plan Fallido",
      precioBase: -500,
      duracionDias: 30,
      modalidadCreditos: "ILIMITADO"
    });
    expect(precioInvalido.success).toBe(false);
  });

  it("valida la entidad completa Plan y la actualización parcial", () => {
    const planCompleto = PlanSchema.safeParse({
      id: "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
      boxId: "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2",
      nombre: "CrossFit 3x Semana",
      precioBase: 35000,
      duracionDias: 30,
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 3,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });
    expect(planCompleto.success).toBe(true);

    const actualizacion = ActualizarPlanSchema.safeParse({
      nombre: "Nombre Modificado",
      activo: false
    });
    expect(actualizacion.success).toBe(true);

    const actualizacionModalidadSinCreditos = ActualizarPlanSchema.safeParse({
      modalidadCreditos: "SEMANAL"
    });
    expect(actualizacionModalidadSinCreditos.success).toBe(false);

    const actualizacionModalidadConCreditos = ActualizarPlanSchema.safeParse({
      modalidadCreditos: "SEMANAL",
      creditosPorPeriodo: 4
    });
    expect(actualizacionModalidadConCreditos.success).toBe(true);
  });
});
