import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Box } from "@centris/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  guardarConfiguracionBoxAction: vi.fn()
}));

import {
  calcularVistaPreviaOperativa,
  crearBorradorDesdeBox,
  formatearMinutosVentana,
  hayCambiosPendientesConfiguracion,
  procesarGuardadoConfiguracion,
  traducirErrorConfiguracionBox,
  validarConfiguracionBox
} from "./configuracion-estado";
import {
  AccesoRestringidoConfiguracion,
  FormularioConfiguracionBox
} from "./formulario-configuracion-box";

const BOX_BASE: Box = {
  id: "00000000-0000-4000-8000-000000000101",
  nombre: "Box Centris Norte",
  slug: "centris-norte",
  timezone: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
  anticipacionReservaDias: 7,
  ventanaCancelacionMinutos: 120
};

describe("Rediseño Dark Bento Cockpit de /configuracion", () => {
  describe("Módulo configuracion-estado (validación, formato y vista previa)", () => {
    it("valida campos individualmente sin marcar otros controles cuando hay un solo error", () => {
      const borradorNombreVacio = {
        ...crearBorradorDesdeBox(BOX_BASE),
        nombre: "   "
      };
      const resNombre = validarConfiguracionBox(borradorNombreVacio);
      expect(resNombre.ok).toBe(false);
      if (!resNombre.ok) {
        expect(resNombre.errores.nombre).toBeTruthy();
        expect(resNombre.errores.anticipacionReservaDias).toBeUndefined();
        expect(resNombre.errores.ventanaCancelacionMinutos).toBeUndefined();
      }

      const borradorAnticipacion = {
        ...crearBorradorDesdeBox(BOX_BASE),
        anticipacionReservaDias: "95"
      };
      const resAnticipacion = validarConfiguracionBox(borradorAnticipacion);
      expect(resAnticipacion.ok).toBe(false);
      if (!resAnticipacion.ok) {
        expect(resAnticipacion.errores.nombre).toBeUndefined();
        expect(resAnticipacion.errores.anticipacionReservaDias).toContain("90");
        expect(resAnticipacion.errores.ventanaCancelacionMinutos).toBeUndefined();
      }

      const borradorVentanaDecimal = {
        ...crearBorradorDesdeBox(BOX_BASE),
        ventanaCancelacionMinutos: "45.5"
      };
      const resVentana = validarConfiguracionBox(borradorVentanaDecimal);
      expect(resVentana.ok).toBe(false);
      if (!resVentana.ok) {
        expect(resVentana.errores.nombre).toBeUndefined();
        expect(resVentana.errores.anticipacionReservaDias).toBeUndefined();
        expect(resVentana.errores.ventanaCancelacionMinutos).toContain("10080");
      }
    });

    it("normaliza y retorna datos válidos contra ActualizarConfiguracionBoxSchema", () => {
      const resultado = validarConfiguracionBox({
        nombre: "  Box Centris Sur  ",
        timezone: "America/Montevideo",
        moneda: "UYU",
        anticipacionReservaDias: "10",
        ventanaCancelacionMinutos: "90"
      });

      expect(resultado).toEqual({
        ok: true,
        datos: {
          nombre: "Box Centris Sur",
          timezone: "America/Montevideo",
          moneda: "UYU",
          anticipacionReservaDias: 10,
          ventanaCancelacionMinutos: 90
        }
      });
    });

    it("formatea los minutos de ventana de cancelación en texto humano", () => {
      expect(formatearMinutosVentana(0)).toBe("Sin restricción (0 min)");
      expect(formatearMinutosVentana(30)).toBe("30 minutos");
      expect(formatearMinutosVentana(60)).toBe("1 hora (60 min)");
      expect(formatearMinutosVentana(90)).toBe("1 h 30 min (90 min)");
      expect(formatearMinutosVentana(120)).toBe("2 horas (120 min)");
      expect(formatearMinutosVentana(1440)).toBe("1 día (1440 min)");
      expect(formatearMinutosVentana(-5)).toBe("Valor fuera de rango");
    });

    it("detecta cambios pendientes sin confundir cadena vacía con cero", () => {
      const guardado = { ...BOX_BASE, ventanaCancelacionMinutos: 0 };
      const limpio = crearBorradorDesdeBox(guardado);
      expect(hayCambiosPendientesConfiguracion(guardado, limpio)).toBe(false);

      const vacio = { ...limpio, ventanaCancelacionMinutos: "" };
      expect(hayCambiosPendientesConfiguracion(guardado, vacio)).toBe(true);

      const modificado = { ...limpio, moneda: "UYU" };
      expect(hayCambiosPendientesConfiguracion(guardado, modificado)).toBe(true);
    });

    it("calcula la vista previa operativa en vivo sin jerga ni términos prohibidos", () => {
      const referencia = new Date("2026-11-14T15:00:00.000Z");
      const vista = calcularVistaPreviaOperativa(
        {
          nombre: "Box Centris Norte",
          timezone: "America/Montevideo",
          moneda: "UYU",
          anticipacionReservaDias: "10",
          ventanaCancelacionMinutos: "90"
        },
        referencia
      );

      expect(vista.zonaElegidaLabel).toContain("Montevideo");
      expect(vista.relojLocal).not.toBe("--:--");
      expect(vista.ejemploMoneda).toMatch(/38\.000|38,000/);
      expect(vista.anticipacionTitulo).toBe("Hasta 10 días");
      expect(vista.anticipacionDetalle).toContain("reservar clases");
      expect(vista.anticipacionDetalle).not.toContain("turnos");
      expect(vista.cancelacionTitulo).toBe("1 h 30 min (90 min) antes");
      expect(vista.cancelacionDetalle).toContain("cancelación tardía");
      expect(vista.equivalenciaVentana).toBe(
        "Equivale a: 1 h 30 min (90 min)."
      );
    });

    it("traduce errores de servidor a mensajes humanos sin errorCode ni códigos HTTP", () => {
      const denegado = traducirErrorConfiguracionBox("ACCESO_DENEGADO_ROL");
      expect(denegado).not.toMatch(/ACCESO_DENEGADO_ROL|403/);
      expect(denegado).toContain("Administrador");

      const validacion = traducirErrorConfiguracionBox("VALIDACION_FALLIDA");
      expect(validacion).not.toMatch(/VALIDACION_FALLIDA|400/);

      const generico = traducirErrorConfiguracionBox("ERROR_DESCONOCIDO");
      expect(generico).not.toMatch(/ERROR_DESCONOCIDO|500/);
      expect(generico).toContain("Intentá nuevamente");
    });

    it("procesa guardado validando localmente antes de invocar la acción del servidor", async () => {
      const accionMock = vi.fn();

      const invalido = await procesarGuardadoConfiguracion(
        BOX_BASE.id,
        {
          ...crearBorradorDesdeBox(BOX_BASE),
          anticipacionReservaDias: "0"
        },
        accionMock
      );
      expect(invalido.ok).toBe(false);
      expect(accionMock).not.toHaveBeenCalled();

      accionMock.mockResolvedValueOnce({
        ok: false,
        errorCode: "ACCESO_DENEGADO_ROL",
        message: "Forbidden"
      });
      const rechazado = await procesarGuardadoConfiguracion(
        BOX_BASE.id,
        crearBorradorDesdeBox(BOX_BASE),
        accionMock
      );
      expect(rechazado.ok).toBe(false);
      if (!rechazado.ok) {
        expect(rechazado.errores.general).not.toContain("ACCESO_DENEGADO_ROL");
        expect(rechazado.errores.general).not.toContain("Forbidden");
      }

      accionMock.mockResolvedValueOnce({ ok: true });
      const exitoso = await procesarGuardadoConfiguracion(
        BOX_BASE.id,
        {
          ...crearBorradorDesdeBox(BOX_BASE),
          moneda: "UYU",
          timezone: "America/Montevideo"
        },
        accionMock
      );
      expect(exitoso.ok).toBe(true);
    });
  });

  describe("Render Dark Bento Cockpit, responsive .two-cols y accesibilidad", () => {
    it("renderiza tarjetas Bento v2, selects guiados, atajos de ventana, preview en vivo y alineación .two-cols", () => {
      const html = renderToStaticMarkup(
        createElement(FormularioConfiguracionBox, {
          box: BOX_BASE
        })
      );

      // Selectores y labels preservados para E2E
      expect(html).toContain('for="cfg-nombre"');
      expect(html).toContain('for="cfg-timezone"');
      expect(html).toContain('for="cfg-moneda"');
      expect(html).toContain('for="cfg-anticipacion"');
      expect(html).toContain('for="cfg-ventana"');
      expect(html).toContain("<select");
      expect(html).toContain("Guardar configuración");
      expect(html).toContain("Restablecer");

      // Atajos frecuentes de ventana de cancelación (>= 44px)
      expect(html).toContain("30 min");
      expect(html).toContain("1 hora (60 min)");
      expect(html).toContain("2 horas (120 min)");
      expect(html).toContain("6 horas (360 min)");
      expect(html).toContain("24 horas (1440 min)");
      expect(html).toContain('aria-pressed="true"');

      // Tarjeta de vista previa en vivo
      expect(html).toContain("Cómo opera hoy el Box");
      expect(html).toContain("En vivo");
      expect(html).toContain("Reloj local del Box");
      expect(html).toContain("Ejemplo de precio en pantalla");
      expect(html).toContain("Anticipación de reserva");
      expect(html).toContain("Política de cancelación");

      // Alineación responsive (.two-cols + .field-label) y reglas tipográficas
      expect(html).toContain("two-cols");
      expect(html).toContain("field-label");
      expect(html).toContain("tabular-nums");
      expect(html).toContain("rounded-3xl");
      expect(html).toContain("rounded-2xl");
      expect(html).toContain("rounded-full");
      expect(html).toContain("text-base");
      expect(html).toContain("min-h-11");

      // Prohibiciones v2 y lenguaje ubicuo
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("uppercase");
      expect(html).not.toContain("IANA");
      expect(html).not.toContain("ISO 4217");
      expect(html).not.toContain("—");
      expect(html).not.toMatch(/turnos|cuotas|horizonte/i);
    });

    it("aplica aria-invalid únicamente al campo con error y muestra banner accesible al guardar", () => {
      const htmlConError = renderToStaticMarkup(
        createElement(FormularioConfiguracionBox, {
          box: BOX_BASE,
          erroresIniciales: {
            anticipacionReservaDias:
              "Indicá un número entero entre 1 y 90 días."
          }
        })
      );

      expect(htmlConError).toMatch(
        /id="cfg-anticipacion"[^>]*aria-invalid="true"/
      );
      expect(htmlConError).not.toMatch(
        /id="cfg-nombre"[^>]*aria-invalid="true"/
      );
      expect(htmlConError).not.toMatch(
        /id="cfg-ventana"[^>]*aria-invalid="true"/
      );

      const htmlConExito = renderToStaticMarkup(
        createElement(FormularioConfiguracionBox, {
          box: BOX_BASE,
          guardadoInicialOk: true
        })
      );

      expect(htmlConExito).toContain('data-testid="mensaje-exito-configuracion"');
      expect(htmlConExito).toContain('role="status"');
      expect(htmlConExito).toContain(
        "Configuración del Box actualizada correctamente."
      );
    });

    it("renderiza acceso restringido preservando testid sin jerga HTTP 403 Forbidden", () => {
      const html = renderToStaticMarkup(
        createElement(AccesoRestringidoConfiguracion, {
          nombreBox: "Box Centris Norte"
        })
      );

      expect(html).toContain('data-testid="acceso-denegado-rol"');
      expect(html).toContain("Acceso exclusivo de Administración");
      expect(html).toContain("Permiso requerido");
      expect(html).toContain('href="/inicio"');
      expect(html).not.toContain("403");
      expect(html).not.toContain("Forbidden");
      expect(html).not.toContain("—");
    });
  });
});
