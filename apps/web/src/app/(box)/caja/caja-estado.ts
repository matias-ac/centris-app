import {
  AnularPagoSchema,
  ERROR_CODES,
  type ErrorCode,
  type MedioPago,
  type Moroso,
  type PagoConRegistrador
} from "@centris/shared";
import { anularPagoAction } from "@/lib/actions";

export type FiltroEstadoAuditoria = "TODOS" | "VALIDOS" | "ANULADOS";

export type FiltroMedioPagoAuditoria = "TODOS" | MedioPago;

export interface FiltrosAuditoriaCaja {
  busqueda: string;
  estado: FiltroEstadoAuditoria;
  medioPago: FiltroMedioPagoAuditoria;
}

export interface KpisCaja {
  saldoTotalPendiente: number;
  cantidadMorosos: number;
  ingresosValidos: number;
  cantidadPagosValidos: number;
  cantidadPagosAnulados: number;
  totalPagos: number;
}

const ETIQUETAS_MEDIO_PAGO: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro"
};

const MENSAJE_MOTIVO_ANULACION_INVALIDO =
  "Ingresá un motivo claro de al menos 3 caracteres para registrar la anulación.";

const MENSAJES_ERROR_CAJA: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.PAGO_YA_ANULADO]:
    "Este pago ya fue anulado previamente y no admite otra anulación.",
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "Tu afiliación no tiene permisos de Administración para anular pagos o auditar la caja.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo antes de continuar.",
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión venció. Volvé a iniciar sesión para continuar.",
  [ERROR_CODES.VALIDACION_FALLIDA]: MENSAJE_MOTIVO_ANULACION_INVALIDO
};

const MENSAJE_ERROR_RESPALDO =
  "No pudimos completar la operación de caja. Revisá los datos e intentá nuevamente.";

/**
 * Calcula los indicadores principales de Caja y Auditoría excluyendo anulados de ingresos.
 */
export function calcularKpisCaja(
  morosos: readonly Moroso[],
  pagos: readonly PagoConRegistrador[]
): KpisCaja {
  const saldoTotalPendiente = morosos.reduce(
    (acc, moroso) => acc + moroso.totalDeuda,
    0
  );

  let ingresosValidos = 0;
  let cantidadPagosValidos = 0;
  let cantidadPagosAnulados = 0;

  for (const pago of pagos) {
    if (pago.anuladoEn === null) {
      cantidadPagosValidos += 1;
      ingresosValidos += pago.monto;
    } else {
      cantidadPagosAnulados += 1;
    }
  }

  return {
    saldoTotalPendiente,
    cantidadMorosos: morosos.length,
    ingresosValidos,
    cantidadPagosValidos,
    cantidadPagosAnulados,
    totalPagos: pagos.length
  };
}

/**
 * Filtra atletas morosos por nombre o correo electrónico.
 */
export function filtrarMorososCaja(
  morosos: readonly Moroso[],
  busqueda: string
): Moroso[] {
  const consulta = busqueda.trim().toLowerCase();
  if (!consulta) {
    return [...morosos];
  }

  return morosos.filter(
    (moroso) =>
      moroso.nombre.toLowerCase().includes(consulta) ||
      moroso.email.toLowerCase().includes(consulta)
  );
}

/**
 * Filtra movimientos inmutables de auditoría por estado, medio de pago y búsqueda libre.
 */
export function filtrarAuditoriaCaja(
  pagos: readonly PagoConRegistrador[],
  filtros: FiltrosAuditoriaCaja
): PagoConRegistrador[] {
  const consulta = filtros.busqueda.trim().toLowerCase();

  return pagos.filter((pago) => {
    const estaAnulado = pago.anuladoEn !== null;

    if (filtros.estado === "VALIDOS" && estaAnulado) {
      return false;
    }
    if (filtros.estado === "ANULADOS" && !estaAnulado) {
      return false;
    }
    if (filtros.medioPago !== "TODOS" && pago.medioPago !== filtros.medioPago) {
      return false;
    }

    if (consulta) {
      const texto = [
        pago.registradoPorNombre ?? "",
        formatearMedioPagoCaja(pago.medioPago),
        pago.motivoAnulacion ?? "",
        pago.fechaPago
      ]
        .join(" ")
        .toLowerCase();

      if (!texto.includes(consulta)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Devuelve la etiqueta humana en español de un medio de pago.
 */
export function formatearMedioPagoCaja(medioPago: MedioPago): string {
  return ETIQUETAS_MEDIO_PAGO[medioPago];
}

/**
 * Construye la ruta de navegación directa hacia la ficha del atleta en /atletas.
 */
export function construirUrlFichaAtleta(afiliacionId: string): string {
  return `/atletas?afiliacionId=${encodeURIComponent(afiliacionId)}`;
}

/**
 * Traduce códigos de error técnicos o HTTP a mensajes claros de dominio en español.
 */
export function traducirErrorCaja(
  errorCode?: string,
  message?: string
): string {
  if (errorCode && errorCode in MENSAJES_ERROR_CAJA) {
    return MENSAJES_ERROR_CAJA[errorCode as ErrorCode] ?? MENSAJE_ERROR_RESPALDO;
  }

  const mensajeLimpio = message?.trim();
  const contieneJergaTecnica =
    !mensajeLimpio ||
    /\b(401|403|404|409|422|500|Forbidden|Unauthorized|SQLSTATE|[A-Z]{2,}_[A-Z_]+)\b/.test(
      mensajeLimpio
    );

  return contieneJergaTecnica ? MENSAJE_ERROR_RESPALDO : mensajeLimpio;
}

/**
 * Valida el motivo obligatorio y ejecuta la Anulación auditable de un Pago.
 */
export async function procesarAnulacionPago(
  boxId: string,
  pagoId: string,
  motivoAnulacion: string
): Promise<{ ok: true; mensajeExito: string } | { ok: false; error: string }> {
  const validacion = AnularPagoSchema.safeParse({ motivoAnulacion });
  if (!validacion.success) {
    return {
      ok: false,
      error:
        validacion.error.issues[0]?.message ?? MENSAJE_MOTIVO_ANULACION_INVALIDO
    };
  }

  const res = await anularPagoAction(boxId, pagoId, validacion.data);
  if (!res.ok) {
    return {
      ok: false,
      error: traducirErrorCaja(res.errorCode, res.message)
    };
  }

  return {
    ok: true,
    mensajeExito: "El pago quedó anulado en auditoría y el saldo fue recalculado."
  };
}
