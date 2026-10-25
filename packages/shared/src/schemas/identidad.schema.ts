import { z } from "zod";
import { RolAfiliacionSchema } from "../roles/roles.schema.js";

/**
 * Box: Organización cliente de la plataforma y unidad de aislamiento (ADR 0001 / ADR 0004).
 */
export const BoxSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  timezone: z.string().min(1),
  moneda: z.string().length(3),
  anticipacionReservaDias: z.number().int().min(1).max(90),
  ventanaCancelacionMinutos: z.number().int().min(0).max(10080)
});

export type Box = z.infer<typeof BoxSchema>;

/**
 * Usuario: Persona con identidad única global en la plataforma (ADR 0001).
 */
export const UsuarioSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nombre: z.string().min(1).max(120),
  passwordActivada: z.boolean()
});

export type Usuario = z.infer<typeof UsuarioSchema>;

/**
 * Afiliación: Relación entre un Usuario y un Box con uno o más roles atómicos componibles.
 */
export const AfiliacionSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  roles: z.array(RolAfiliacionSchema).min(1),
  activo: z.boolean()
});

export type Afiliacion = z.infer<typeof AfiliacionSchema>;
