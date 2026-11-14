import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  activarCuentaAction: vi.fn()
}));

import {
  evaluarReglaContrasena,
  procesarEnvioActivacion,
  traducirErrorActivacion,
  validarActivacionCuenta
} from "./activar-cuenta-estado";
import { ActivarCuentaView } from "./activar-cuenta-view";
import ActivarCuentaPage from "./page";

describe("Rediseño Dark Bento Cockpit de /activar-cuenta", () => {
  describe("Módulo activar-cuenta-estado (validación, regla y errores humanos)", () => {
    it("marca error individual en email sin marcar contraseña cuando el correo es inválido", () => {
      const resultado = validarActivacionCuenta("correo-invalido", "Activa123!");

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.errores.email).toBe(
          "Ingresá el correo electrónico con el que te registraron."
        );
        expect(resultado.errores.password).toBeUndefined();
      }
    });

    it("marca error individual en contraseña sin marcar email cuando tiene menos de 8 caracteres", () => {
      const resultado = validarActivacionCuenta(
        "atleta.nuevo@centris.app",
        "1234567"
      );

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.errores.email).toBeUndefined();
        expect(resultado.errores.password).toBe(
          "La nueva contraseña debe tener al menos 8 caracteres."
        );
      }
    });

    it("marca ambos campos individualmente cuando correo y contraseña son inválidos", () => {
      const resultado = validarActivacionCuenta("", "abc");

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.errores.email).toBe(
          "Ingresá el correo electrónico con el que te registraron."
        );
        expect(resultado.errores.password).toBe(
          "La nueva contraseña debe tener al menos 8 caracteres."
        );
      }
    });

    it("normaliza el correo con trim y retorna datos válidos cuando cumple ActivarCuentaSchema", () => {
      const resultado = validarActivacionCuenta(
        "  atleta.nuevo@centris.app  ",
        "ActivaCentris123!"
      );

      expect(resultado).toEqual({
        ok: true,
        datos: {
          email: "atleta.nuevo@centris.app",
          password: "ActivaCentris123!"
        }
      });
    });

    it("evalúa en vivo el requisito mínimo de 8 caracteres y su contador tabular", () => {
      expect(evaluarReglaContrasena("")).toEqual({
        longitud: 0,
        cumpleMinimo: false,
        etiqueta: "Mínimo 8 caracteres",
        contador: "0 / 8"
      });

      expect(evaluarReglaContrasena("1234567")).toEqual({
        longitud: 7,
        cumpleMinimo: false,
        etiqueta: "Mínimo 8 caracteres",
        contador: "7 / 8"
      });

      expect(evaluarReglaContrasena("12345678")).toEqual({
        longitud: 8,
        cumpleMinimo: true,
        etiqueta: "Cumple mínimo de 8 caracteres",
        contador: "8 / 8"
      });
    });

    it("traduce códigos de error del servidor a copy humano sin exponer errorCode ni códigos HTTP", () => {
      const msgYaActivada = traducirErrorActivacion("CUENTA_YA_ACTIVADA");
      expect(msgYaActivada).not.toContain("CUENTA_YA_ACTIVADA");
      expect(msgYaActivada).not.toContain("409");
      expect(msgYaActivada).toMatch(/ya fue activada/i);

      const msgNoElegible = traducirErrorActivacion("CREDENCIALES_INVALIDAS");
      expect(msgNoElegible).not.toContain("CREDENCIALES_INVALIDAS");
      expect(msgNoElegible).not.toContain("401");
      expect(msgNoElegible).toContain("recepción");

      const msgValidacion = traducirErrorActivacion("VALIDACION_FALLIDA");
      expect(msgValidacion).not.toContain("VALIDACION_FALLIDA");
      expect(msgValidacion).toContain("8 caracteres");

      const msgInterno = traducirErrorActivacion("ERROR_INTERNO");
      expect(msgInterno).not.toContain("ERROR_INTERNO");
      expect(msgInterno).not.toContain("500");
      expect(msgInterno).toContain("Intentá nuevamente");
    });

    it("procesa el envío completo: valida antes de invocar la acción, traduce errores y retorna destino", async () => {
      const accionMock = vi.fn();

      const invalido = await procesarEnvioActivacion("mal", "123", accionMock);
      expect(invalido.ok).toBe(false);
      expect(accionMock).not.toHaveBeenCalled();

      accionMock.mockResolvedValueOnce({
        ok: false,
        errorCode: "CUENTA_YA_ACTIVADA"
      });
      const yaActivada = await procesarEnvioActivacion(
        "atleta@centris.app",
        "Activa123!",
        accionMock
      );
      expect(yaActivada).toEqual({
        ok: false,
        errores: {
          general:
            "Esta cuenta ya fue activada previamente. Iniciá sesión con tu correo y contraseña."
        }
      });

      accionMock.mockRejectedValueOnce(new Error("Network error"));
      const caido = await procesarEnvioActivacion(
        "atleta@centris.app",
        "Activa123!",
        accionMock
      );
      expect(caido).toEqual({
        ok: false,
        errores: {
          general:
            "No pudimos activar tu cuenta en este momento. Intentá nuevamente en unos segundos."
        }
      });

      accionMock.mockResolvedValueOnce({ ok: true, destino: "/inicio" });
      const exitoso = await procesarEnvioActivacion(
        "  atleta@centris.app ",
        "Activa123!",
        accionMock
      );
      expect(accionMock).toHaveBeenLastCalledWith(
        "atleta@centris.app",
        "Activa123!"
      );
      expect(exitoso).toEqual({ ok: true, destino: "/inicio" });
    });
  });

  describe("Render accesible y tokens Dark Bento Cockpit", () => {
    it("preserva los labels/controles E2E, usa Sentence case sin font-display/uppercase y enlaza a /login", () => {
      const html = renderToStaticMarkup(createElement(ActivarCuentaPage));

      expect(html).toContain("Centris");
      expect(html).toContain("Primer ingreso al Box");
      expect(html).toContain("Activá tu cuenta");
      expect(html).toContain('for="activar-email"');
      expect(html).toContain("Correo electrónico");
      expect(html).toContain('for="activar-password"');
      expect(html).toContain("Nueva contraseña");
      expect(html).toContain('aria-label="Mostrar clave"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain("Mínimo 8 caracteres");
      expect(html).toContain("0 / 8");
      expect(html).toContain("tabular-nums");
      expect(html).toContain("Activar mi cuenta");
      expect(html).toContain('href="/login"');
      expect(html).toContain("Volver a iniciar sesión");

      // Tokens Dark Bento Cockpit y reglas tipográficas
      expect(html).toContain("rounded-3xl");
      expect(html).toContain("bg-card");
      expect(html).toContain("border-border");
      expect(html).toContain("text-base");
      expect(html).toContain("min-h-11");
      expect(html).toContain("rounded-full");
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-primary-foreground");

      // Sin deuda v1 ni copy técnico de arquitectura o términos prohibidos
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("uppercase");
      expect(html).not.toContain("contraseña global");
      expect(html).not.toContain("atleta.nuevo@centris.dev");
      expect(html).not.toContain("gimnasio");
    });

    it("aplica aria-invalid solo al campo con error y renderiza alerta accesible cuando hay error general", () => {
      const htmlErrorEmail = renderToStaticMarkup(
        createElement(ActivarCuentaView, {
          erroresIniciales: {
            email: "Ingresá el correo electrónico con el que te registraron."
          }
        })
      );

      expect(htmlErrorEmail).toContain('id="error-activar-email"');
      expect(htmlErrorEmail).toContain(
        "Ingresá el correo electrónico con el que te registraron."
      );
      expect(htmlErrorEmail).toMatch(/id="activar-email"[^>]*aria-invalid="true"/);
      expect(htmlErrorEmail).not.toMatch(
        /id="activar-password"[^>]*aria-invalid="true"/
      );

      const htmlErrorGeneral = renderToStaticMarkup(
        createElement(ActivarCuentaView, {
          erroresIniciales: {
            general:
              "Esta cuenta ya fue activada previamente. Iniciá sesión con tu correo y contraseña."
          }
        })
      );

      expect(htmlErrorGeneral).toContain('data-testid="alerta-error-auth"');
      expect(htmlErrorGeneral).toContain('role="alert"');
      expect(htmlErrorGeneral).toContain("ya fue activada previamente");
      expect(htmlErrorGeneral).not.toContain("CUENTA_YA_ACTIVADA");
    });

    it("muestra la contraseña como texto con aria-pressed=true y actualiza el badge a estado cumplido", () => {
      const htmlVisibleCumplida = renderToStaticMarkup(
        createElement(ActivarCuentaView, {
          passwordInicial: "ActivaCentris123!",
          mostrarContrasenaInicial: true
        })
      );

      expect(htmlVisibleCumplida).toMatch(/id="activar-password"[^>]*type="text"/);
      expect(htmlVisibleCumplida).toContain('aria-label="Ocultar clave"');
      expect(htmlVisibleCumplida).toContain('aria-pressed="true"');
      expect(htmlVisibleCumplida).toContain("Cumple mínimo de 8 caracteres");
      expect(htmlVisibleCumplida).toContain("17 / 8");
    });
  });
});
