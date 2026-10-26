import { z } from "zod";

export const MODALIDADES_CREDITOS = [
  "SEMANAL",
  "VIGENCIA_TOTAL",
  "ILIMITADO"
] as const;

export const ModalidadCreditosSchema = z.enum(MODALIDADES_CREDITOS);
export type ModalidadCreditos = z.infer<typeof ModalidadCreditosSchema>;

export const PlanSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  nombre: z.string().trim().min(1, "El nombre del plan es requerido").max(120),
  precioBase: z.number().int().min(0, "El precio base no puede ser negativo"),
  duracionDias: z.number().int().min(1, "La duración mínima es de 1 día"),
  modalidadCreditos: ModalidadCreditosSchema,
  creditosPorPeriodo: z.number().int().min(1).nullable(),
  activo: z.boolean(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable().optional()
});

export type Plan = z.infer<typeof PlanSchema>;

export const CrearPlanSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre del plan es requerido")
      .max(120),
    precioBase: z.coerce
      .number()
      .int("El precio base debe ser un entero en centavos")
      .min(0, "El precio base no puede ser negativo"),
    duracionDias: z.coerce
      .number()
      .int("La duración en días debe ser un entero")
      .min(1, "La duración mínima es de 1 día"),
    modalidadCreditos: ModalidadCreditosSchema,
    creditosPorPeriodo: z.coerce
      .number()
      .int("Los créditos deben ser un número entero")
      .nullable()
      .optional()
  })
  .superRefine((data, ctx) => {
    if (data.modalidadCreditos === "ILIMITADO") {
      return;
    }
    if (!data.creditosPorPeriodo || data.creditosPorPeriodo <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditosPorPeriodo"],
        message:
          "Para modalidades SEMANAL o VIGENCIA_TOTAL los créditos por período deben ser mayores a cero."
      });
    }
  })
  .transform((data) => ({
    ...data,
    creditosPorPeriodo:
      data.modalidadCreditos === "ILIMITADO"
        ? null
        : data.creditosPorPeriodo ?? null
  }));

export type CrearPlanInput = z.input<typeof CrearPlanSchema>;
export type CrearPlan = z.output<typeof CrearPlanSchema>;

export const ActualizarPlanSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre del plan es requerido")
      .max(120)
      .optional(),
    precioBase: z.coerce
      .number()
      .int("El precio base debe ser un entero en centavos")
      .min(0, "El precio base no puede ser negativo")
      .optional(),
    duracionDias: z.coerce
      .number()
      .int("La duración en días debe ser un entero")
      .min(1, "La duración mínima es de 1 día")
      .optional(),
    modalidadCreditos: ModalidadCreditosSchema.optional(),
    creditosPorPeriodo: z.coerce
      .number()
      .int("Los créditos deben ser un número entero")
      .nullable()
      .optional(),
    activo: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.modalidadCreditos && data.modalidadCreditos !== "ILIMITADO") {
      if (
        data.creditosPorPeriodo === undefined ||
        data.creditosPorPeriodo === null ||
        data.creditosPorPeriodo <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creditosPorPeriodo"],
          message:
            "Para modalidades SEMANAL o VIGENCIA_TOTAL los créditos por período deben ser mayores a cero."
        });
      }
    }
  })
  .transform((data) => {
    if (data.modalidadCreditos === "ILIMITADO") {
      return {
        ...data,
        creditosPorPeriodo: null
      };
    }
    return data;
  });

export type ActualizarPlanInput = z.input<typeof ActualizarPlanSchema>;
export type ActualizarPlan = z.output<typeof ActualizarPlanSchema>;
