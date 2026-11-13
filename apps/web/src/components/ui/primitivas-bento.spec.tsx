import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Select } from "./select";
import { Textarea } from "./textarea";

describe("Primitivas Bento Centris v2", () => {
  it("Button cumple altura táctil min-h-11, forma rounded-full y variantes v2", () => {
    const primaryHtml = renderToStaticMarkup(
      createElement(Button, { variant: "primary" }, "Registrar pago")
    );
    expect(primaryHtml).toContain("min-h-11");
    expect(primaryHtml).toContain("rounded-full");
    expect(primaryHtml).toContain("bg-primary");
    expect(primaryHtml).toContain("text-primary-foreground");

    const defaultHtml = renderToStaticMarkup(
      createElement(Button, { variant: "default" }, "Guardar")
    );
    expect(defaultHtml).toContain("bg-primary");

    const secondaryHtml = renderToStaticMarkup(
      createElement(Button, { variant: "secondary" }, "Cancelar")
    );
    expect(secondaryHtml).toContain("bg-secondary");
    expect(secondaryHtml).toContain("border-border");

    const destructiveHtml = renderToStaticMarkup(
      createElement(Button, { variant: "destructive" }, "Anular")
    );
    expect(destructiveHtml).toContain("text-[#FF6D6D]");

    const ghostHtml = renderToStaticMarkup(
      createElement(Button, { variant: "ghost" }, "Volver")
    );
    expect(ghostHtml).toContain("bg-transparent");

    const iconHtml = renderToStaticMarkup(
      createElement(
        Button,
        { variant: "iconCircle", "aria-label": "Abrir" },
        "↗"
      )
    );
    expect(iconHtml).toContain("rounded-full");
    expect(iconHtml).toContain("h-11");
    expect(iconHtml).toContain("w-11");
  });

  it("Badge soporta mint, amber, coral, zinc y volt en Sentence case (sin uppercase)", () => {
    const mintHtml = renderToStaticMarkup(
      createElement(Badge, { variant: "mint" }, "Confirmada")
    );
    expect(mintHtml).toContain("rounded-full");
    expect(mintHtml).toContain("text-[#18FFC8]");
    expect(mintHtml).not.toContain("uppercase");

    const amberHtml = renderToStaticMarkup(
      createElement(Badge, { variant: "amber" }, "Últimos cupos")
    );
    expect(amberHtml).toContain("text-[#FBBF24]");

    const coralHtml = renderToStaticMarkup(
      createElement(Badge, { variant: "coral" }, "Moroso")
    );
    expect(coralHtml).toContain("text-[#FF6D6D]");

    const zincHtml = renderToStaticMarkup(
      createElement(Badge, { variant: "zinc" }, "Cancelada")
    );
    expect(zincHtml).toContain("text-[#A1A1AA]");

    const voltHtml = renderToStaticMarkup(
      createElement(Badge, { variant: "volt" }, "Destacado")
    );
    expect(voltHtml).toContain("bg-primary");
    expect(voltHtml).toContain("text-primary-foreground");
  });

  it("Card aplica superficie Dark Bento rounded-3xl y borde hairline sin font-display", () => {
    const html = renderToStaticMarkup(
      createElement(
        Card,
        null,
        createElement(
          CardHeader,
          null,
          createElement(CardTitle, null, "Ocupación semanal")
        ),
        createElement(CardContent, null, "Contenido")
      )
    );

    expect(html).toContain("rounded-3xl");
    expect(html).toContain("border-border");
    expect(html).toContain("bg-card");
    expect(html).not.toContain("font-display");
  });

  it("Input, Label, Select y Textarea mantienen fuente >= 16px (text-base), rounded-xl y min-h-11", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(Label, { htmlFor: "campo-test" }, "Plan"),
        createElement(Input, { id: "campo-test", placeholder: "Nombre" }),
        createElement(
          Select,
          { id: "select-test", defaultValue: "ars" },
          createElement("option", { value: "ars" }, "ARS")
        ),
        createElement(Textarea, { id: "textarea-test", placeholder: "Detalle" })
      )
    );

    expect(html).toContain('for="campo-test"');
    expect(html).toContain("rounded-xl");
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-h-[88px]");
    expect(html).toContain("text-base");
    expect(html).toContain("<select");
    expect(html).toContain("<textarea");
    expect(html).toContain("ARS");
  });
});
