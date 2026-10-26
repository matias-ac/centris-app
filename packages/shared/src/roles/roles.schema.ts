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
