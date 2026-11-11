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

/**
 * Evalúa si la Afiliación posee roles de staff administrativo (administrador o recepcionista)
 * con visibilidad y potestades operativas sobre todas las clases y reservas del Box.
 */
export function esStaffAdministrativo(
  rolesAfiliacion: readonly RolAfiliacion[]
): boolean {
  return tieneAlgunRol(rolesAfiliacion, ["administrador", "recepcionista"]);
}

/**
 * Evalúa si la Afiliación opera como Coach sin privilegios de staff administrativo.
 * Un Coach que además posee el rol de Atleta (ADR 0007) sigue teniendo visibilidad acotada a sus Clases asignadas.
 */
export function esCoachSinPermisosStaff(
  rolesAfiliacion: readonly RolAfiliacion[]
): boolean {
  return rolesAfiliacion.includes("coach") && !esStaffAdministrativo(rolesAfiliacion);
}

