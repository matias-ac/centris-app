import { describe, expect, it } from "vitest";
import {
  AfiliacionSchema,
  BoxSchema,
  ERROR_CODES,
  ErrorResponseSchema,
  EstadoSaludSchema,
  ROLES_AFILIACION,
  RolAfiliacionSchema,
  UsuarioSchema
} from "../src/index.js";

describe("Seam 1 — Contratos de dominio en @centris/shared", () => {
  it("expone exactamente los 4 roles atómicos componibles del glosario", () => {
    expect(ROLES_AFILIACION).toEqual([
      "administrador",
      "recepcionista",
      "coach",
      "atleta"
    ]);
    expect(RolAfiliacionSchema.safeParse("administrador").success).toBe(true);
    expect(RolAfiliacionSchema.safeParse("owner").success).toBe(false);
  });

  it("valida una Afiliación con composición de roles y rechaza roles vacíos o inválidos", () => {
    const valida = AfiliacionSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      boxId: "22222222-2222-4222-8222-222222222222",
      usuarioId: "33333333-3333-4333-8333-333333333333",
      roles: ["coach", "recepcionista"],
      activo: true
    });
    expect(valida.success).toBe(true);

    const sinRoles = AfiliacionSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      boxId: "22222222-2222-4222-8222-222222222222",
      usuarioId: "33333333-3333-4333-8333-333333333333",
      roles: [],
      activo: true
    });
    expect(sinRoles.success).toBe(false);
  });

  it("valida Box, Usuario (con passwordHash nullable) y contrato estándar de errores HTTP", () => {
    const box = BoxSchema.safeParse({
      id: "22222222-2222-4222-8222-222222222222",
      nombre: "Box Centris Norte",
      slug: "centris-norte",
      timezone: "America/Argentina/Buenos_Aires",
      moneda: "ARS",
      anticipacionReservaDias: 7,
      ventanaCancelacionMinutos: 120
    });
    expect(box.success).toBe(true);

    const usuarioMostrador = UsuarioSchema.safeParse({
      id: "33333333-3333-4333-8333-333333333333",
      email: "atleta.nuevo@centris.dev",
      nombre: "Camila Díaz",
      passwordActivada: false
    });
    expect(usuarioMostrador.success).toBe(true);

    const errorHttp = ErrorResponseSchema.safeParse({
      statusCode: 400,
      errorCode: ERROR_CODES.BOX_NO_SELECCIONADO,
      message: "Se requiere un Box activo para esta operación.",
      details: null
    });
    expect(errorHttp.success).toBe(true);

    const salud = EstadoSaludSchema.safeParse({
      estado: "ok",
      baseDeDatos: "conectada",
      rolConexion: "centris_app_user",
      rlsActivo: true,
      bypassRls: false,
      afiliacionesVisiblesEnContexto: 2
    });
    expect(salud.success).toBe(true);
  });
});
