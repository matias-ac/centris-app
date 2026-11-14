import {
  ActualizarRolesAfiliacionSchema,
  ERROR_CODES,
  tieneAlgunRol,
  type AfiliacionConUsuario,
  type ErrorCode,
  type RolAfiliacion
} from "@centris/shared";
import { obtenerEtiquetaRol } from "@/lib/identidad-ui";

export type FiltroRolAfiliacion = "TODOS" | RolAfiliacion;

export interface OpcionRolAfiliacion {
  id: RolAfiliacion;
  label: string;
}

export interface KpisAfiliaciones {
  total: number;
  equipoOperativo: number;
  atletas: number;
}

export type ResultadoAccionAfiliacion =
  | { ok: true }
  | { ok: false; errorCode?: string; message?: string };

export type AccionGuardarRolesFn = (
  boxId: string,
  afiliacionId: string,
  roles: RolAfiliacion[]
) => Promise<ResultadoAccionAfiliacion>;

export type AccionBajaAfiliacionFn = (
  boxId: string,
  afiliacionId: string
) => Promise<ResultadoAccionAfiliacion>;

export const ORDEN_ROLES_AFILIACION: readonly RolAfiliacion[] = [
  "administrador",
  "coach",
  "recepcionista",
  "atleta"
];

export const OPCIONES_ROLES_AFILIACION: readonly OpcionRolAfiliacion[] =
  ORDEN_ROLES_AFILIACION.map((rol) => ({
    id: rol,
    label: obtenerEtiquetaRol(rol).label
  }));

const ROLES_EQUIPO_OPERATIVO: readonly RolAfiliacion[] = [
  "administrador",
  "coach",
  "recepcionista"
];

const MENSAJE_MINIMO_UN_ROL =
  "Cada persona debe conservar al menos un rol activo. Si querés quitarle acceso, usá Dar de baja.";

const MENSAJES_ERROR_AFILIACION: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.ULTIMO_ADMINISTRADOR]:
    "No podés quitar el rol ni dar de baja al único Administrador activo del Box.",
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "Solo un usuario con rol de Administrador puede gestionar las afiliaciones del Box.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo antes de aplicar estos cambios.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión venció. Volvé a iniciar sesión para continuar.",
  [ERROR_CODES.VALIDACION_FALLIDA]: MENSAJE_MINIMO_UN_ROL
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos completar la operación en este momento. Intentá nuevamente en unos segundos.";

/**
 * Calcula los totales operativos del directorio de afiliaciones del Box.
 */
export function calcularKpisAfiliaciones(
  afiliaciones: readonly AfiliacionConUsuario[]
): KpisAfiliaciones {
  let equipoOperativo = 0;
  let atletas = 0;

  for (const afiliacion of afiliaciones) {
    if (tieneAlgunRol(afiliacion.roles, ROLES_EQUIPO_OPERATIVO)) {
      equipoOperativo += 1;
    }
    if (afiliacion.roles.includes("atleta")) {
      atletas += 1;
    }
  }

  return {
    total: afiliaciones.length,
    equipoOperativo,
    atletas
  };
}

/**
 * Filtra afiliaciones por nombre/correo y rol asignado en el Box.
 */
export function filtrarAfiliaciones(
  afiliaciones: readonly AfiliacionConUsuario[],
  busqueda: string,
  filtroRol: FiltroRolAfiliacion
): AfiliacionConUsuario[] {
  const consulta = busqueda.trim().toLowerCase();

  return afiliaciones.filter((afiliacion) => {
    if (consulta) {
      const coincideNombre = afiliacion.usuario.nombre
        .toLowerCase()
        .includes(consulta);
      const coincideEmail = afiliacion.usuario.email
        .toLowerCase()
        .includes(consulta);
      if (!coincideNombre && !coincideEmail) {
        return false;
      }
    }

    if (filtroRol !== "TODOS" && !afiliacion.roles.includes(filtroRol)) {
      return false;
    }

    return true;
  });
}

/**
 * Evalúa si dos conjuntos de roles coinciden sin depender del orden.
 */
export function sonRolesIguales(
  a: readonly RolAfiliacion[],
  b: readonly RolAfiliacion[]
): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) {
    return false;
  }
  for (const rol of setA) {
    if (!setB.has(rol)) {
      return false;
    }
  }
  return true;
}

/**
 * Conmuta un rol dentro del borrador sin generar duplicados.
 */
export function alternarRolEnBorrador(
  roles: readonly RolAfiliacion[],
  rol: RolAfiliacion
): RolAfiliacion[] {
  if (roles.includes(rol)) {
    return roles.filter((item) => item !== rol);
  }
  return Array.from(new Set([...roles, rol]));
}

/**
 * Valida localmente contra el contrato compartido que exista al menos un rol activo.
 */
export function validarRolesAfiliacionLocal(
  roles: readonly RolAfiliacion[]
): { ok: true; roles: RolAfiliacion[] } | { ok: false; error: string } {
  const unicos = Array.from(new Set(roles));
  const validado = ActualizarRolesAfiliacionSchema.safeParse({ roles: unicos });
  if (!validado.success) {
    return {
      ok: false,
      error: MENSAJE_MINIMO_UN_ROL
    };
  }
  return { ok: true, roles: validado.data.roles };
}

/**
 * Traduce códigos de error del servidor a copy humano sin exponer errorCode ni HTTP.
 */
export function traducirErrorAfiliacion(errorCode?: string): string {
  if (errorCode && errorCode in MENSAJES_ERROR_AFILIACION) {
    return (
      MENSAJES_ERROR_AFILIACION[errorCode as ErrorCode] ??
      MENSAJE_ERROR_RESPALDO
    );
  }
  return MENSAJE_ERROR_RESPALDO;
}

/**
 * Valida y persiste la composición de roles de una Afiliación.
 */
export async function procesarGuardadoRoles(
  boxId: string,
  afiliacionId: string,
  rolesBorrador: readonly RolAfiliacion[],
  accionGuardar: AccionGuardarRolesFn
): Promise<
  { ok: true; rolesGuardados: RolAfiliacion[] } | { ok: false; error: string }
> {
  const validacion = validarRolesAfiliacionLocal(rolesBorrador);
  if (!validacion.ok) {
    return validacion;
  }

  try {
    const res = await accionGuardar(boxId, afiliacionId, validacion.roles);
    if (!res.ok) {
      return {
        ok: false,
        error: traducirErrorAfiliacion(res.errorCode)
      };
    }
    return { ok: true, rolesGuardados: validacion.roles };
  } catch {
    return {
      ok: false,
      error: MENSAJE_ERROR_RESPALDO
    };
  }
}

/**
 * Ejecuta la baja local de una Afiliación traduciendo fallos de dominio a copy claro.
 */
export async function procesarBajaAfiliacion(
  boxId: string,
  afiliacionId: string,
  accionBaja: AccionBajaAfiliacionFn
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await accionBaja(boxId, afiliacionId);
    if (!res.ok) {
      return {
        ok: false,
        error: traducirErrorAfiliacion(res.errorCode)
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: MENSAJE_ERROR_RESPALDO
    };
  }
}
