import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FilterChips } from "./filter-chips";
import { InlineConfirm, manejarTeclaInlineConfirm } from "./inline-confirm";
import { SideDrawer, manejarTeclaDrawer } from "./side-drawer";

describe("Módulos profundos de interacción Bento", () => {
  describe("InlineConfirm", () => {
    it("renderiza el botón disparador táctil sin usar confirm() ni alert()", () => {
      const html = renderToStaticMarkup(
        createElement(InlineConfirm, {
          triggerLabel: "Dar de baja",
          confirmMessage: "¿Confirmás dar de baja esta afiliación?",
          onConfirm: vi.fn()
        })
      );

      expect(html).toContain("Dar de baja");
      expect(html).toContain("min-h-11");
      expect(html).toContain("rounded-full");
      expect(html).not.toContain("Confirmar");
    });

    it("renderiza los controles de confirmación y cancelación en estado abierto", () => {
      const html = renderToStaticMarkup(
        createElement(InlineConfirm, {
          triggerLabel: "Dar de baja",
          confirmMessage: "¿Confirmás dar de baja esta afiliación?",
          confirmLabel: "Sí, dar de baja",
          cancelLabel: "Volver",
          defaultOpen: true,
          onConfirm: vi.fn()
        })
      );

      expect(html).toContain("¿Confirmás dar de baja esta afiliación?");
      expect(html).toContain("Sí, dar de baja");
      expect(html).toContain("Volver");
      expect(html).toContain('role="group"');
    });

    it("cancela la confirmación inline con Escape solo cuando no está pendiente", () => {
      const cancelSpy = vi.fn();

      manejarTeclaInlineConfirm("Escape", false, cancelSpy);
      expect(cancelSpy).toHaveBeenCalledTimes(1);

      manejarTeclaInlineConfirm("Escape", true, cancelSpy);
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("SideDrawer", () => {
    it("no renderiza contenido cuando open=false y expone diálogo modal accesible cuando open=true", () => {
      const closedHtml = renderToStaticMarkup(
        createElement(SideDrawer, {
          open: false,
          onClose: vi.fn(),
          title: "Inscriptos de la clase",
          children: "Contenido"
        })
      );
      expect(closedHtml).toBe("");

      const openHtml = renderToStaticMarkup(
        createElement(SideDrawer, {
          open: true,
          onClose: vi.fn(),
          title: "Inscriptos de la clase",
          description: "Lista de atletas confirmados",
          testId: "drawer-inscriptos",
          children: "Listado"
        })
      );

      expect(openHtml).toContain('role="dialog"');
      expect(openHtml).toContain('aria-modal="true"');
      expect(openHtml).toContain("Inscriptos de la clase");
      expect(openHtml).toContain("Lista de atletas confirmados");
      expect(openHtml).toContain('data-testid="drawer-inscriptos"');
      expect(openHtml).toContain('data-testid="drawer-backdrop"');
      expect(openHtml).toContain('aria-label="Cerrar panel"');
    });

    it("cierra el drawer al presionar Escape y no ante otras teclas", () => {
      const onClose = vi.fn();

      manejarTeclaDrawer("Enter", onClose);
      expect(onClose).not.toHaveBeenCalled();

      manejarTeclaDrawer("Escape", onClose);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("FilterChips", () => {
    it("renderiza grupo envolvente táctil con aria-pressed y contraste Black-on-Volt en opción activa", () => {
      const html = renderToStaticMarkup(
        createElement(FilterChips<"todos" | "morosos" | "aldia">, {
          ariaLabel: "Filtrar atletas",
          value: "morosos",
          onChange: vi.fn(),
          options: [
            { value: "todos", label: "Todos", count: 12 },
            { value: "morosos", label: "Morosos", count: 4 },
            { value: "aldia", label: "Al día", count: 8 }
          ]
        })
      );

      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Filtrar atletas"');
      expect(html).toContain("flex-wrap");
      expect(html).toContain("min-h-11");
      expect(html).toContain("rounded-full");
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain("bg-primary text-primary-foreground");
      expect(html).toContain("tabular-nums");
    });
  });
});
