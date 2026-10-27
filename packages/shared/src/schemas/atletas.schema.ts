import { z } from "zod";
import { RolAfiliacionSchema } from "../roles/roles.schema.js";

/**
 * Esquema para crear/dar de alta un Atleta en el Box activo.
 * Si el email ya pertenece a un Usuario global, se asocia transparentemente.
 * Si no existe, se crea el Usuario con password_hash = NULL (primer ingreso).
 */
export const CrearAtletaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del atleta es obligatorio.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un correo electrónico válido.")
});

export type CrearAtleta = z.infer<typeof CrearAtletaSchema>;

/**
 * Esquema para actualizar datos operativos de un Atleta en el Box.
 */
export const ActualizarAtletaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío.")
    .max(120, "El nombre no puede superar los 120 caracteres.")
    .optional(),
  activo: z.boolean().optional()
});

export type ActualizarAtleta = z.infer<typeof ActualizarAtletaSchema>;

/**
 * Esquema de filtros de búsqueda para el directorio de Atletas del Box.
 */
export const FiltroAtletasSchema = z.object({
  buscar: z
    .string()
    .trim()
    .transform((val) => (val.length === 0 ? undefined : val))
    .optional(),
  soloActivos: z
    .preprocess((val) => {
      if (typeof val === "string") {
        if (val === "false") return false;
        if (val === "true") return true;
      }
      return val;
    }, z.boolean())
    .optional()
    .default(true)
});

export type FiltroAtletas = z.infer<typeof FiltroAtletasSchema>;

/**
 * Atleta: Representación del atleta en el contexto del Box (unión de Afiliación y datos de identidad de Usuario).
 */
export const AtletaSchema = z.object({
  id: z.string().uuid(),
  afiliacionId: z.string().uuid(),
  boxId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  email: z.string().email(),
  roles: z.array(RolAfiliacionSchema).min(1),
  activo: z.boolean(),
  passwordActivada: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional()
});

export type Atleta = z.infer<typeof AtletaSchema>;
