import { describe, expect, it } from "vitest";
import {
  ActualizarAtletaSchema,
  AtletaSchema,
  CrearAtletaSchema,
  FiltroAtletasSchema
} from "../src/index.js";

describe("Seam 1 — Esquemas Zod y Contratos de Dominio de Atletas (@centris/shared)", () => {
  it("valida y normaliza datos para CrearAtletaSchema", () => {
    const inputValido = CrearAtletaSchema.safeParse({
      nombre: "  Lionel Messi  ",
      email: "  Leo.Messi@Inter.Miami  "
    });

    expect(inputValido.success).toBe(true);
    if (inputValido.success) {
      expect(inputValido.data.nombre).toBe("Lionel Messi");
      expect(inputValido.data.email).toBe("leo.messi@inter.miami");
    }

    const inputEmailInvalido = CrearAtletaSchema.safeParse({
      nombre: "Rodrigo De Paul",
      email: "not-an-email"
    });
    expect(inputEmailInvalido.success).toBe(false);

    const inputNombreVacio = CrearAtletaSchema.safeParse({
      nombre: "   ",
      email: "depaul@afa.com"
    });
    expect(inputNombreVacio.success).toBe(false);
  });

  it("valida ActualizarAtletaSchema permitiendo campos opcionales coherentes", () => {
    const updateNombre = ActualizarAtletaSchema.safeParse({
      nombre: "Lionel Andrés Messi"
    });
    expect(updateNombre.success).toBe(true);
    if (updateNombre.success) {
      expect(updateNombre.data.nombre).toBe("Lionel Andrés Messi");
    }

    const updateActivo = ActualizarAtletaSchema.safeParse({
      activo: false
    });
    expect(updateActivo.success).toBe(true);
    if (updateActivo.success) {
      expect(updateActivo.data.activo).toBe(false);
    }

    const updateInvalido = ActualizarAtletaSchema.safeParse({
      nombre: ""
    });
    expect(updateInvalido.success).toBe(false);
  });

  it("parsea FiltroAtletasSchema con valores por defecto y coercion", () => {
    const filtroVacio = FiltroAtletasSchema.safeParse({});
    expect(filtroVacio.success).toBe(true);
    if (filtroVacio.success) {
      expect(filtroVacio.data.buscar).toBeUndefined();
      expect(filtroVacio.data.soloActivos).toBe(true);
    }

    const filtroPersonalizado = FiltroAtletasSchema.safeParse({
      buscar: "  messi  ",
      soloActivos: "false"
    });
    expect(filtroPersonalizado.success).toBe(true);
    if (filtroPersonalizado.success) {
      expect(filtroPersonalizado.data.buscar).toBe("messi");
      expect(filtroPersonalizado.data.soloActivos).toBe(false);
    }
  });

  it("valida el esquema completo de Atleta", () => {
    const ahora = new Date().toISOString();
    const atletaValido = AtletaSchema.safeParse({
      id: "a0000000-0000-4000-8000-000000000001",
      afiliacionId: "a0000000-0000-4000-8000-000000000001",
      boxId: "b0000000-0000-4000-8000-000000000001",
      usuarioId: "c0000000-0000-4000-8000-000000000001",
      nombre: "Lionel Messi",
      email: "leo.messi@inter.miami",
      roles: ["atleta"],
      activo: true,
      passwordActivada: false,
      createdAt: ahora,
      updatedAt: ahora
    });

    expect(atletaValido.success).toBe(true);
  });
});
