import { z } from "zod";

export const TipoClaseSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del tipo de clase es requerido")
    .max(120),
  descripcion: z.string().trim().max(500).nullable().optional(),
  activo: z.boolean(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable().optional()
});

export type TipoClase = z.infer<typeof TipoClaseSchema>;

export const CrearTipoClaseSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del tipo de clase es requerido")
    .max(120),
  descripcion: z.string().trim().max(500).optional().nullable()
});

export type CrearTipoClase = z.infer<typeof CrearTipoClaseSchema>;

export const ActualizarTipoClaseSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del tipo de clase es requerido")
    .max(120)
    .optional(),
  descripcion: z.string().trim().max(500).optional().nullable(),
  activo: z.boolean().optional()
});

export type ActualizarTipoClase = z.infer<typeof ActualizarTipoClaseSchema>;
