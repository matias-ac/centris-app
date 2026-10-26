import { describe, expect, it } from "vitest";
import {
  ActualizarConfiguracionBoxSchema,
  ActualizarRolesAfiliacionSchema,
  ActivarCuentaSchema,
  AfiliacionSchema,
  BoxSchema,
  ERROR_CODES,
  ErrorResponseSchema,
  EstadoSaludSchema,
  LoginSchema,
  ROLES_AFILIACION,
  RolAfiliacionSchema,
  UsuarioSchema,
  tieneAlgunRol
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

  it("evalúa la composición de los 4 roles atómicos como unión de capacidades (tieneAlgunRol)", () => {
    const rolesMulti = ["coach", "recepcionista"] as const;
    expect(tieneAlgunRol(rolesMulti, ["coach"])).toBe(true);
    expect(tieneAlgunRol(rolesMulti, ["recepcionista"])).toBe(true);
    expect(tieneAlgunRol(rolesMulti, ["administrador", "recepcionista"])).toBe(
      true
    );
    expect(tieneAlgunRol(rolesMulti, ["administrador"])).toBe(false);
  });

  it("valida configuración de Box exigiendo timezone IANA real, moneda ISO de 3 letras y rangos operativos", () => {
    const valida = ActualizarConfiguracionBoxSchema.safeParse({
      timezone: "America/Argentina/Buenos_Aires",
      moneda: "ARS",
      anticipacionReservaDias: 10,
      ventanaCancelacionMinutos: 90
    });
    expect(valida.success).toBe(true);

    const timezoneInvalida = ActualizarConfiguracionBoxSchema.safeParse({
      timezone: "Zona/Inexistente_123",
      moneda: "ARS",
      anticipacionReservaDias: 7,
      ventanaCancelacionMinutos: 120
    });
    expect(timezoneInvalida.success).toBe(false);

    const monedaInvalida = ActualizarConfiguracionBoxSchema.safeParse({
      timezone: "America/Argentina/Buenos_Aires",
      moneda: "pesos",
      anticipacionReservaDias: 7,
      ventanaCancelacionMinutos: 120
    });
    expect(monedaInvalida.success).toBe(false);

    const anticipacionInvalida = ActualizarConfiguracionBoxSchema.safeParse({
      timezone: "America/Argentina/Buenos_Aires",
      moneda: "USD",
      anticipacionReservaDias: 0,
      ventanaCancelacionMinutos: -5
    });
    expect(anticipacionInvalida.success).toBe(false);
  });

  it("valida esquemas de autenticación, activación de cuenta y actualización de roles de Afiliación", () => {
    expect(
      LoginSchema.safeParse({
        email: "admin@centris.dev",
        password: "Centris123!"
      }).success
    ).toBe(true);

    expect(
      ActivarCuentaSchema.safeParse({
        email: "atleta.nuevo@centris.dev",
        password: "corta"
      }).success
    ).toBe(false);

    expect(
      ActualizarRolesAfiliacionSchema.safeParse({
        roles: ["coach", "recepcionista"]
      }).success
    ).toBe(true);

    expect(
      ActualizarRolesAfiliacionSchema.safeParse({
        roles: []
      }).success
    ).toBe(false);
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

