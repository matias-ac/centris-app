import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AfiliacionConUsuario } from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  guardarRolesAfiliacionAction: vi.fn(),
  bajaAfiliacionAction: vi.fn()
}));

import {
  alternarRolEnBorrador,
  calcularKpisAfiliaciones,
  filtrarAfiliaciones,
  procesarBajaAfiliacion,
  procesarGuardadoRoles,
  sonRolesIguales,
  traducirErrorAfiliacion,
  validarRolesAfiliacionLocal
} from "./afiliaciones-estado";
import {
  AccesoRestringidoAfiliaciones,
  TablaAfiliacionesBox
} from "./tabla-afiliaciones-box";

const BOX_ID = "00000000-0000-4000-8000-000000000101";

const AFILIACIONES_BASE: AfiliacionConUsuario[] = [
  {
    id: "e0000000-0000-4000-8000-000000000001",
    boxId: BOX_ID,
    usuarioId: "d0000000-0000-4000-8000-000000000001",
    roles: ["administrador", "atleta"],
    activo: true,
    usuario: {
      id: "d0000000-0000-4000-8000-000000000001",
      email: "admin@centris.dev",
      nombre: "Martín Gómez",
      passwordActivada: true
    }
  },
  {
    id: "e0000000-0000-4000-8000-000000000002",
    boxId: BOX_ID,
    usuarioId: "d0000000-0000-4000-8000-000000000002",
    roles: ["coach", "recepcionista"],
    activo: true,
    usuario: {
      id: "d0000000-0000-4000-8000-000000000002",
      email: "diego.sosa@centris.dev",
      nombre: "Diego Sosa",
      passwordActivada: true
    }
  },
  {
    id: "e0000000-0000-4000-8000-000000000003",
    boxId: BOX_ID,
    usuarioId: "d0000000-0000-4000-8000-000000000003",
    roles: ["atleta"],
    activo: true,
    usuario: {
      id: "d0000000-0000-4000-8000-000000000003",
      email: "sofia.castro@centris.dev",
      nombre: "Sofía Castro",
      passwordActivada: true
    }
  }
];

describe("Rediseño Dark Bento Cockpit de /afiliaciones", () => {
  describe("Módulo afiliaciones-estado (KPIs, filtros, roles y errores)", () => {
    it("calcula KPIs de integrantes activos, equipo operativo y atletas", () => {
      const kpis = calcularKpisAfiliaciones(AFILIACIONES_BASE);
      expect(kpis).toEqual({
        total: 3,
        equipoOperativo: 2,
        atletas: 2
      });
    });

    it("filtra por nombre o email y por rol asignado sin distinguir mayúsculas", () => {
      const porNombre = filtrarAfiliaciones(
        AFILIACIONES_BASE,
        "diego",
        "TODOS"
      );
      expect(porNombre.map((a) => a.id)).toEqual([
        "e0000000-0000-4000-8000-000000000002"
      ]);

      const porEmail = filtrarAfiliaciones(
        AFILIACIONES_BASE,
        "SOFIA.CASTRO",
        "TODOS"
      );
      expect(porEmail.map((a) => a.id)).toEqual([
        "e0000000-0000-4000-8000-000000000003"
      ]);

      const soloAtletas = filtrarAfiliaciones(AFILIACIONES_BASE, "", "atleta");
      expect(soloAtletas.map((a) => a.id)).toEqual([
        "e0000000-0000-4000-8000-000000000001",
        "e0000000-0000-4000-8000-000000000003"
      ]);

      const soloCoach = filtrarAfiliaciones(AFILIACIONES_BASE, "", "coach");
      expect(soloCoach.map((a) => a.id)).toEqual([
        "e0000000-0000-4000-8000-000000000002"
      ]);
    });

    it("compara conjuntos de roles independientemente del orden y conmuta sin duplicar", () => {
      expect(
        sonRolesIguales(["coach", "recepcionista"], ["recepcionista", "coach"])
      ).toBe(true);
      expect(sonRolesIguales(["coach"], ["coach", "atleta"])).toBe(false);

      const conAtleta = alternarRolEnBorrador(["coach"], "atleta");
      expect(conAtleta).toEqual(["coach", "atleta"]);

      const sinCoach = alternarRolEnBorrador(conAtleta, "coach");
      expect(sinCoach).toEqual(["atleta"]);
    });

    it("valida que la Afiliación conserve al menos un rol antes de persistir", () => {
      const vacio = validarRolesAfiliacionLocal([]);
      expect(vacio.ok).toBe(false);
      if (!vacio.ok) {
        expect(vacio.error).toContain("al menos un rol");
        expect(vacio.error).toContain("Dar de baja");
      }

      const valido = validarRolesAfiliacionLocal(["coach", "coach", "atleta"]);
      expect(valido).toEqual({
        ok: true,
        roles: ["coach", "atleta"]
      });
    });

    it("traduce errores del servidor a mensajes humanos sin códigos técnicos", () => {
      const ultimoAdmin = traducirErrorAfiliacion("ULTIMO_ADMINISTRADOR");
      expect(ultimoAdmin).not.toMatch(/ULTIMO_ADMINISTRADOR|409/);
      expect(ultimoAdmin).toContain("Administrador");

      const denegado = traducirErrorAfiliacion("ACCESO_DENEGADO_ROL");
      expect(denegado).not.toMatch(/ACCESO_DENEGADO_ROL|403|Forbidden/i);

      const generico = traducirErrorAfiliacion("ERROR_INESPERADO");
      expect(generico).not.toMatch(/ERROR_INESPERADO|500/);
    });

    it("procesa guardado y baja validando localmente y ocultando errores crudos", async () => {
      const guardarMock = vi.fn();
      const invalido = await procesarGuardadoRoles(
        BOX_ID,
        AFILIACIONES_BASE[0]!.id,
        [],
        guardarMock
      );
      expect(invalido.ok).toBe(false);
      expect(guardarMock).not.toHaveBeenCalled();

      guardarMock.mockResolvedValueOnce({
        ok: false,
        errorCode: "ULTIMO_ADMINISTRADOR",
        message: "ULTIMO_ADMINISTRADOR"
      });
      const rechazado = await procesarGuardadoRoles(
        BOX_ID,
        AFILIACIONES_BASE[0]!.id,
        ["atleta"],
        guardarMock
      );
      expect(rechazado.ok).toBe(false);
      if (!rechazado.ok) {
        expect(rechazado.error).not.toContain("ULTIMO_ADMINISTRADOR");
      }

      guardarMock.mockResolvedValueOnce({ ok: true });
      const ok = await procesarGuardadoRoles(
        BOX_ID,
        AFILIACIONES_BASE[1]!.id,
        ["coach", "recepcionista", "atleta"],
        guardarMock
      );
      expect(ok.ok).toBe(true);

      const bajaMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        errorCode: "ULTIMO_ADMINISTRADOR",
        message: "Forbidden"
      });
      const bajaRechazada = await procesarBajaAfiliacion(
        BOX_ID,
        AFILIACIONES_BASE[0]!.id,
        bajaMock
      );
      expect(bajaRechazada.ok).toBe(false);
      if (!bajaRechazada.ok) {
        expect(bajaRechazada.error).not.toMatch(/ULTIMO_ADMINISTRADOR|Forbidden/);
      }
    });
  });

  describe("Render Dark Bento Cockpit, estabilidad de columnas y accesibilidad", () => {
    it("renderiza KPIs, buscador, FilterChips con aria-pressed, switches de rol >= 44px y grilla fija 264px", () => {
      const html = renderToStaticMarkup(
        createElement(TablaAfiliacionesBox, {
          afiliaciones: AFILIACIONES_BASE,
          boxId: BOX_ID,
          nombreBox: "Box Centris Norte"
        })
      );

      // KPIs y cifras tabulares
      expect(html).toContain("Integrantes activos");
      expect(html).toContain("Equipo operativo con acceso");
      expect(html).toContain("Con rol Atleta");
      expect(html).toContain("tabular-nums");
      expect(html).not.toMatch(/\bstaff\b/i);

      // Buscador y filtros por rol
      expect(html).toContain('aria-label="Buscar integrante"');
      expect(html).toContain('aria-label="Filtrar por rol"');
      expect(html).toContain('aria-pressed="true"');

      // Selectores preservados para E2E y switches táctiles de los 4 roles
      const id = AFILIACIONES_BASE[1]!.id;
      expect(html).toContain(`data-testid="fila-afiliacion-${id}"`);
      expect(html).toContain(`data-testid="checkbox-rol-administrador-${id}"`);
      expect(html).toContain(`data-testid="checkbox-rol-coach-${id}"`);
      expect(html).toContain(`data-testid="checkbox-rol-recepcionista-${id}"`);
      expect(html).toContain(`data-testid="checkbox-rol-atleta-${id}"`);
      expect(html).toContain('role="switch"');
      expect(html).toContain('aria-checked="true"');

      // Track dedicado de acciones (264px) y altura táctil >= 44px
      expect(html).toContain("264px");
      expect(html).toContain("min-h-11");
      expect(html).toContain("Guardar roles");
      expect(html).toContain("Dar de baja");

      // Estética Dark Bento v2 sin prohibiciones ni jerga técnica
      expect(html).toContain("rounded-3xl");
      expect(html).toContain("rounded-2xl");
      expect(html).toContain("rounded-full");
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("uppercase");
      expect(html).not.toContain("<table");
      expect(html).not.toContain("atómicos");
      expect(html).not.toContain("—");
    });

    it("renderiza franja .dirty-strip con Cambios sin guardar y confirmacion inline de baja sin desplazar acciones", () => {
      const id = AFILIACIONES_BASE[1]!.id;
      const html = renderToStaticMarkup(
        createElement(TablaAfiliacionesBox, {
          afiliaciones: AFILIACIONES_BASE,
          boxId: BOX_ID,
          nombreBox: "Box Centris Norte",
          borradoresIniciales: {
            [id]: ["coach", "recepcionista", "atleta"]
          },
          confirmandoBajaInicialId: id
        })
      );

      expect(html).toContain("dirty-strip");
      expect(html).toContain("Cambios sin guardar");
      expect(html).toContain("Descartar");
      expect(html).toContain("confirm-inline");
      expect(html).toContain("Confirmar baja");
      expect(html).toContain("Cancelar");
      expect(html).toContain("No afectará sus Afiliaciones en otros Boxes");
    });

    it("renderiza acceso restringido preservando testid, h1 y sin 403 Forbidden", () => {
      const html = renderToStaticMarkup(
        createElement(AccesoRestringidoAfiliaciones, {
          nombreBox: "Box Centris Norte"
        })
      );

      expect(html).toContain('data-testid="acceso-denegado-rol"');
      expect(html).toContain("<h1");
      expect(html).toContain("Acceso exclusivo de Administración");
      expect(html).toContain("Permiso requerido");
      expect(html).toContain('href="/inicio"');
      expect(html).not.toContain("403");
      expect(html).not.toContain("Forbidden");
      expect(html).not.toContain("—");
    });
  });
});
