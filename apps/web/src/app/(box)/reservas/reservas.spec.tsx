import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ERROR_CODES,
  type Atleta,
  type Clase,
  type Membresia,
  type Reserva
} from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  cancelarReservaAction: vi.fn(),
  crearReservaAction: vi.fn()
}));

import {
  ReservasAtletaView,
  TarjetaClaseDisponible,
  TarjetaProximaReserva
} from "./reservas-atleta-view";
import {
  clasificarReservasAtleta,
  construirOpcionesTipoReservas,
  construirPestanasDiasReservas,
  evaluarEstadoTarjetaClase,
  evaluarResumenMembresiaAtleta,
  filtrarClasesReservas,
  formatearFechaCortaEsAr,
  formatearFechaRangoEsAr,
  procesarCancelacionAtleta,
  procesarReservaAtleta,
  procesarWalkinMostrador,
  traducirErrorReservas
} from "./reservas-estado";

const BOX_ID = "00000000-0000-4000-8000-000000000101";
const TIMEZONE = "America/Argentina/Buenos_Aires";
const HOY_LOCAL = "2026-11-14";
const MANANA_LOCAL = "2026-11-15";
// 12:30 hora local ART (UTC-3)
const AHORA_REF = new Date("2026-11-14T15:30:00.000Z");

const AFILIACION_ATLETA_ID = "a1000000-0000-4000-8000-000000000001";
const USUARIO_ATLETA_ID = "b1000000-0000-4000-8000-000000000001";
const COACH_ID = "c1000000-0000-4000-8000-000000000001";
const PLAN_ID = "d1000000-0000-4000-8000-000000000001";

const MEMBRESIA_SEMANAL_MOROSA: Membresia = {
  id: "e1000000-0000-4000-8000-000000000001",
  boxId: BOX_ID,
  afiliacionId: AFILIACION_ATLETA_ID,
  planId: PLAN_ID,
  precio: 42000,
  modalidadCreditos: "SEMANAL",
  creditosPorPeriodo: 3,
  creditosExtra: 1,
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-30",
  bajaAnticipadaEn: null,
  bajaPorUsuarioId: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  totalPagado: 27000,
  saldo: 15000
};

const CLASE_PASADA_HOY: Clase = {
  id: "f1000000-0000-4000-8000-000000000001",
  boxId: BOX_ID,
  horarioId: null,
  tipoClaseId: "11000000-0000-4000-8000-000000000001",
  coachAfiliacionId: COACH_ID,
  inicio: "2026-11-14T11:00:00.000Z", // 08:00 ART (pasada respecto a 12:30 ART)
  fin: "2026-11-14T12:00:00.000Z", // 09:00 ART
  cupos: 20,
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  deletedAt: null,
  tipoClaseNombre: "WOD",
  coachNombre: "Valentina Ruiz",
  reservasConfirmadas: 18
};

const CLASE_HOY_TARDIA: Clase = {
  id: "f1000000-0000-4000-8000-000000000002",
  boxId: BOX_ID,
  horarioId: null,
  tipoClaseId: "11000000-0000-4000-8000-000000000001",
  coachAfiliacionId: COACH_ID,
  inicio: "2026-11-14T16:30:00.000Z", // 13:30 ART (a 60 min: dentro de ventana 120 min)
  fin: "2026-11-14T17:30:00.000Z",
  cupos: 20,
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  deletedAt: null,
  tipoClaseNombre: "WOD",
  coachNombre: "Valentina Ruiz",
  reservasConfirmadas: 15
};

const CLASE_HOY_LLENA: Clase = {
  id: "f1000000-0000-4000-8000-000000000003",
  boxId: BOX_ID,
  horarioId: null,
  tipoClaseId: "11000000-0000-4000-8000-000000000002",
  coachAfiliacionId: COACH_ID,
  inicio: "2026-11-14T21:00:00.000Z", // 18:00 ART
  fin: "2026-11-14T22:00:00.000Z",
  cupos: 12,
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  deletedAt: null,
  tipoClaseNombre: "Halterofilia",
  coachNombre: "Diego Sosa",
  reservasConfirmadas: 12
};

const CLASE_MANANA_DISPONIBLE: Clase = {
  id: "f1000000-0000-4000-8000-000000000004",
  boxId: BOX_ID,
  horarioId: null,
  tipoClaseId: "11000000-0000-4000-8000-000000000003",
  coachAfiliacionId: COACH_ID,
  inicio: "2026-11-15T13:00:00.000Z", // 10:00 ART mañana
  fin: "2026-11-15T14:00:00.000Z",
  cupos: 16,
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  deletedAt: null,
  tipoClaseNombre: "Open Box",
  coachNombre: "Diego Sosa",
  reservasConfirmadas: 6
};

const RESERVAS_BASE: Reserva[] = [
  {
    id: "21000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    claseId: CLASE_HOY_TARDIA.id,
    afiliacionId: AFILIACION_ATLETA_ID,
    membresiaId: MEMBRESIA_SEMANAL_MOROSA.id,
    creadaPorUsuarioId: USUARIO_ATLETA_ID,
    estado: "CONFIRMADA",
    asistenciaMarcadaEn: null,
    asistenciaPorUsuarioId: null,
    canceladaEn: null,
    createdAt: "2026-11-13T12:00:00.000Z",
    updatedAt: "2026-11-13T12:00:00.000Z",
    claseInicio: CLASE_HOY_TARDIA.inicio,
    claseFin: CLASE_HOY_TARDIA.fin,
    tipoClaseNombre: "WOD",
    coachNombre: "Valentina Ruiz",
    ausenciaConsolidada: false
  },
  {
    id: "21000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    claseId: "f1000000-0000-4000-8000-000000000099",
    afiliacionId: AFILIACION_ATLETA_ID,
    membresiaId: MEMBRESIA_SEMANAL_MOROSA.id,
    creadaPorUsuarioId: USUARIO_ATLETA_ID,
    estado: "CONFIRMADA",
    asistenciaMarcadaEn: null,
    asistenciaPorUsuarioId: null,
    canceladaEn: null,
    createdAt: "2026-11-09T12:00:00.000Z",
    updatedAt: "2026-11-09T12:00:00.000Z",
    claseInicio: "2026-11-10T21:00:00.000Z",
    claseFin: "2026-11-10T22:00:00.000Z",
    tipoClaseNombre: "Halterofilia",
    coachNombre: "Diego Sosa",
    ausenciaConsolidada: true
  },
  {
    id: "21000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    claseId: "f1000000-0000-4000-8000-000000000098",
    afiliacionId: AFILIACION_ATLETA_ID,
    membresiaId: MEMBRESIA_SEMANAL_MOROSA.id,
    creadaPorUsuarioId: USUARIO_ATLETA_ID,
    estado: "CANCELADA",
    asistenciaMarcadaEn: null,
    asistenciaPorUsuarioId: null,
    canceladaEn: "2026-11-11T10:00:00.000Z",
    createdAt: "2026-11-10T12:00:00.000Z",
    updatedAt: "2026-11-11T10:00:00.000Z",
    claseInicio: "2026-11-12T15:00:00.000Z",
    claseFin: "2026-11-12T16:00:00.000Z",
    tipoClaseNombre: "Open Box",
    coachNombre: "Diego Sosa",
    ausenciaConsolidada: false
  }
];

const ATLETAS_DEMO: Atleta[] = [
  {
    afiliacionId: AFILIACION_ATLETA_ID,
    usuarioId: USUARIO_ATLETA_ID,
    boxId: BOX_ID,
    nombre: "Nicolás Pérez",
    email: "atleta.moroso@centris.dev",
    roles: ["atleta"],
    activo: true,
    pendienteActivacion: false,
    createdAt: "2026-11-01T12:00:00.000Z"
  }
];

describe("Vista /reservas — Dark Bento Cockpit y reglas de negocio", () => {
  describe("Módulo profundo reservas-estado", () => {
    it("traduce códigos de error del dominio a español claro sin jerga HTTP ni códigos técnicos", () => {
      const errores = [
        ERROR_CODES.CUPO_AGOTADO,
        ERROR_CODES.SIN_CREDITOS_DISPONIBLES,
        ERROR_CODES.MEMBRESIA_NO_VIGENTE,
        ERROR_CODES.SUPERPOSICION_HORARIA,
        ERROR_CODES.FUERA_DE_ANTICIPACION,
        ERROR_CODES.CLASE_CANCELADA,
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        ERROR_CODES.NO_AUTENTICADO,
        ERROR_CODES.VALIDACION_FALLIDA
      ];

      for (const code of errores) {
        const msg = traducirErrorReservas(code, `Error 403 Forbidden ${code}`);
        expect(msg.length).toBeGreaterThan(10);
        expect(msg).not.toMatch(/\b(403|409|422|Forbidden|ERROR_CODES)\b/i);
        expect(msg).not.toContain(code);
      }

      expect(
        traducirErrorReservas(ERROR_CODES.SUPERPOSICION_HORARIA, "")
      ).toMatch(/superpone/i);
    });

    it("evalúa resumen de membresía, créditos semanales y saldo pendiente (Moroso) sin bloquear reservas (ADR 0006)", () => {
      const resumen = evaluarResumenMembresiaAtleta({
        membresias: [MEMBRESIA_SEMANAL_MOROSA],
        misReservas: RESERVAS_BASE,
        hoyLocal: HOY_LOCAL,
        timezone: TIMEZONE
      });

      expect(resumen.membresiaVigente?.id).toBe(MEMBRESIA_SEMANAL_MOROSA.id);
      // 3 semanales - 2 consumidos (confirmada hoy + ausencia martes) = 1 restante
      expect(resumen.disponibilidadActual?.creditosRestantesPeriodo).toBe(1);
      expect(resumen.disponibilidadActual?.creditosExtraRestantes).toBe(1);
      expect(resumen.saldoPendienteTotal).toBe(15000);
      expect(resumen.esMoroso).toBe(true);
      expect(formatearFechaRangoEsAr("2026-11-01", "2026-11-30")).toBe(
        "01/11/2026 al 30/11/2026"
      );
      expect(formatearFechaCortaEsAr(HOY_LOCAL)).toBe("14/11/2026");

      // Un atleta Moroso con membresía vigente y créditos mantiene el botón Reservar habilitado
      const estadoClase = evaluarEstadoTarjetaClase(CLASE_MANANA_DISPONIBLE, {
        ahora: AHORA_REF,
        claseIdsReservadas: new Set([CLASE_HOY_TARDIA.id]),
        reservasActivas: [RESERVAS_BASE[0]!],
        disponibilidad: resumen.disponibilidadActual,
        tieneMembresiaVigente: true
      });

      expect(estadoClase.puedeReservar).toBe(true);
      expect(estadoClase.motivoBloqueo).toBeNull();
      expect(estadoClase.badge.variant).toBe("mint");
    });

    it("clasifica próximas reservas futuras aparte de asistencias/ausencias pasadas y cancelaciones, calculando ventana de cancelación", () => {
      const clasificacion = clasificarReservasAtleta(
        RESERVAS_BASE,
        TIMEZONE,
        AHORA_REF,
        120
      );

      // Solo la reserva futura confirmada queda en Próximas
      expect(clasificacion.proximas).toHaveLength(1);
      expect(clasificacion.proximas[0]?.reserva.id).toBe(RESERVAS_BASE[0]!.id);
      expect(clasificacion.proximas[0]?.enVentanaTardia).toBe(true);
      expect(clasificacion.proximas[0]?.horaLimiteSinCargo).toContain("11:30");

      // La ausencia pasada y la cancelación pasan al historial
      expect(clasificacion.historial).toHaveLength(2);
      expect(
        clasificacion.historial.some(
          (item) =>
            item.reserva.id === RESERVAS_BASE[1]!.id &&
            item.etiqueta === "Ausencia" &&
            item.variante === "coral"
        )
      ).toBe(true);
      expect(
        clasificacion.historial.some(
          (item) =>
            item.reserva.id === RESERVAS_BASE[2]!.id &&
            item.etiqueta === "Cancelada" &&
            item.variante === "zinc"
        )
      ).toBe(true);
    });

    it("agrupa pestañas por día abriendo en Hoy, incluye Todas y filtra por tipo de clase", () => {
      const clases = [
        CLASE_PASADA_HOY,
        CLASE_HOY_TARDIA,
        CLASE_HOY_LLENA,
        CLASE_MANANA_DISPONIBLE
      ];

      const tabs = construirPestanasDiasReservas(clases, HOY_LOCAL, 7, TIMEZONE);
      expect(tabs[0]?.value).toBe(HOY_LOCAL);
      expect(tabs[0]?.label).toContain("Hoy");
      expect(tabs.some((t) => t.value === MANANA_LOCAL)).toBe(true);
      expect(tabs.some((t) => t.value === "TODOS")).toBe(true);

      const tipos = construirOpcionesTipoReservas(clases);
      expect(tipos.map((t) => t.value)).toEqual([
        "TODAS",
        "Halterofilia",
        "Open Box",
        "WOD"
      ]);

      const filtradasHoy = filtrarClasesReservas(clases, {
        diaSeleccionado: HOY_LOCAL,
        tipoSeleccionado: "TODAS",
        timezone: TIMEZONE
      });
      expect(filtradasHoy).toHaveLength(3);

      const filtradasManana = filtrarClasesReservas(clases, {
        diaSeleccionado: MANANA_LOCAL,
        tipoSeleccionado: "Open Box",
        timezone: TIMEZONE
      });
      expect(filtradasManana).toHaveLength(1);
      expect(filtradasManana[0]?.id).toBe(CLASE_MANANA_DISPONIBLE.id);
    });

    it("bloquea clases finalizadas, llenas, sin créditos o superpuestas con mensajes claros", () => {
      const estadoPasada = evaluarEstadoTarjetaClase(CLASE_PASADA_HOY, {
        ahora: AHORA_REF,
        claseIdsReservadas: new Set(),
        reservasActivas: [],
        disponibilidad: {
          ilimitada: false,
          creditosPorPeriodo: 3,
          creditosConsumidosPeriodo: 0,
          creditosRestantesPeriodo: 3,
          creditosExtraTotales: 0,
          creditosExtraRestantes: 0,
          puedeReservar: true
        },
        tieneMembresiaVigente: true
      });
      expect(estadoPasada.puedeReservar).toBe(false);
      expect(estadoPasada.motivoBloqueo).toBe("Horario finalizado");

      const estadoLlena = evaluarEstadoTarjetaClase(CLASE_HOY_LLENA, {
        ahora: AHORA_REF,
        claseIdsReservadas: new Set(),
        reservasActivas: [],
        disponibilidad: {
          ilimitada: true,
          creditosPorPeriodo: null,
          creditosConsumidosPeriodo: 0,
          creditosRestantesPeriodo: null,
          creditosExtraTotales: 0,
          creditosExtraRestantes: 0,
          puedeReservar: true
        },
        tieneMembresiaVigente: true
      });
      expect(estadoLlena.puedeReservar).toBe(false);
      expect(estadoLlena.motivoBloqueo).toBe(
        "Sin cupos · Sin lista de espera"
      );
      expect(estadoLlena.badge.variant).toBe("coral");

      const estadoSinCreditos = evaluarEstadoTarjetaClase(
        CLASE_MANANA_DISPONIBLE,
        {
          ahora: AHORA_REF,
          claseIdsReservadas: new Set(),
          reservasActivas: [],
          disponibilidad: {
            ilimitada: false,
            creditosPorPeriodo: 3,
            creditosConsumidosPeriodo: 3,
            creditosRestantesPeriodo: 0,
            creditosExtraTotales: 0,
            creditosExtraRestantes: 0,
            puedeReservar: false
          },
          tieneMembresiaVigente: true
        }
      );
      expect(estadoSinCreditos.puedeReservar).toBe(false);
      expect(estadoSinCreditos.motivoBloqueo).toBe("Sin créditos disponibles");
    });

    it("procesa reserva, cancelación y walk-in validando contratos Zod y traduciendo errores", async () => {
      const crearOk = await procesarReservaAtleta(
        BOX_ID,
        CLASE_MANANA_DISPONIBLE.id,
        async () => ({ ok: true })
      );
      expect(crearOk).toEqual({
        ok: true,
        message: "Listo: tu lugar quedó reservado."
      });

      const crearErr = await procesarReservaAtleta(
        BOX_ID,
        CLASE_MANANA_DISPONIBLE.id,
        async () => ({
          ok: false,
          errorCode: ERROR_CODES.SUPERPOSICION_HORARIA,
          message: "raw"
        })
      );
      expect(crearErr.ok).toBe(false);
      if (!crearErr.ok) {
        expect(crearErr.errorCode).toBe(ERROR_CODES.SUPERPOSICION_HORARIA);
        expect(crearErr.error).toMatch(/superpone/i);
      }

      const cancelTardia = await procesarCancelacionAtleta(
        BOX_ID,
        RESERVAS_BASE[0]!.id,
        true,
        async () => ({ ok: true })
      );
      expect(cancelTardia.ok).toBe(true);
      if (cancelTardia.ok) {
        expect(cancelTardia.message).toMatch(/Cancelación tardía/i);
      }

      const walkinInvalido = await procesarWalkinMostrador(
        BOX_ID,
        CLASE_MANANA_DISPONIBLE.id,
        "",
        async () => ({ ok: true })
      );
      expect(walkinInvalido.ok).toBe(false);
    });
  });

  describe("Render SSR Dark Bento Cockpit", () => {
    it("renderiza barra sticky de créditos, alerta no bloqueante Moroso con CTA #C1F429 activo, pestañas desde Hoy, rayado diagonal y acordeón cerrado", () => {
      const html = renderToStaticMarkup(
        createElement(ReservasAtletaView, {
          boxId: BOX_ID,
          timezone: TIMEZONE,
          moneda: "ARS",
          anticipacionReservaDias: 7,
          ventanaCancelacionMinutos: 120,
          esAtleta: true,
          esStaffMostrador: false,
          clasesDisponibles: [
            CLASE_PASADA_HOY,
            CLASE_HOY_TARDIA,
            CLASE_HOY_LLENA,
            CLASE_MANANA_DISPONIBLE
          ],
          misReservas: RESERVAS_BASE,
          membresias: [MEMBRESIA_SEMANAL_MOROSA],
          membresiaVigente: MEMBRESIA_SEMANAL_MOROSA,
          atletas: [],
          ahoraInicialIso: AHORA_REF.toISOString(),
          diaInicialSeleccionado: "TODOS"
        })
      );

      expect(html).toContain("Mis reservas");
      // Barra sticky y vigencia en formato es-AR (sin YYYY-MM-DD crudo)
      expect(html).toContain('data-testid="creditos-periodo-restantes"');
      expect(html).toContain('data-testid="creditos-extra-restantes"');
      expect(html).toContain("01/11/2026 al 30/11/2026");
      expect(html).not.toContain("2026-11-01 al 2026-11-30");

      // ADR 0006: banner no bloqueante + CTA #C1F429 habilitado en clase disponible
      expect(html).toContain('data-testid="banner-saldo-pendiente"');
      expect(html).toContain("15.000");
      expect(html).toContain(
        `data-testid="btn-reservar-clase-${CLASE_MANANA_DISPONIBLE.id}"`
      );
      expect(html).toContain("Reservar lugar");

      // Rayado diagonal en track de ocupación + tabular-nums + controles >= 44px (min-h-11)
      expect(html).toContain("repeating-linear-gradient");
      expect(html).toContain("tabular-nums");
      expect(html).toContain("min-h-11");

      // Acordeón de historial cerrado por defecto
      expect(html).toContain('data-testid="btn-historial-reservas"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain("403 Forbidden");
    });

    it("muestra modo mostrador para Recepcionista/Administrador sin rol Atleta y estado de error con reintento si falla SSR", () => {
      const htmlStaff = renderToStaticMarkup(
        createElement(ReservasAtletaView, {
          boxId: BOX_ID,
          timezone: TIMEZONE,
          moneda: "ARS",
          anticipacionReservaDias: 7,
          ventanaCancelacionMinutos: 120,
          esAtleta: false,
          esStaffMostrador: true,
          clasesDisponibles: [CLASE_MANANA_DISPONIBLE],
          misReservas: [],
          membresias: [],
          membresiaVigente: null,
          atletas: ATLETAS_DEMO,
          ahoraInicialIso: AHORA_REF.toISOString(),
          diaInicialSeleccionado: "TODOS"
        })
      );

      expect(htmlStaff).toContain("Modo mostrador");
      expect(htmlStaff).not.toContain("Acercate a recepción");
      expect(htmlStaff).toContain(
        `data-testid="btn-mostrador-reserva-${CLASE_MANANA_DISPONIBLE.id}"`
      );

      const htmlErrorCarga = renderToStaticMarkup(
        createElement(ReservasAtletaView, {
          boxId: BOX_ID,
          timezone: TIMEZONE,
          moneda: "ARS",
          anticipacionReservaDias: 7,
          ventanaCancelacionMinutos: 120,
          esAtleta: true,
          esStaffMostrador: false,
          clasesDisponibles: [],
          misReservas: [],
          membresias: [],
          membresiaVigente: null,
          atletas: [],
          errorCarga: "No pudimos cargar tu agenda en este momento.",
          ahoraInicialIso: AHORA_REF.toISOString()
        })
      );

      expect(htmlErrorCarga).toContain('data-testid="error-carga-reservas"');
      expect(htmlErrorCarga).toContain("Reintentar");
      expect(htmlErrorCarga).not.toContain("Sin plan vigente");
    });

    it("renderiza tarjetas individuales de Próxima Reserva y Clase Disponible con tokens Bento", () => {
      const htmlProxima = renderToStaticMarkup(
        createElement(TarjetaProximaReserva, {
          item: clasificarReservasAtleta(
            [RESERVAS_BASE[0]!],
            TIMEZONE,
            AHORA_REF,
            120
          ).proximas[0]!,
          timezone: TIMEZONE,
          ventanaCancelacionMinutos: 120,
          mostrandoAdvertenciaTardia: true,
          cancelando: false,
          deshabilitado: false,
          onSolicitarCancelacion: vi.fn(),
          onConfirmarTardia: vi.fn(),
          onCancelarAdvertencia: vi.fn()
        })
      );

      expect(htmlProxima).toContain(
        `data-testid="advertencia-cancelacion-tardia-${CLASE_HOY_TARDIA.id}"`
      );
      expect(htmlProxima).toContain("Confirmar cancelación tardía");
      expect(htmlProxima).toContain("Mantener reserva");

      const htmlClase = renderToStaticMarkup(
        createElement(TarjetaClaseDisponible, {
          clase: CLASE_MANANA_DISPONIBLE,
          timezone: TIMEZONE,
          estado: evaluarEstadoTarjetaClase(CLASE_MANANA_DISPONIBLE, {
            ahora: AHORA_REF,
            claseIdsReservadas: new Set(),
            reservasActivas: [],
            disponibilidad: {
              ilimitada: false,
              creditosPorPeriodo: 3,
              creditosConsumidosPeriodo: 1,
              creditosRestantesPeriodo: 2,
              creditosExtraTotales: 0,
              creditosExtraRestantes: 0,
              puedeReservar: true
            },
            tieneMembresiaVigente: true
          }),
          esAtleta: true,
          esStaffMostrador: false,
          reservando: false,
          onReservar: vi.fn(),
          onAbrirMostrador: vi.fn()
        })
      );

      expect(htmlClase).toContain(
        `data-testid="cupos-disponibles-clase-${CLASE_MANANA_DISPONIBLE.id}"`
      );
      expect(htmlClase).toContain("6 / 16");
    });
  });
});
