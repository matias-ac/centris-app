import {
  ERROR_CODES,
  tieneAlgunRol,
  type DiaOcupacionSemanal,
  type ResumenGestionPanel,
  type RolAfiliacion
} from "@centris/shared";

export interface EncabezadoPanel {
  titulo: string;
  subtitulo: string;
  ctaPrimario: {
    label: string;
    href: string;
  };
}

export interface AccesoRapidoPanel {
  href: string;
  label: string;
  descripcion: string;
}

export type DatoGraficoOcupacion = DiaOcupacionSemanal;

export interface SegmentoGraficoCobranza {
  nombre: string;
  valor: number;
  color: string;
}

const MENSAJES_ERROR_PANEL: Record<string, string> = {
  [ERROR_CODES.NO_AUTENTICADO]:
    "Tu sesión expiró. Volvé a iniciar sesión para ver el panel.",
  [ERROR_CODES.BOX_NO_SELECCIONADO]:
    "Seleccioná un Box activo para cargar el resumen operativo.",
  [ERROR_CODES.ACCESO_DENEGADO_ROL]:
    "No tenés permisos habilitados para consultar esta información del Box."
};

const PATRON_JERGA_TECNICA =
  /\b(400|401|403|404|409|422|500|Forbidden|Unauthorized|SQLSTATE|ERROR_CODES|[A-Z]{3,}_[A-Z0-9_]+)\b/i;

export function traducirErrorPanel(
  errorCode?: string | null,
  rawMessage?: string | null
): string {
  if (errorCode && MENSAJES_ERROR_PANEL[errorCode]) {
    return MENSAJES_ERROR_PANEL[errorCode];
  }
  const limpio = (rawMessage ?? "").trim();
  if (!limpio || PATRON_JERGA_TECNICA.test(limpio)) {
    return "No pudimos actualizar los indicadores del Box en este momento. Intentá nuevamente.";
  }
  return limpio;
}

export function formatearImporteMoneda(monto: number, moneda: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda || "ARS",
      maximumFractionDigits: 0
    }).format(monto);
  } catch {
    return `$ ${new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0
    }).format(monto)}`;
  }
}

export function formatearHoraInicio(
  isoString: string,
  timezone: string
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

export function formatearRangoHoraPanel(
  inicioIso: string,
  finIso: string,
  timezone: string
): string {
  return `${formatearHoraInicio(inicioIso, timezone)} – ${formatearHoraInicio(finIso, timezone)}`;
}

export function formatearFechaCortaInicio(fechaYmd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaYmd);
  if (!match) return fechaYmd;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function resolverEncabezadoPanel(
  roles: readonly RolAfiliacion[],
  nombreBox: string
): EncabezadoPanel {
  if (tieneAlgunRol(roles, ["administrador", "recepcionista"])) {
    return {
      titulo: "Panel operativo",
      subtitulo: `Resumen diario de ocupación, cobranza y seguimiento de atletas en ${nombreBox}.`,
      ctaPrimario: {
        label: "+ Registrar pago",
        href: "/caja"
      }
    };
  }

  if (tieneAlgunRol(roles, ["coach"])) {
    return {
      titulo: "Piso de entrenamiento",
      subtitulo: `Tus clases de hoy, cupos confirmados y registro de asistencia en ${nombreBox}.`,
      ctaPrimario: {
        label: "Abrir clases de hoy",
        href: "/clases"
      }
    };
  }

  return {
    titulo: "Tu entrenamiento",
    subtitulo: `Estado de tu membresía, créditos disponibles y próximas clases en ${nombreBox}.`,
    ctaPrimario: {
      label: "Reservar lugar",
      href: "/reservas"
    }
  };
}

export function construirAccesosRapidosPanel(
  roles: readonly RolAfiliacion[]
): AccesoRapidoPanel[] {
  const esAdmin = tieneAlgunRol(roles, ["administrador"]);
  const esRecepcion = tieneAlgunRol(roles, ["recepcionista"]);
  const esCoach = tieneAlgunRol(roles, ["coach"]);
  const esAtleta = tieneAlgunRol(roles, ["atleta"]);

  const accesos: AccesoRapidoPanel[] = [];

  if (esAdmin || esRecepcion || esAtleta) {
    accesos.push({
      href: "/reservas",
      label: "Mis Reservas",
      descripcion:
        esAdmin || esRecepcion
          ? "Cupos disponibles y anotación en mostrador"
          : "Reservá o cancelá tus clases"
    });
  }

  accesos.push({
    href: "/clases",
    label: "Calendario de Clases",
    descripcion: esCoach
      ? "Nómina de inscriptos y registro de asistencia"
      : "Clases programadas en la zona horaria del Box"
  });

  if (esAdmin || esRecepcion || esCoach) {
    accesos.push({
      href: "/horarios",
      label: "Horarios",
      descripcion: "Tipos de clase y horarios semanales recurrentes"
    });
  }

  if (esAdmin || esRecepcion) {
    accesos.push(
      {
        href: "/planes",
        label: "Planes",
        descripcion: "Catálogo comercial y modalidades de créditos"
      },
      {
        href: "/atletas",
        label: "Atletas",
        descripcion: "Directorio, alta en mostrador y membresías"
      },
      {
        href: "/caja",
        label: "Caja y Morosos",
        descripcion: "Pagos inmutables, anulaciones y saldos"
      }
    );
  }

  if (esAdmin) {
    accesos.push({
      href: "/afiliaciones",
      label: "Afiliaciones",
      descripcion: "Equipo y roles componibles del Box"
    });
  }

  return accesos;
}

export function prepararDatosGraficoOcupacion(
  dias: readonly DiaOcupacionSemanal[]
): DatoGraficoOcupacion[] {
  return [...dias];
}

export const COLORES_MEDIO_PAGO: Record<string, string> = {
  TRANSFERENCIA: "#C1F429",
  EFECTIVO: "#18FFC8",
  OTRO: "#A1A1AA"
};

export function prepararDatosGraficoCobranza(
  cobranza: ResumenGestionPanel["cobranzaMes"]
): SegmentoGraficoCobranza[] {
  const segmentos: SegmentoGraficoCobranza[] = [];

  for (const item of cobranza.desglosePorMedio) {
    if (item.total > 0) {
      segmentos.push({
        nombre: item.label,
        valor: item.total,
        color: COLORES_MEDIO_PAGO[item.medioPago] ?? "#A1A1AA"
      });
    }
  }

  if (cobranza.totalPendiente > 0) {
    segmentos.push({
      nombre: "Pendiente",
      valor: cobranza.totalPendiente,
      color: "#27272A"
    });
  }

  if (segmentos.length === 0) {
    segmentos.push({
      nombre: "Sin movimientos",
      valor: 1,
      color: "#232428"
    });
  }

  return segmentos;
}
