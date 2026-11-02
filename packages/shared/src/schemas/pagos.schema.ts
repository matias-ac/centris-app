import { z } from "zod";
import { FechaCalendarioSchema } from "./membresias.schema.js";

export const MEDIOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "OTRO"] as const;

export const MedioPagoSchema = z.enum(MEDIOS_PAGO);

export type MedioPago = z.infer<typeof MedioPagoSchema>;

export const CrearPagoSchema = z.object({
  membresiaId: z.string().uuid("La membresía es obligatoria y debe ser un UUID válido"),
  monto: z
    .number()
    .int("El monto debe ser un número entero sin decimales")
    .positive("El monto debe ser estrictamente mayor a cero"),
  medioPago: MedioPagoSchema,
  fechaPago: FechaCalendarioSchema
});

export type CrearPago = z.infer<typeof CrearPagoSchema>;

export const AnularPagoSchema = z.object({
  motivoAnulacion: z
    .string()
    .trim()
    .min(3, "El motivo de anulación debe tener al menos 3 caracteres")
    .max(255, "El motivo de anulación no puede superar los 255 caracteres")
});

export type AnularPago = z.infer<typeof AnularPagoSchema>;

export const PagoSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  membresiaId: z.string().uuid(),
  monto: z.number().int().positive(),
  medioPago: MedioPagoSchema,
  fechaPago: FechaCalendarioSchema,
  registradoPorUsuarioId: z.string().uuid(),
  anuladoEn: z.union([z.date(), z.string()]).nullable(),
  anuladoPorUsuarioId: z.string().uuid().nullable(),
  motivoAnulacion: z.string().nullable(),
  createdAt: z.union([z.date(), z.string()])
});

export type Pago = z.infer<typeof PagoSchema>;

export interface PagoConRegistrador extends Pago {
  registradoPorNombre?: string | null;
  anuladoPorNombre?: string | null;
}

export const FiltroMorososSchema = z.object({
  busqueda: z.string().trim().optional()
});

export type FiltroMorosos = z.infer<typeof FiltroMorososSchema>;

export interface Moroso {
  afiliacionId: string;
  usuarioId: string;
  nombre: string;
  email: string;
  dni?: string | null;
  telefono?: string | null;
  totalDeuda: number;
  membresiasConDeuda: Array<{
    membresiaId: string;
    nombrePlan: string;
    precio: number;
    totalPagado: number;
    saldo: number;
    fechaInicio: string;
    fechaFin: string;
  }>;
}

/**
 * Calcula el Saldo derivado de una Membresía (ADR 0006):
 * Saldo = Precio − Suma de Pagos no anulados.
 */
export function calcularSaldoMembresia(
  precio: number,
  pagos: Array<{ monto: number; anuladoEn?: string | Date | null }>
): number {
  const totalPagado = pagos
    .filter((p) => p.anuladoEn === null || p.anuladoEn === undefined)
    .reduce((acumulado, p) => acumulado + p.monto, 0);

  return Math.max(0, precio - totalPagado);
}

/**
 * Determina si una Membresía o Atleta está en condición de Moroso (ADR 0006):
 * Un Saldo mayor a cero es deuda.
 */
export function determinarEstadoMoroso(saldo: number): boolean {
  return saldo > 0;
}
