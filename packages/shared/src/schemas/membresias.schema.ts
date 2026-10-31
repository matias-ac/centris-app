import { z } from "zod";
import { ModalidadCreditosSchema } from "./planes.schema.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function esFechaCalendarioValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

/** Fecha calendario `YYYY-MM-DD` interpretada en la zona horaria del Box. */
export const FechaCalendarioSchema = z
  .string()
  .refine(esFechaCalendarioValida, "Debe ser una fecha calendario válida (YYYY-MM-DD)");

/**
 * Calcula el último día (inclusivo) de la Vigencia de una Membresía:
 * una Vigencia de `duracionDias` días que empieza en `fechaInicio` termina
 * `duracionDias - 1` días después.
 */
export function calcularFechaFinVigencia(
  fechaInicio: string,
  duracionDias: number
): string {
  const inicio = new Date(`${fechaInicio}T00:00:00.000Z`).getTime();
  return new Date(inicio + (duracionDias - 1) * MS_POR_DIA)
    .toISOString()
    .slice(0, 10);
}

export const MembresiaSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  afiliacionId: z.string().uuid(),
  planId: z.string().uuid(),
  precio: z.number().int().min(0),
  modalidadCreditos: ModalidadCreditosSchema,
  creditosPorPeriodo: z.number().int().min(1).nullable(),
  creditosExtra: z.number().int(),
  fechaInicio: FechaCalendarioSchema,
  fechaFin: FechaCalendarioSchema,
  bajaAnticipadaEn: z.union([z.date(), z.string()]).nullable(),
  bajaPorUsuarioId: z.string().uuid().nullable(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable().optional()
});

export type Membresia = z.infer<typeof MembresiaSchema>;

export const CrearMembresiaSchema = z.object({
  afiliacionId: z.string().uuid("La afiliación del Atleta es inválida"),
  planId: z.string().uuid("El plan es inválido"),
  fechaInicio: FechaCalendarioSchema
});

export type CrearMembresia = z.infer<typeof CrearMembresiaSchema>;

export const FiltroMembresiasSchema = z.object({
  afiliacionId: z.string().uuid("La afiliación del Atleta es inválida").optional()
});

export type FiltroMembresias = z.infer<typeof FiltroMembresiasSchema>;

export const AjustarCreditosExtraSchema = z.object({
  creditosExtra: z.coerce
    .number()
    .int("Los créditos extra deben ser un número entero")
});

export type AjustarCreditosExtra = z.infer<typeof AjustarCreditosExtraSchema>;

export const AjustarPrecioMembresiaSchema = z.object({
  precio: z.coerce
    .number()
    .int("El precio debe ser un entero en centavos")
    .min(0, "El precio no puede ser negativo")
});

export type AjustarPrecioMembresia = z.infer<typeof AjustarPrecioMembresiaSchema>;

export const BajaAnticipadaSchema = z.object({
  fechaFin: FechaCalendarioSchema
});

export type BajaAnticipada = z.infer<typeof BajaAnticipadaSchema>;
