import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/actions", () => ({
  iniciarSesionAction: vi.fn()
}));

import {
  procesarEnvioLogin,
  traducirErrorAutenticacion,
  validarCredencialesLogin
} from "./login-estado";
import { LoginView } from "./login-view";
import LoginPage from "./page";

describe("Rediseño Dark Bento Cockpit de /login", () => {
  describe("Módulo login-estado (validación y errores humanos)", () => {
    it("marca error individual en email sin marcar contraseña cuando el correo es inválido", () => {
      const resultado = validarCredencialesLogin("correo-invalido", "Centris123!");

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.errores.email).toBe("Ingresá un correo electrónico válido.");
        expect(resultado.errores.password).toBeUndefined();
      }
    });

    it("marca error individual en contraseña sin marcar email cuando tiene menos de 8 caracteres", () => {
      const resultado = validarCredencialesLogin("atleta@centris.app", "12345");

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.errores.email).toBeUndefined();
        expect(resultado.errores.password).toBe(
          "La contraseña debe tener al menos 8 caracteres."
        );
      }
    });

    it("marca ambos campos individualmente cuando correo y contraseña son inválidos", () => {
      const resultado = validarCredencialesLogin("", "123");

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.errores.email).toBe("Ingresá un correo electrónico válido.");
        expect(resultado.errores.password).toBe(
          "La contraseña debe tener al menos 8 caracteres."
        );
      }
    });

    it("normaliza el correo con trim y retorna datos válidos cuando cumple LoginSchema", () => {
      const resultado = validarCredencialesLogin(
        "  atleta@centris.app  ",
        "Centris123!"
      );

      expect(resultado).toEqual({
        ok: true,
        datos: {
          email: "atleta@centris.app",
          password: "Centris123!"
        }
      });
    });

    it("traduce códigos de error del servidor a copy humano sin exponer errorCode ni códigos HTTP", () => {
      const msgCredenciales = traducirErrorAutenticacion("CREDENCIALES_INVALIDAS");
      expect(msgCredenciales).not.toContain("CREDENCIALES_INVALIDAS");
      expect(msgCredenciales).toContain("correo o la contraseña");

      const msgValidacion = traducirErrorAutenticacion("VALIDACION_FALLIDA");
      expect(msgValidacion).not.toContain("VALIDACION_FALLIDA");
      expect(msgValidacion.length).toBeGreaterThan(10);

      const msgInterno = traducirErrorAutenticacion("ERROR_INTERNO");
      expect(msgInterno).not.toContain("ERROR_INTERNO");
      expect(msgInterno).not.toContain("500");
      expect(msgInterno).toContain("Intentá nuevamente");
    });

    it("procesa el envío completo: valida antes de invocar la acción, traduce errores y retorna destino", async () => {
      const accionMock = vi.fn();

      const invalido = await procesarEnvioLogin("mal", "123", accionMock);
      expect(invalido.ok).toBe(false);
      expect(accionMock).not.toHaveBeenCalled();

      accionMock.mockResolvedValueOnce({
        ok: false,
        errorCode: "CREDENCIALES_INVALIDAS"
      });
      const rechazado = await procesarEnvioLogin(
        "atleta@centris.app",
        "ClaveIncorrecta1!",
        accionMock
      );
      expect(rechazado).toEqual({
        ok: false,
        errores: {
          general:
            "El correo o la contraseña no coinciden, o tu cuenta todavía no fue activada."
        }
      });

      accionMock.mockRejectedValueOnce(new Error("Network error"));
      const caido = await procesarEnvioLogin(
        "atleta@centris.app",
        "Centris123!",
        accionMock
      );
      expect(caido).toEqual({
        ok: false,
        errores: {
          general:
            "No pudimos iniciar sesión en este momento. Intentá nuevamente en unos segundos."
        }
      });

      accionMock.mockResolvedValueOnce({ ok: true, destino: "/seleccionar-box" });
      const exitoso = await procesarEnvioLogin(
        "  atleta@centris.app ",
        "Centris123!",
        accionMock
      );
      expect(accionMock).toHaveBeenLastCalledWith(
        "atleta@centris.app",
        "Centris123!"
      );
      expect(exitoso).toEqual({ ok: true, destino: "/seleccionar-box" });
    });
  });

  describe("Render accesible y tokens Dark Bento Cockpit", () => {
    it("preserva los labels/controles E2E, usa Sentence case sin font-display/uppercase y enlaza a /activar-cuenta", () => {
      const html = renderToStaticMarkup(createElement(LoginPage));

      expect(html).toContain("Centris");
      expect(html).toContain("Acceso unificado a tus Boxes");
      expect(html).toContain("Iniciar sesión");
      expect(html).toContain('for="login-email"');
      expect(html).toContain("Correo electrónico");
      expect(html).toContain('for="login-password"');
      expect(html).toContain("Contraseña");
      expect(html).toContain('aria-label="Mostrar clave"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('href="/activar-cuenta"');
      expect(html).toContain("Activar mi cuenta");

      // Tokens Dark Bento Cockpit y reglas tipográficas
      expect(html).toContain("rounded-3xl");
      expect(html).toContain("bg-card");
      expect(html).toContain("border-border");
      expect(html).toContain("text-base");
      expect(html).toContain("min-h-11");
      expect(html).toContain("rounded-full");
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-primary-foreground");

      // Sin deuda v1 ni copy técnico de arquitectura
      expect(html).not.toContain("font-display");
      expect(html).not.toContain("uppercase");
      expect(html).not.toContain("Identidad Global");
      expect(html).not.toContain("usuario@centris.dev");
      expect(html).not.toContain("gimnasio");
    });

    it("aplica aria-invalid solo al campo con error y renderiza alerta accesible cuando hay error general", () => {
      const htmlErrorEmail = renderToStaticMarkup(
        createElement(LoginView, {
          erroresIniciales: {
            email: "Ingresá un correo electrónico válido."
          }
        })
      );

      expect(htmlErrorEmail).toContain('id="error-login-email"');
      expect(htmlErrorEmail).toContain("Ingresá un correo electrónico válido.");
      expect(htmlErrorEmail).toMatch(/id="login-email"[^>]*aria-invalid="true"/);
      expect(htmlErrorEmail).not.toMatch(
        /id="login-password"[^>]*aria-invalid="true"/
      );

      const htmlErrorGeneral = renderToStaticMarkup(
        createElement(LoginView, {
          erroresIniciales: {
            general:
              "El correo o la contraseña no coinciden. Verificá los datos e intentá nuevamente."
          }
        })
      );

      expect(htmlErrorGeneral).toContain('data-testid="alerta-error-auth"');
      expect(htmlErrorGeneral).toContain('role="alert"');
      expect(htmlErrorGeneral).toContain("El correo o la contraseña no coinciden");
      expect(htmlErrorGeneral).not.toContain("CREDENCIALES_INVALIDAS");
    });

    it("permite mostrar la contraseña como texto con aria-pressed=true en el toggle", () => {
      const htmlVisible = renderToStaticMarkup(
        createElement(LoginView, {
          mostrarContrasenaInicial: true
        })
      );

      expect(htmlVisible).toMatch(/id="login-password"[^>]*type="text"/);
      expect(htmlVisible).toContain('aria-label="Ocultar clave"');
      expect(htmlVisible).toContain('aria-pressed="true"');
    });
  });
});
