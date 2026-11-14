import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  AfiliacionConUsuario,
  Atleta,
  Clase,
  Reserva
} from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  cancelarClaseAction: vi.fn(),
  crearReservaAction: vi.fn(),
  editarClaseAction: vi.fn(),
  listarReservasClaseAction: vi.fn(),
  materializarClasesAction: vi.fn(),
  registrarAsistenciaAction: vi.fn()
}));

import {
  ClaseCard,
  ClasesView,
  DrawerAsistencia,
  DrawerCancelarClase,
  DrawerEditarClase,
  DrawerMostrador
} from "./clases-view";
import {
  calcularResumenClases,
  construirPestanasDiasClases,
  evaluarEstadoClase,
  filtrarClases,
  formatearRangoHorarioClase,
  obtenerFechaClaseLocal,
  procesarCambioAsistencia,
  procesarCancelacionClase,
  procesarEdicionClase,
  procesarMaterializacionDesdeClases,
  procesarWalkinClase,
  traducirErrorClases
} from "./clases-estado";

const BOX_ID = "00000000-0000-4000-8000-000000000101";
const TIMEZONE = "America/Argentina/Buenos_Aires";
const HOY_LOCAL = "2026-11-14";
const MANANA_LOCAL = "2026-11-15";
const AYER_LOCAL = "2026-11-13";
const AHORA_REF = new Date("2026-11-14T15:30:00.000Z"); // 12:30 ART

const COACH_VALENTINA_ID = "b1000000-0000-4000-8000-000000000001";
const COACH_DIEGO_ID = "b1000000-0000-4000-8000-000000000002";
const TIPO_WOD_ID = "a1000000-0000-4000-8000-000000000001";
const TIPO_HALTE_ID = "a1000000-0000-4000-8000-000000000002";
const ATLETA_SOFIA_ID = "c1000000-0000-4000-8000-000000000001";

const CLASES_BASE: Clase[] = [
  {
    id: "d1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    horarioId: "e1000000-0000-4000-8000-000000000001",
    tipoClaseId: TIPO_WOD_ID,
    coachAfiliacionId: COACH_VALENTINA_ID,
    inicio: "2026-11-14T10:00:00.000Z", // 07:00 ART (finalizada respecto a 12:30 ART)
    fin: "2026-11-14T11:00:00.000Z", // 08:00 ART
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
  },
  {
    id: "d1000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    horarioId: "e1000000-0000-4000-8000-000000000002",
    tipoClaseId: TIPO_HALTE_ID,
    coachAfiliacionId: COACH_DIEGO_ID,
    inicio: "2026-11-14T15:00:00.000Z", // 12:00 ART (en curso respecto a 12:30 ART)
    fin: "2026-11-14T16:00:00.000Z", // 13:00 ART
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
  },
  {
    id: "d1000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    horarioId: null,
    tipoClaseId: TIPO_WOD_ID,
    coachAfiliacionId: COACH_VALENTINA_ID,
    inicio: "2026-11-15T22:00:00.000Z", // 19:00 ART mañana
    fin: "2026-11-15T23:00:00.000Z", // 20:00 ART mañana
    cupos: 20,
    canceladaEn: "2026-11-14T14:00:00.000Z",
    canceladaPorUsuarioId: "f1000000-0000-4000-8000-000000000001",
    motivoCancelacion: "Corte de suministro eléctrico",
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-14T14:00:00.000Z",
    deletedAt: null,
    tipoClaseNombre: "WOD",
    coachNombre: "Valentina Ruiz",
    reservasConfirmadas: 0
  }
];

const COACHES_BASE: AfiliacionConUsuario[] = [
  {
    id: COACH_VALENTINA_ID,
    boxId: BOX_ID,
    usuarioId: "f1000000-0000-4000-8000-000000000011",
    roles: ["coach"],
    activo: true,
    usuario: {
      id: "f1000000-0000-4000-8000-000000000011",
      email: "coach@centris.dev",
      nombre: "Valentina Ruiz",
      passwordActivada: true
    }
  },
  {
    id: COACH_DIEGO_ID,
    boxId: BOX_ID,
    usuarioId: "f1000000-0000-4000-8000-000000000012",
    roles: ["coach", "recepcionista"],
    activo: true,
    usuario: {
      id: "f1000000-0000-4000-8000-000000000012",
      email: "coach.multi@centris.dev",
      nombre: "Diego Sosa",
      passwordActivada: true
    }
  }
];

const ATLETAS_BASE: Atleta[] = [
  {
    id: ATLETA_SOFIA_ID,
    afiliacionId: ATLETA_SOFIA_ID,
    boxId: BOX_ID,
    usuarioId: "f1000000-0000-4000-8000-000000000021",
    nombre: "Sofía Castro",
    email: "atleta.aldia@centris.dev",
    roles: ["atleta"],
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z"
  }
];

const RESERVAS_NOMINA_BASE: Reserva[] = [
  {
    id: "r1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    claseId: CLASES_BASE[0]!.id,
    afiliacionId: ATLETA_SOFIA_ID,
    membresiaId: "m1000000-0000-4000-8000-000000000001",
    creadaPorUsuarioId: "f1000000-0000-4000-8000-000000000021",
    estado: "CONFIRMADA",
    asistenciaMarcadaEn: null,
    asistenciaPorUsuarioId: null,
    canceladaEn: null,
    createdAt: "2026-11-13T12:00:00.000Z",
    updatedAt: "2026-11-13T12:00:00.000Z",
    atletaNombre: "Sofía Castro",
    atletaEmail: "atleta.aldia@centris.dev"
  }
];

describe("Rediseño Dark Bento Cockpit de /clases", () => {
  describe("Módulo clases-estado (calendario local, filtros, estados y acciones)", () => {
    it("calcula fechas locales en timezone del Box y construye pestañas diarias iniciando en Hoy", () => {
      expect(
        obtenerFechaClaseLocal(CLASES_BASE[0]!.inicio, TIMEZONE)
      ).toBe(HOY_LOCAL);
      expect(
        formatearRangoHorarioClase(
          CLASES_BASE[0]!.inicio,
          CLASES_BASE[0]!.fin,
          TIMEZONE
        )
      ).toBe("07:00 - 08:00");

      const pestanas = construirPestanasDiasClases(
        CLASES_BASE,
        HOY_LOCAL,
        TIMEZONE
      );
      expect(pestanas[0]?.value).toBe("TODOS");
      expect(pestanas.some((p) => p.value === HOY_LOCAL && p.label.startsWith("Hoy"))).toBe(true);
      expect(pestanas.some((p) => p.value === MANANA_LOCAL)).toBe(true);
      expect(pestanas.find((p) => p.value === HOY_LOCAL)?.count).toBe(2);
    });

    it("evalúa estados semánticos, porcentaje de ocupación y filtros combinados", () => {
      const estadoEnCurso = evaluarEstadoClase(CLASES_BASE[1]!, {
        ahora: AHORA_REF,
        esAtleta: false,
        reservadaPorMi: false
      });
      expect(estadoEnCurso.enCurso).toBe(true);
      expect(estadoEnCurso.llena).toBe(true);
      expect(estadoEnCurso.porcentajeOcupacion).toBe(100);
      expect(estadoEnCurso.badge.label).toBe("En curso");
      expect(estadoEnCurso.badge.variant).toBe("mint");

      const estadoCancelada = evaluarEstadoClase(CLASES_BASE[2]!, {
        ahora: AHORA_REF,
        esAtleta: false,
        reservadaPorMi: false
      });
      expect(estadoCancelada.cancelada).toBe(true);
      expect(estadoCancelada.badge.label).toBe("Clase Cancelada");
      expect(estadoCancelada.badge.variant).toBe("coral");

      const soloHoy = filtrarClases(CLASES_BASE, {
        fechaSeleccionada: HOY_LOCAL,
        tipoClaseSeleccionado: "TODOS",
        coachSeleccionado: "TODOS",
        ocultarInactivas: false,
        timezone: TIMEZONE,
        ahora: AHORA_REF
      });
      expect(soloHoy).toHaveLength(2);

      const sinInactivas = filtrarClases(CLASES_BASE, {
        fechaSeleccionada: "TODOS",
        tipoClaseSeleccionado: "TODOS",
        coachSeleccionado: "TODOS",
        ocultarInactivas: true,
        timezone: TIMEZONE,
        ahora: AHORA_REF
      });
      expect(sinInactivas.map((c) => c.id)).toEqual([CLASES_BASE[1]!.id]);

      const resumen = calcularResumenClases(soloHoy, AHORA_REF);
      expect(resumen.totalClases).toBe(2);
      expect(resumen.cuposOcupados).toBe(30);
      expect(resumen.cuposTotales).toBe(32);
    });

    it("traduce errores sin jerga HTTP y valida edición/cancelación/walk-in/asistencia", async () => {
      expect(traducirErrorClases("CUPO_MENOR_A_RESERVAS")).toMatch(
        /reservas confirmadas/i
      );
      expect(traducirErrorClases("ACCESO_DENEGADO_ROL")).not.toMatch(
        /403|Forbidden|ACCESO_DENEGADO_ROL/i
      );
      expect(traducirErrorClases("DESCONOCIDO", "500 SQLSTATE 23505")).not.toMatch(
        /500|SQLSTATE/i
      );

      const errCupo = await procesarEdicionClase(
        BOX_ID,
        CLASES_BASE[0]!,
        {
          esAdmin: true,
          coachAfiliacionId: COACH_VALENTINA_ID,
          cuposTexto: "5"
        },
        vi.fn()
      );
      expect(errCupo.ok).toBe(false);
      if (!errCupo.ok) {
        expect(errCupo.error).toMatch(/reservas confirmadas/i);
      }

      const editarMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const okEdicion = await procesarEdicionClase(
        BOX_ID,
        CLASES_BASE[0]!,
        {
          esAdmin: true,
          coachAfiliacionId: COACH_DIEGO_ID,
          cuposTexto: "22"
        },
        editarMock
      );
      expect(okEdicion.ok).toBe(true);
      expect(editarMock).toHaveBeenCalledWith(BOX_ID, CLASES_BASE[0]!.id, {
        coachAfiliacionId: COACH_DIEGO_ID,
        cupos: 22
      });

      const cancelarMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const okCancel = await procesarCancelacionClase(
        BOX_ID,
        CLASES_BASE[0]!.id,
        "Corte de luz",
        cancelarMock
      );
      expect(okCancel.ok).toBe(true);

      const walkinMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        errorCode: "CUPO_AGOTADO"
      });
      const errWalkin = await procesarWalkinClase(
        BOX_ID,
        CLASES_BASE[1]!.id,
        ATLETA_SOFIA_ID,
        walkinMock
      );
      expect(errWalkin.ok).toBe(false);
      if (!errWalkin.ok) {
        expect(errWalkin.errorCode).toBe("CUPO_AGOTADO");
      }

      const matMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const okMat = await procesarMaterializacionDesdeClases(BOX_ID, matMock);
      expect(okMat.ok).toBe(true);

      const asistMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const okAsist = await procesarCambioAsistencia(
        BOX_ID,
        RESERVAS_NOMINA_BASE[0]!.id,
        true,
        asistMock
      );
      expect(okAsist.ok).toBe(true);
    });
  });

  describe("Render Dark Bento Cockpit, roles, ocupación y SideDrawer", () => {
    it("renderiza agenda Bento abriendo en Hoy, barra #C1F429 sobre rayado diagonal, tabular-nums y testids", () => {
      const html = renderToStaticMarkup(
        createElement(ClasesView, {
          boxId: BOX_ID,
          timezone: TIMEZONE,
          esAdmin: true,
          esRecep: false,
          esCoach: false,
          afiliacionActivaId: "staff-admin",
          clasesIniciales: CLASES_BASE,
          coaches: COACHES_BASE,
          atletas: ATLETAS_BASE,
          fechaDesdeInicial: HOY_LOCAL,
          fechaHastaInicial: MANANA_LOCAL,
          ahoraInicialIso: AHORA_REF.toISOString()
        })
      );

      expect(html).toContain("<h1");
      expect(html).toContain("Calendario de clases");
      expect(html).toContain('data-testid="btn-materializar-clases"');
      expect(html).toContain("Generar próximas clases");
      expect(html).toContain(`data-testid="tab-dia-${HOY_LOCAL}"`);
      expect(html).toContain('data-testid="tab-dia-TODOS"');
      expect(html).toContain("minmax(min(100%,300px),1fr)");
      expect(html).toContain("tabular-nums");
      expect(html).toContain("07:00 - 08:00");
      expect(html).toContain("18 / 20");
      expect(html).toContain("repeating-linear-gradient");

      // Sin estética v1, sin font-mono en horarios/cupos y sin montos/saldos
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("font-mono");
      expect(html).not.toContain("Anotar Walk-in");
      expect(html).not.toContain("Saldo");
    });

    it("aísla vista de Coach exclusivo sin botones de staff ni datos financieros", () => {
      const html = renderToStaticMarkup(
        createElement(ClasesView, {
          boxId: BOX_ID,
          timezone: TIMEZONE,
          esAdmin: false,
          esRecep: false,
          esCoach: true,
          afiliacionActivaId: COACH_VALENTINA_ID,
          clasesIniciales: [CLASES_BASE[0]!],
          coaches: [],
          atletas: [],
          fechaDesdeInicial: HOY_LOCAL,
          fechaHastaInicial: MANANA_LOCAL,
          ahoraInicialIso: AHORA_REF.toISOString()
        })
      );

      expect(html).toContain(`data-testid="btn-asistencia-clase-${CLASES_BASE[0]!.id}"`);
      expect(html).not.toContain("btn-walkin-clase-");
      expect(html).not.toContain("btn-editar-clase-");
      expect(html).not.toContain("btn-abrir-cancelar-clase-");
      expect(html).not.toContain("btn-materializar-clases");
      expect(html).not.toContain("$");
      expect(html).not.toContain("Saldo");
      expect(html).not.toContain("Moroso");
    });

    it("ofrece CTA directo a /reservas y badge 'Tenés lugar' para Atleta", () => {
      const htmlCardReservada = renderToStaticMarkup(
        createElement(ClaseCard, {
          clase: {
            ...CLASES_BASE[0]!,
            inicio: "2026-11-14T22:00:00.000Z",
            fin: "2026-11-14T23:00:00.000Z",
            reservasConfirmadas: 10
          },
          timezone: TIMEZONE,
          ahora: AHORA_REF,
          esAdmin: false,
          esRecep: false,
          esCoach: false,
          esAtleta: true,
          reservadaPorMi: true,
          onAbrirAsistencia: vi.fn(),
          onAbrirWalkin: vi.fn(),
          onAbrirEdicion: vi.fn(),
          onAbrirCancelacion: vi.fn()
        })
      );

      expect(htmlCardReservada).toContain("Tenés lugar");
      expect(htmlCardReservada).toContain('href="/reservas"');
      expect(htmlCardReservada).toContain("Gestionar en Mis Reservas");
    });

    it("renderiza SideDrawer para Asistencia, Mostrador, Edición y Cancelación con InlineConfirmPanel", () => {
      const htmlAsistencia = renderToStaticMarkup(
        createElement(DrawerAsistencia, {
          clase: CLASES_BASE[0]!,
          timezone: TIMEZONE,
          ahora: AHORA_REF,
          esAdmin: false,
          esRecep: false,
          afiliacionActivaId: COACH_VALENTINA_ID,
          reservas: RESERVAS_NOMINA_BASE,
          cargando: false,
          isPending: false,
          busqueda: "",
          error: null,
          onBusquedaChange: vi.fn(),
          onToggleAsistencia: vi.fn(),
          onClose: vi.fn()
        })
      );
      expect(htmlAsistencia).toContain('data-testid="panel-asistencia-clase"');
      expect(htmlAsistencia).toContain(`data-testid="btn-marcar-asistencia-${RESERVAS_NOMINA_BASE[0]!.id}"`);
      expect(htmlAsistencia).toContain("min-h-11");

      const htmlMostrador = renderToStaticMarkup(
        createElement(DrawerMostrador, {
          clase: CLASES_BASE[1]!,
          timezone: TIMEZONE,
          atletas: ATLETAS_BASE,
          atletaId: ATLETA_SOFIA_ID,
          isPending: false,
          errorWalkin: {
            message: "Esta clase alcanzó el cupo máximo.",
            errorCode: "CUPO_AGOTADO"
          },
          onAtletaChange: vi.fn(),
          onSubmit: vi.fn(),
          onIrAEditarCupo: vi.fn(),
          onClose: vi.fn()
        })
      );
      expect(htmlMostrador).toContain('data-testid="form-walkin"');
      expect(htmlMostrador).toContain('data-testid="select-atleta-walkin"');
      expect(htmlMostrador).toContain('data-testid="btn-guia-editar-cupo"');
      expect(htmlMostrador).toContain("text-base");

      const htmlEditar = renderToStaticMarkup(
        createElement(DrawerEditarClase, {
          clase: CLASES_BASE[0]!,
          timezone: TIMEZONE,
          esAdmin: true,
          coaches: COACHES_BASE,
          coachSeleccionado: COACH_VALENTINA_ID,
          cuposEdicion: "20",
          isPending: false,
          error: null,
          onCoachChange: vi.fn(),
          onCuposChange: vi.fn(),
          onSubmit: vi.fn(),
          onClose: vi.fn()
        })
      );
      expect(htmlEditar).toContain('data-testid="select-coach-suplente"');
      expect(htmlEditar).toContain('data-testid="input-editar-cupos"');
      expect(htmlEditar).toContain('data-testid="btn-guardar-edicion-clase"');

      const htmlCancelar = renderToStaticMarkup(
        createElement(DrawerCancelarClase, {
          clase: CLASES_BASE[0]!,
          timezone: TIMEZONE,
          motivo: "Corte de suministro eléctrico",
          isPending: false,
          error: null,
          onMotivoChange: vi.fn(),
          onConfirm: vi.fn(),
          onClose: vi.fn()
        })
      );
      expect(htmlCancelar).toContain('data-testid="input-motivo-cancelacion-clase"');
      expect(htmlCancelar).toContain('data-testid="btn-confirmar-cancelar-clase"');
      expect(htmlCancelar).toContain('role="group"');
      expect(htmlCancelar).not.toContain("window.confirm");
    });

    it("preserva las pestañas incluyendo ayer cuando hay clases dentro de la ventana de 24h", () => {
      const claseAyer: Clase = {
        ...CLASES_BASE[0]!,
        id: "d1000000-0000-4000-8000-000000000099",
        inicio: "2026-11-13T21:00:00.000Z",
        fin: "2026-11-13T22:00:00.000Z"
      };
      const pestanas = construirPestanasDiasClases(
        [claseAyer, ...CLASES_BASE],
        HOY_LOCAL,
        TIMEZONE
      );
      expect(pestanas.some((p) => p.value === AYER_LOCAL)).toBe(true);
    });
  });
});
