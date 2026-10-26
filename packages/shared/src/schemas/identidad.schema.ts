import { z } from "zod";
import { RolAfiliacionSchema } from "../roles/roles.schema.js";

export function esTimezoneIanaValida(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("es-AR", { timeZone: timezone });
    return timezone.includes("/") || timezone === "UTC";
  } catch {
    return false;
  }
}

export const TimezoneIanaSchema = z
  .string()
  .trim()
  .min(3)
  .refine(esTimezoneIanaValida, {
    message: "La zona horaria debe ser un identificador IANA válido."
  });

export const MonedaIsoSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z]{3}$/,
    "La moneda debe ser un código ISO 4217 de 3 letras mayúsculas (ej. ARS, USD)."
  );

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
  timezone: TimezoneIanaSchema,
  moneda: MonedaIsoSchema,
  anticipacionReservaDias: z.number().int().min(1).max(90),
  ventanaCancelacionMinutos: z.number().int().min(0).max(10080)
});

export type Box = z.infer<typeof BoxSchema>;

/**
 * Esquema de actualización de la configuración general de un Box por su Administrador.
 */
export const ActualizarConfiguracionBoxSchema = z.object({
  timezone: TimezoneIanaSchema,
  moneda: MonedaIsoSchema,
  anticipacionReservaDias: z.coerce.number().int().min(1).max(90),
  ventanaCancelacionMinutos: z.coerce.number().int().min(0).max(10080)
});

export type ActualizarConfiguracionBox = z.infer<
  typeof ActualizarConfiguracionBoxSchema
>;

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

export const LoginSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128)
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ActivarCuentaSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  password: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres.")
    .max(128)
});

export type ActivarCuentaInput = z.infer<typeof ActivarCuentaSchema>;

export const SesionAuthSchema = z.object({
  accessToken: z.string().min(1),
  usuario: UsuarioSchema
});

export type SesionAuth = z.infer<typeof SesionAuthSchema>;

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

export const AfiliacionConBoxSchema = AfiliacionSchema.extend({
  box: BoxSchema
});

export type AfiliacionConBox = z.infer<typeof AfiliacionConBoxSchema>;

export const AfiliacionStaffSchema = AfiliacionSchema.extend({
  usuario: UsuarioSchema
});

export type AfiliacionStaff = z.infer<typeof AfiliacionStaffSchema>;

export const ActualizarRolesAfiliacionSchema = z.object({
  roles: z
    .array(RolAfiliacionSchema)
    .min(1, "La Afiliación debe conservar al menos un rol.")
});

export type ActualizarRolesAfiliacion = z.infer<
  typeof ActualizarRolesAfiliacionSchema
>;

export const SEED_BOX_IDS = {
  boxCentrisNorte: "00000000-0000-4000-8000-000000000101",
  boxCentrisSur: "00000000-0000-4000-8000-000000000102"
} as const;

