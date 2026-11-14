import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AfiliacionConBox } from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  seleccionarBoxAction: vi.fn(),
  cerrarSesionAction: vi.fn()
}));

import {
  ejecutarSeleccionBox,
  formatearUbicacionTimezone
} from "./seleccionar-box-estado";
import { SeleccionarBoxView } from "./seleccionar-box-view";
import { AlertaErrorSeleccionBox } from "./selector-box-card";

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
  id: "a0000000-0000-4000-8000-000000000002",
  nombre: "Box Centris Sur Entrenamiento Funcional & Fuerza",
  slug: "centris-sur",
  timezone: "America/Montevideo",
  moneda: "UYU",
  anticipacionReservaDias: 5,
  ventanaCancelacionMinutos: 60
};

const AFILIACION_NORTE: AfiliacionConBox = {
  id: "e0000000-0000-4000-8000-000000000001",
  boxId: BOX_NORTE.id,
  usuarioId: "u0000000-0000-4000-8000-000000000001",
  roles: ["coach", "recepcionista"],
  activo: true,
  box: BOX_NORTE
};

const AFILIACION_SUR: AfiliacionConBox = {
  id: "e0000000-0000-4000-8000-000000000002",
  boxId: BOX_SUR.id,
  usuarioId: "u0000000-0000-4000-8000-000000000001",
  roles: ["administrador", "atleta"],
  activo: true,
  box: BOX_SUR
};

describe("Rediseño Dark Bento Cockpit de /seleccionar-box", () => {
  describe("Módulo seleccionar-box-estado", () => {
    it("formatea timezones IANA a ubicación humana legible sin prefijos técnicos", () => {
      expect(formatearUbicacionTimezone("America/Argentina/Buenos_Aires")).toBe(
        "Buenos Aires"
      );
      expect(formatearUbicacionTimezone("America/Argentina/Cordoba")).toBe(
        "Córdoba"
      );
      expect(formatearUbicacionTimezone("America/Montevideo")).toBe(
        "Montevideo"
      );
      expect(formatearUbicacionTimezone("America/Sao_Paulo")).toBe("São Paulo");
      expect(formatearUbicacionTimezone("Europe/Madrid")).toBe("Madrid");
      expect(formatearUbicacionTimezone("")).toBe("Zona horaria configurada");
    });

    it("ejecuta selección de Box y traduce fallos a mensaje humano sin jerga técnica", async () => {
      const okMock = vi.fn().mockResolvedValueOnce(undefined);
      const exito = await ejecutarSeleccionBox(BOX_NORTE.id, okMock);
      expect(okMock).toHaveBeenCalledWith(BOX_NORTE.id);
      expect(exito).toEqual({ ok: true });

      const failMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("500 Internal Server Error"));
      const fallo = await ejecutarSeleccionBox(BOX_NORTE.id, failMock);
      expect(fallo.ok).toBe(false);
      if (!fallo.ok) {
        expect(fallo.mensaje).not.toContain("500");
        expect(fallo.mensaje).not.toContain("Internal Server Error");
        expect(fallo.mensaje).toContain("Intentá nuevamente");
      }
    });
  });

  describe("Render Dark Bento Cockpit y estabilidad anti-salto", () => {
    it("renderiza encabezado con lockup Centris, cápsula de usuario y grilla Bento sin font-display ni uppercase", () => {
      const html = renderToStaticMarkup(
        createElement(SeleccionarBoxView, {
          nombreUsuario: "Diego Sosa",
          afiliaciones: [AFILIACION_NORTE, AFILIACION_SUR],
          boxActivoId: BOX_NORTE.id,
          errorCargaAfiliaciones: false,
          onSeleccionarBox: vi.fn(),
          onCerrarSesion: vi.fn()
        })
      );

      // Encabezado, lockup y cápsula de usuario
      expect(html).toContain("Centris");
      expect(html).toContain("DS");
      expect(html).toContain("Diego Sosa");
      expect(html).toContain("Cerrar sesión");
      expect(html).toContain("Seleccioná tu Box");

      // Selectores E2E obligatorios preservados
      expect(html).toContain(`data-testid="opcion-box-${BOX_NORTE.id}"`);
      expect(html).toContain(`data-testid="opcion-box-${BOX_SUR.id}"`);

      // Card activa vs inactiva
      expect(html).toContain("Activo ahora");
      expect(html).toContain("Continuar en este Box");
      expect(html).toContain("Ingresar al Box");
      expect(html).toContain("border-[#C1F429]/48");

      // Roles componibles en español (Sentence case) sin minúsculas crudas
      expect(html).toContain("Coach");
      expect(html).toContain("Recepcionista");
      expect(html).toContain("Administrador");
      expect(html).toContain("Atleta");

      // Ubicación humana sin string IANA completo y moneda tabular-nums
      expect(html).toContain("Buenos Aires");
      expect(html).toContain("Montevideo");
      expect(html).not.toContain("America/Argentina/Buenos_Aires");
      expect(html).not.toContain("America/Montevideo");
      expect(html).toContain("tabular-nums");

      // Geometría Dark Bento Cockpit y estabilidad anti-salto
      expect(html).toContain("rounded-3xl");
      expect(html).toContain("rounded-2xl");
      expect(html).toContain("rounded-full");
      expect(html).toContain("min-h-11");
      expect(html).toContain("min-h-7");
      expect(html).toContain("sm:min-h-[4.5rem]");
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-primary-foreground");

      // Reglas de copy, lenguaje ubicuo y tipografía v2
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("uppercase");
      expect(html).not.toContain("gimnasio");
      expect(html).not.toContain("cuenta");
    });

    it("muestra alerta accesible sin jerga técnica cuando falla la selección de un Box", () => {
      const html = renderToStaticMarkup(
        createElement(AlertaErrorSeleccionBox, {
          boxId: BOX_NORTE.id,
          mensaje:
            "No pudimos abrir este Box en este momento. Intentá nuevamente."
        })
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain(`data-testid="error-box-${BOX_NORTE.id}"`);
      expect(html).toContain(
        "No pudimos abrir este Box en este momento. Intentá nuevamente."
      );
    });

    it("renderiza estado vacío accesible preservando sin-afiliaciones-box con acciones de salida y actualización", () => {
      const html = renderToStaticMarkup(
        createElement(SeleccionarBoxView, {
          nombreUsuario: "Diego Sosa",
          afiliaciones: [],
          boxActivoId: null,
          errorCargaAfiliaciones: false,
          onSeleccionarBox: vi.fn(),
          onCerrarSesion: vi.fn()
        })
      );

      expect(html).toContain('data-testid="sin-afiliaciones-box"');
      expect(html).toContain("No tenés afiliaciones activas");
      expect(html).toContain("Cerrar sesión");
      expect(html).toContain("Actualizar listado");
      expect(html).not.toContain("cuenta");
      expect(html).not.toContain("gimnasio");
    });

    it("renderiza estado de error de carga accesible sin códigos HTTP ni errorCode técnicos", () => {
      const html = renderToStaticMarkup(
        createElement(SeleccionarBoxView, {
          nombreUsuario: "Diego Sosa",
          afiliaciones: [],
          boxActivoId: null,
          errorCargaAfiliaciones: true,
          onSeleccionarBox: vi.fn(),
          onCerrarSesion: vi.fn()
        })
      );

      expect(html).toContain('data-testid="error-cargar-boxes"');
      expect(html).toContain('role="alert"');
      expect(html).toContain("No pudimos cargar tus Boxes");
      expect(html).toContain("Actualizar listado");
      expect(html).toContain("Cerrar sesión");
      expect(html).not.toMatch(/401|500|ERROR_|FETCH/);
    });
  });
});
