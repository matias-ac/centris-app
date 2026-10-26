import { z } from "zod";

/**
 * Cuatro roles atómicos y componibles por Afiliación (ADR 0007 y GLOSSARY.md).
 */
export const ROLES_AFILIACION = [
  "administrador",
  "recepcionista",
  "coach",
  "atleta"
] as const;

export const RolAfiliacionSchema = z.enum(ROLES_AFILIACION);

export type RolAfiliacion = z.infer<typeof RolAfiliacionSchema>;

/**
 * Evalúa si la Afiliación activa posee al menos uno de los roles requeridos
 * (composición por unión de capacidades según ADR 0007).
 */
export function tieneAlgunRol(
  rolesAfiliacion: readonly RolAfiliacion[],
  rolesRequeridos: readonly RolAfiliacion[]
): boolean {
  return rolesRequeridos.some((rol) => rolesAfiliacion.includes(rol));
}

