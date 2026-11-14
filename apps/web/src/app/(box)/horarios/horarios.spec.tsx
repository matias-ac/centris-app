import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AfiliacionConUsuario, Horario, TipoClase } from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  crearTipoClaseAction: vi.fn(),
  actualizarTipoClaseAction: vi.fn(),
  eliminarTipoClaseAction: vi.fn(),
  crearHorarioAction: vi.fn(),
  actualizarHorarioAction: vi.fn(),
  eliminarHorarioAction: vi.fn(),
  materializarClasesAction: vi.fn()
}));

import { HorariosView } from "./horarios-view";
import {
  agruparHorariosPorDia,
  calcularResumenHorarios,
  contarHorariosPorTipoClase,
  crearBorradorHorario,
  crearBorradorTipoClase,
  filtrarDiasVisibles,
  formatearCuposHorario,
  formatearFranjaHoraria,
  procesarBajaHorario,
  procesarBajaTipoClase,
  procesarGuardadoHorario,
  procesarGuardadoTipoClase,
  procesarMaterializacionClases,
  traducirErrorHorarios,
  validarBorradorHorarioLocal,
  validarBorradorTipoClaseLocal
} from "./horarios-estado";

const BOX_ID = "00000000-0000-4000-8000-000000000101";
const TIPO_WOD_ID = "a1000000-0000-4000-8000-000000000001";
const TIPO_HALTE_ID = "a1000000-0000-4000-8000-000000000002";
const COACH_AFIL_ID = "b1000000-0000-4000-8000-000000000001";

const TIPOS_BASE: TipoClase[] = [
  {
    id: TIPO_WOD_ID,
    boxId: BOX_ID,
    nombre: "WOD",
    descripcion: "Entrenamiento funcional del día.",
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  },
  {
    id: TIPO_HALTE_ID,
    boxId: BOX_ID,
    nombre: "Halterofilia",
    descripcion: "Técnica olímpica de arranque y envión.",
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null
  }
];

const HORARIOS_BASE: Horario[] = [
  {
    id: "c1000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    tipoClaseId: TIPO_WOD_ID,
    coachAfiliacionId: COACH_AFIL_ID,
    diaSemana: 1,
    horaInicio: "19:00",
    duracionMinutos: 60,
    cuposDefault: 20,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null,
    tipoClaseNombre: "WOD",
    coachNombre: "Valentina Ruiz"
  },
  {
    id: "c1000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    tipoClaseId: TIPO_WOD_ID,
    coachAfiliacionId: COACH_AFIL_ID,
    diaSemana: 1,
    horaInicio: "07:00",
    duracionMinutos: 60,
    cuposDefault: 16,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null,
    tipoClaseNombre: "WOD",
    coachNombre: "Valentina Ruiz"
  },
  {
    id: "c1000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    tipoClaseId: TIPO_HALTE_ID,
    coachAfiliacionId: COACH_AFIL_ID,
    diaSemana: 3,
    horaInicio: "18:30",
    duracionMinutos: 90,
    cuposDefault: 12,
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null,
    tipoClaseNombre: "Halterofilia",
    coachNombre: "Diego Sosa"
  }
];

const COACHES_BASE: AfiliacionConUsuario[] = [
  {
    id: COACH_AFIL_ID,
    boxId: BOX_ID,
    usuarioId: "d1000000-0000-4000-8000-000000000001",
    roles: ["coach"],
    activo: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    deletedAt: null,
    usuario: {
      id: "d1000000-0000-4000-8000-000000000001",
      email: "coach@centris.dev",
      nombre: "Valentina Ruiz",
      activo: true
    }
  }
];

describe("Rediseño Dark Bento Cockpit de /horarios", () => {
  describe("Módulo horarios-estado (franjas, resumen, agrupación, validación y acciones)", () => {
    it("formatea franjas horarias inicio-fin y cupos en lenguaje de dominio", () => {
      expect(formatearFranjaHoraria("07:00", 60)).toBe("07:00 – 08:00");
      expect(formatearFranjaHoraria("18:30", 90)).toBe("18:30 – 20:00");
      expect(formatearFranjaHoraria("23:30", 45)).toBe("23:30 – 00:15");
      expect(formatearCuposHorario(20)).toBe("20 cupos");
      expect(formatearCuposHorario(1)).toBe("1 cupo");
    });

    it("agrupa horarios activos por día ordenados cronológicamente y calcula resumen semanal", () => {
      const porDia = agruparHorariosPorDia(HORARIOS_BASE);
      expect(porDia[1].map((h) => h.horaInicio)).toEqual(["07:00", "19:00"]);
      expect(porDia[3].map((h) => h.horaInicio)).toEqual(["18:30"]);
      expect(porDia[7]).toEqual([]);

      const conteoTipos = contarHorariosPorTipoClase(HORARIOS_BASE);
      expect(conteoTipos[TIPO_WOD_ID]).toBe(2);
      expect(conteoTipos[TIPO_HALTE_ID]).toBe(1);

      const resumen = calcularResumenHorarios(HORARIOS_BASE, TIPOS_BASE);
      expect(resumen).toEqual({
        totalHorariosActivos: 3,
        totalTiposActivos: 2,
        cuposSemanalesTotales: 48,
        diasConHorarios: 2
      });

      expect(filtrarDiasVisibles("TODOS")).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(filtrarDiasVisibles("3")).toEqual([3]);
    });

    it("valida borradores de Tipo de Clase y Horario contra Zod compartido", () => {
      const borradorTipoVacio = crearBorradorTipoClase();
      expect(borradorTipoVacio.nombre).toBe("");
      expect(validarBorradorTipoClaseLocal(borradorTipoVacio).ok).toBe(false);

      const borradorTipoOk = validarBorradorTipoClaseLocal({
        nombre: "Movilidad",
        descripcion: "Trabajo de zona media"
      });
      expect(borradorTipoOk.ok).toBe(true);

      const borradorHorario = crearBorradorHorario(null, {
        tipoClaseId: TIPO_WOD_ID,
        coachAfiliacionId: COACH_AFIL_ID
      });
      expect(borradorHorario.diaSemana).toBe("1");

      const horarioInvalido = validarBorradorHorarioLocal({
        ...borradorHorario,
        horaInicio: "99:99",
        cuposDefault: "0"
      });
      expect(horarioInvalido.ok).toBe(false);

      const horarioOk = validarBorradorHorarioLocal({
        tipoClaseId: TIPO_WOD_ID,
        coachAfiliacionId: COACH_AFIL_ID,
        diaSemana: "1",
        horaInicio: "07:00",
        duracionMinutos: "60",
        cuposDefault: "16"
      });
      expect(horarioOk.ok).toBe(true);
    });

    it("traduce errores y ejecuta creación/edición/baja y materialización sin jerga HTTP", async () => {
      expect(traducirErrorHorarios("ACCESO_DENEGADO_ROL")).not.toMatch(
        /ACCESO_DENEGADO_ROL|403|Forbidden/i
      );
      expect(
        traducirErrorHorarios("ERROR_INTERNO", "SQLSTATE 23505")
      ).not.toMatch(/SQLSTATE|23505/);

      const crearTipoMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resTipo = await procesarGuardadoTipoClase(
        BOX_ID,
        null,
        { nombre: "WOD", descripcion: "" },
        crearTipoMock,
        vi.fn()
      );
      expect(resTipo.ok).toBe(true);

      const actualizarTipoMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resTipoEdit = await procesarGuardadoTipoClase(
        BOX_ID,
        TIPO_WOD_ID,
        { nombre: "WOD Avanzado", descripcion: "Alta intensidad" },
        vi.fn(),
        actualizarTipoMock
      );
      expect(resTipoEdit.ok).toBe(true);

      const eliminarTipoMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resBajaTipo = await procesarBajaTipoClase(
        BOX_ID,
        TIPOS_BASE[0]!,
        eliminarTipoMock
      );
      expect(resBajaTipo.ok).toBe(true);

      const crearHorarioMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resHorario = await procesarGuardadoHorario(
        BOX_ID,
        null,
        {
          tipoClaseId: TIPO_WOD_ID,
          coachAfiliacionId: COACH_AFIL_ID,
          diaSemana: "1",
          horaInicio: "07:00",
          duracionMinutos: "60",
          cuposDefault: "16"
        },
        crearHorarioMock,
        vi.fn()
      );
      expect(resHorario.ok).toBe(true);

      const eliminarHorarioMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resBajaHorario = await procesarBajaHorario(
        BOX_ID,
        HORARIOS_BASE[1]!,
        eliminarHorarioMock
      );
      expect(resBajaHorario.ok).toBe(true);

      const materializarMock = vi.fn().mockResolvedValueOnce({ ok: true });
      const resMat = await procesarMaterializacionClases(
        BOX_ID,
        materializarMock
      );
      expect(resMat.ok).toBe(true);
    });
  });

  describe("Render Dark Bento Cockpit, anti-overflow e InlineConfirm", () => {
    it("renderiza Bento grid semanal con franjas tabular-nums, cupos, puente a /clases y sin confirm() ni 11px", () => {
      const html = renderToStaticMarkup(
        createElement(HorariosView, {
          boxId: BOX_ID,
          esAdmin: true,
          tiposClaseIniciales: TIPOS_BASE,
          horariosIniciales: HORARIOS_BASE,
          coaches: COACHES_BASE
        })
      );

      expect(html).toContain("<h1");
      expect(html).toContain("Horarios y Tipos de Clase");
      expect(html).toContain('data-testid="btn-nuevo-tipo-clase"');
      expect(html).toContain('data-testid="btn-nuevo-horario"');
      expect(html).toContain('data-testid="btn-generar-clases"');

      // Grilla anti-overflow y franjas tabular-nums
      expect(html).toContain('data-testid="grilla-horarios-semana"');
      expect(html).toContain('data-testid="grilla-tipos-clase"');
      expect(html).toContain("minmax(min(100%,300px),1fr)");
      expect(html).toContain("07:00 – 08:00");
      expect(html).toContain("16 cupos");
      expect(html).toContain("20 cupos");
      expect(html).toContain("tabular-nums");

      // Sin estética heredada ni tamaños sub-12px ni jerga prohibida
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("font-mono");
      expect(html).not.toContain("text-[0.6875rem]");
      expect(html).not.toContain("lg:grid-cols-7");
      expect(html).not.toContain("Disciplina");

      // Testids preservados
      expect(html).toContain('data-testid="bloque-horario-dia-1-07:00"');
      expect(html).toContain('data-testid="btn-eliminar-horario-07:00"');
      expect(html).toContain('data-testid="item-tipo-clase-WOD"');
      expect(html).toContain('data-testid="btn-eliminar-tipo-clase-WOD"');
    });

    it("renderiza InlineConfirm para baja de Tipo de Clase y de Horario sin window.confirm()", () => {
      const htmlTipo = renderToStaticMarkup(
        createElement(HorariosView, {
          boxId: BOX_ID,
          esAdmin: true,
          tiposClaseIniciales: TIPOS_BASE,
          horariosIniciales: HORARIOS_BASE,
          coaches: COACHES_BASE,
          confirmandoTipoInicialId: TIPO_WOD_ID
        })
      );

      expect(htmlTipo).toContain('data-testid="baja-tipo-clase-WOD-panel"');
      expect(htmlTipo).toContain('data-testid="baja-tipo-clase-WOD-confirm"');
      expect(htmlTipo).toContain('data-testid="baja-tipo-clase-WOD-cancel"');

      const htmlHorario = renderToStaticMarkup(
        createElement(HorariosView, {
          boxId: BOX_ID,
          esAdmin: true,
          tiposClaseIniciales: TIPOS_BASE,
          horariosIniciales: HORARIOS_BASE,
          coaches: COACHES_BASE,
          confirmandoHorarioInicialId: HORARIOS_BASE[1]!.id
        })
      );

      expect(htmlHorario).toContain('data-testid="baja-horario-07:00-panel"');
      expect(htmlHorario).toContain('data-testid="baja-horario-07:00-confirm"');
      expect(htmlHorario).toContain('data-testid="baja-horario-07:00-cancel"');
    });

    it("renderiza SideDrawer accesible para Tipo de Clase y para Horario", () => {
      const htmlDrawerTipo = renderToStaticMarkup(
        createElement(HorariosView, {
          boxId: BOX_ID,
          esAdmin: true,
          tiposClaseIniciales: TIPOS_BASE,
          horariosIniciales: HORARIOS_BASE,
          coaches: COACHES_BASE,
          drawerInicial: "tipo"
        })
      );
      expect(htmlDrawerTipo).toContain('role="dialog"');
      expect(htmlDrawerTipo).toContain('data-testid="input-tipo-clase-nombre"');
      expect(htmlDrawerTipo).toContain('data-testid="btn-guardar-tipo-clase"');

      const htmlDrawerHorario = renderToStaticMarkup(
        createElement(HorariosView, {
          boxId: BOX_ID,
          esAdmin: true,
          tiposClaseIniciales: TIPOS_BASE,
          horariosIniciales: HORARIOS_BASE,
          coaches: COACHES_BASE,
          drawerInicial: "horario"
        })
      );
      expect(htmlDrawerHorario).toContain('role="dialog"');
      expect(htmlDrawerHorario).toContain('data-testid="select-horario-tipo-clase"');
      expect(htmlDrawerHorario).toContain('data-testid="select-horario-coach"');
      expect(htmlDrawerHorario).toContain('data-testid="select-horario-dia"');
      expect(htmlDrawerHorario).toContain('data-testid="input-horario-hora"');
      expect(htmlDrawerHorario).toContain('data-testid="input-horario-duracion"');
      expect(htmlDrawerHorario).toContain('data-testid="input-horario-cupos"');
      expect(htmlDrawerHorario).toContain('data-testid="btn-guardar-horario"');
    });

    it("oculta controles de mutación y muestra banner de solo lectura para Coach/Atleta sin 403", () => {
      const html = renderToStaticMarkup(
        createElement(HorariosView, {
          boxId: BOX_ID,
          esAdmin: false,
          tiposClaseIniciales: TIPOS_BASE,
          horariosIniciales: HORARIOS_BASE,
          coaches: COACHES_BASE
        })
      );

      expect(html).toContain('data-testid="banner-solo-lectura"');
      expect(html).not.toContain('data-testid="btn-nuevo-tipo-clase"');
      expect(html).not.toContain('data-testid="btn-nuevo-horario"');
      expect(html).not.toContain('data-testid="btn-generar-clases"');
      expect(html).not.toContain("403");
      expect(html).not.toContain("Forbidden");
    });
  });
});
