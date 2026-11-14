import { tieneAlgunRol, type RolAfiliacion } from "@centris/shared";
export {
  obtenerEtiquetaRol,
  obtenerInicialesUsuario
} from "@/lib/identidad-ui";

export type IconoNavegacionId =
  | "inicio"
  | "horarios"
  | "clases"
  | "reservas"
  | "planes"
  | "atletas"
  | "caja"
  | "afiliaciones"
  | "configuracion";

export interface ItemNavegacionBox {
  id: IconoNavegacionId;
  href: string;
  label: string;
  testId: string;
  section: "principal" | "pie";
  rolesPermitidos?: readonly RolAfiliacion[];
}

const ITEMS_NAVEGACION: readonly ItemNavegacionBox[] = [
  {
    id: "inicio",
    href: "/inicio",
    label: "Panel",
    testId: "nav-link-inicio",
    section: "principal"
  },
  {
    id: "horarios",
    href: "/horarios",
    label: "Horarios",
    testId: "nav-link-horarios",
    section: "principal"
  },
  {
    id: "clases",
    href: "/clases",
    label: "Calendario de Clases",
    testId: "nav-link-clases",
    section: "principal"
  },
  {
    id: "reservas",
    href: "/reservas",
    label: "Mis Reservas",
    testId: "nav-link-reservas",
    section: "principal",
    rolesPermitidos: ["atleta", "administrador", "recepcionista"]
  },
  {
    id: "planes",
    href: "/planes",
    label: "Planes",
    testId: "nav-link-planes",
    section: "principal",
    rolesPermitidos: ["administrador", "recepcionista"]
  },
  {
    id: "atletas",
    href: "/atletas",
    label: "Atletas",
    testId: "nav-link-atletas",
    section: "principal",
    rolesPermitidos: ["administrador", "recepcionista"]
  },
  {
    id: "caja",
    href: "/caja",
    label: "Caja y Morosos",
    testId: "nav-link-caja",
    section: "principal",
    rolesPermitidos: ["administrador", "recepcionista"]
  },
  {
    id: "afiliaciones",
    href: "/afiliaciones",
    label: "Afiliaciones",
    testId: "nav-link-afiliaciones",
    section: "principal",
    rolesPermitidos: ["administrador"]
  },
  {
    id: "configuracion",
    href: "/configuracion",
    label: "Configuración",
    testId: "nav-link-configuracion",
    section: "pie",
    rolesPermitidos: ["administrador"]
  }
];

/**
 * Resuelve los enlaces visibles en el sidebar principal y pie según la unión de roles de la Afiliación.
 */
export function resolverNavegacionPorRoles(roles: readonly RolAfiliacion[]): {
  principal: ItemNavegacionBox[];
  pie: ItemNavegacionBox[];
} {
  const visibles = ITEMS_NAVEGACION.filter(
    (item) =>
      !item.rolesPermitidos || tieneAlgunRol(roles, item.rolesPermitidos)
  );

  return {
    principal: visibles.filter((item) => item.section === "principal"),
    pie: visibles.filter((item) => item.section === "pie")
  };
}

export function esRutaActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function formatearFechaOperativaBox(
  timezone: string,
  fecha: Date = new Date()
): string {
  try {
    const partes = new Intl.DateTimeFormat("es-AR", {
      timeZone: timezone,
      weekday: "short",
      day: "2-digit",
      month: "2-digit"
    }).formatToParts(fecha);
    const weekday =
      partes.find((p) => p.type === "weekday")?.value.replace(/\./g, "").trim() ?? "";
    const day = partes.find((p) => p.type === "day")?.value ?? "";
    const month = partes.find((p) => p.type === "month")?.value ?? "";
    if (!day || !month) {
      return "Hoy";
    }
    return weekday ? `Hoy · ${weekday} ${day}/${month}` : `Hoy · ${day}/${month}`;
  } catch {
    return "Hoy";
  }
}
