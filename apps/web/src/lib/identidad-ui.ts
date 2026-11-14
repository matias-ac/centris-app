import type { RolAfiliacion } from "@centris/shared";

const ETIQUETAS_ROL: Record<
  RolAfiliacion,
  { label: string; variant: "mint" | "amber" | "zinc" }
> = {
  administrador: { label: "Administrador", variant: "mint" },
  recepcionista: { label: "Recepcionista", variant: "amber" },
  coach: { label: "Coach", variant: "mint" },
  atleta: { label: "Atleta", variant: "zinc" }
};

/**
 * Devuelve la etiqueta legible en Sentence case y variante semántica para un Rol.
 */
export function obtenerEtiquetaRol(rol: RolAfiliacion): {
  label: string;
  variant: "mint" | "amber" | "zinc";
} {
  return ETIQUETAS_ROL[rol];
}

/**
 * Genera iniciales de hasta 2 letras a partir del nombre del Usuario.
 */
export function obtenerInicialesUsuario(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return "US";
  }
  if (partes.length === 1) {
    return partes[0]!.slice(0, 2).toUpperCase();
  }
  return `${partes[0]![0] ?? ""}${partes[partes.length - 1]![0] ?? ""}`.toUpperCase();
}
