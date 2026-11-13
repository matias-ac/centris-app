import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AfiliacionConBox } from "@centris/shared";

vi.mock("next/navigation", () => ({
  usePathname: () => "/planes",
  useRouter: () => ({ refresh: vi.fn() })
}));

import {
  esRutaActiva,
  formatearFechaOperativaBox,
  obtenerEtiquetaRol,
  obtenerInicialesUsuario,
  resolverNavegacionPorRoles
} from "./navegacion-box";
import { ShellAutenticado } from "./shell-autenticado";

const BOX_NORTE: AfiliacionConBox["box"] = {
  id: "a0000000-0000-4000-8000-000000000001",
  nombre: "Box Centris Norte",
  slug: "centris-norte",
  timezone: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
  anticipacionReservaDias: 7,
  ventanaCancelacionMinutos: 120
};

const BOX_SUR: AfiliacionConBox["box"] = {
  ...BOX_NORTE,
  id: "a0000000-0000-4000-8000-000000000002",
  nombre: "Box Centris Sur",
  slug: "centris-sur"
};

function crearAfiliacion(
  roles: AfiliacionConBox["roles"],
  box = BOX_NORTE
): AfiliacionConBox {
  return {
    id: "e0000000-0000-4000-8000-000000000001",
    boxId: box.id,
    usuarioId: "u0000000-0000-4000-8000-000000000001",
    roles,
    activo: true,
    box
  };
}

describe("Shell Autenticado Dark Bento Cockpit", () => {
  it("filtra la navegación por roles componibles y ubica Configuración al pie solo para Administrador", () => {
    const navAdmin = resolverNavegacionPorRoles(["administrador"]);
    expect(navAdmin.principal.map((i) => i.testId)).toEqual([
      "nav-link-inicio",
      "nav-link-horarios",
      "nav-link-clases",
      "nav-link-reservas",
      "nav-link-planes",
      "nav-link-atletas",
      "nav-link-caja",
      "nav-link-afiliaciones"
    ]);
    expect(navAdmin.pie.map((i) => i.testId)).toEqual([
      "nav-link-configuracion"
    ]);

    const navCoachRecepcion = resolverNavegacionPorRoles([
      "coach",
      "recepcionista"
    ]);
    expect(navCoachRecepcion.principal.map((i) => i.testId)).toEqual([
      "nav-link-inicio",
      "nav-link-horarios",
      "nav-link-clases",
      "nav-link-reservas",
      "nav-link-planes",
      "nav-link-atletas",
      "nav-link-caja"
    ]);
    expect(navCoachRecepcion.pie).toEqual([]);

    const navCoach = resolverNavegacionPorRoles(["coach"]);
    expect(navCoach.principal.map((i) => i.testId)).toEqual([
      "nav-link-inicio",
      "nav-link-horarios",
      "nav-link-clases"
    ]);
    expect(navCoach.pie).toEqual([]);
  });

  it("formatea iniciales, etiquetas de rol en Sentence case, ruta activa y fecha en timezone del Box", () => {
    expect(obtenerInicialesUsuario("Martín Gómez")).toBe("MG");
    expect(obtenerInicialesUsuario("Sofía")).toBe("SO");

    expect(obtenerEtiquetaRol("administrador")).toEqual({
      label: "Administrador",
      variant: "mint"
    });
    expect(obtenerEtiquetaRol("recepcionista")).toEqual({
      label: "Recepcionista",
      variant: "amber"
    });
    expect(obtenerEtiquetaRol("atleta")).toEqual({
      label: "Atleta",
      variant: "zinc"
    });

    expect(esRutaActiva("/planes", "/planes")).toBe(true);
    expect(esRutaActiva("/planes/nuevo", "/planes")).toBe(true);
    expect(esRutaActiva("/atletas", "/planes")).toBe(false);

    const fecha = formatearFechaOperativaBox(
      "America/Argentina/Buenos_Aires",
      new Date("2026-11-13T15:00:00Z")
    );
    expect(fecha).toContain("13/11");
  });

  it("renderiza sidebar 248px con ícono + etiqueta visible, estado activo Volt Lime y testids obligatorios", () => {
    const afiliacionNorte = crearAfiliacion(["administrador"], BOX_NORTE);
    const afiliacionSur = crearAfiliacion(["atleta"], BOX_SUR);

    const html = renderToStaticMarkup(
      createElement(
        ShellAutenticado,
        {
          afiliacionActiva: afiliacionNorte,
          afiliaciones: [afiliacionNorte, afiliacionSur],
          nombreUsuario: "Martín Gómez",
          fechaOperativaLabel: "Hoy · vie 13/11",
          pathnameActual: "/planes",
          onSeleccionarBox: vi.fn(async () => undefined),
          onCerrarSesion: vi.fn(async () => undefined),
          children: createElement("div", null, "Contenido")
        }
      )
    );

    expect(html).toContain('data-testid="box-activo-nombre"');
    expect(html).toContain("Box Centris Norte");
    expect(html).toContain("America/Argentina/Buenos_Aires");
    expect(html).toContain("bg-secondary");
    expect(html).toContain('data-testid="roles-activos-badges"');
    expect(html).toContain('data-testid="selector-box-header"');
    expect(html).toContain('data-testid="nav-link-inicio"');
    expect(html).toContain('data-testid="nav-link-planes"');
    expect(html).toContain('data-testid="nav-link-configuracion"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("lg:w-[248px]");
    expect(html).toContain("Cerrar sesión");
    expect(html).toContain("MG");
    expect(html).not.toContain("font-display");
  });
});
