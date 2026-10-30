import { Controller, Get } from "@nestjs/common";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  type Afiliacion,
  type AfiliacionConBox,
  type AfiliacionConUsuario,
  type Box,
  type SesionAuth
} from "@centris/shared";
import { Roles } from "../src/common/decorators/roles.decorator.js";
import { JwtTokenService } from "../src/modules/auth/jwt-token.service.js";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "a0000000-0000-4000-8000-000000000001",
  boxSur: "a0000000-0000-4000-8000-000000000002",
  usuarioAdmin: "b0000000-0000-4000-8000-000000000001",
  usuarioMulti: "b0000000-0000-4000-8000-000000000002",
  usuarioMostrador: "b0000000-0000-4000-8000-000000000003",
  usuarioSinAfiliacion: "b0000000-0000-4000-8000-000000000004",
  afiliacionAdminNorte: "c0000000-0000-4000-8000-000000000001",
  afiliacionMultiSur: "c0000000-0000-4000-8000-000000000002",
  afiliacionMultiNorte: "c0000000-0000-4000-8000-000000000003",
  afiliacionMostradorNorte: "c0000000-0000-4000-8000-000000000004"
} as const;

@Controller("prueba-roles")
class PruebaRolesController {
  @Get("coach")
  @Roles("coach")
  accionCoach(): { permitido: string } {
    return { permitido: "coach" };
  }

  @Get("recepcionista")
  @Roles("recepcionista")
  accionRecepcionista(): { permitido: string } {
    return { permitido: "recepcionista" };
  }

  @Get("administrador")
  @Roles("administrador")
  accionAdministrador(): { permitido: string } {
    return { permitido: "administrador" };
  }
}

describe("Seam 2 — API HTTP + PostgreSQL RLS: Auth JWT, Selector de Box, 4 Roles Componibles y Configuración", () => {
  let api: ApiDePrueba;
  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Test" },
      { id: IDS.boxSur, nombre: "Box Sur Test" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdmin,
        email: "admin.t02@test.centris.dev",
        nombre: "Admin Test",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioMulti,
        email: "multi.t02@test.centris.dev",
        nombre: "Multi Rol Test",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioMostrador,
        email: "mostrador.t02@test.centris.dev",
        nombre: "Atleta Mostrador",
        contrasena: null
      },
      {
        id: IDS.usuarioSinAfiliacion,
        email: "huertano.t02@test.centris.dev",
        nombre: "Sin Afiliacion",
        contrasena: null
      }
    ],
    afiliaciones: [
      {
        id: IDS.afiliacionAdminNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAdmin,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionMultiNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioMulti,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionMultiSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioMulti,
        roles: ["coach", "recepcionista"]
      },
      {
        id: IDS.afiliacionMostradorNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioMostrador,
        roles: ["atleta"]
      }
    ]
  });

  beforeAll(async () => {
    await datos.sembrar();
    api = await levantarApiDePrueba([PruebaRolesController]);
  });

  afterAll(async () => {
    await api?.cerrar();
    await datos.cerrar();
  });

  it("Criterio 1: emite JWT en login, rechaza peticiones sin Bearer token válido y activa por única vez una cuenta creada en mostrador (password_hash IS NULL)", async () => {
    // 1. Login inválido devuelve 401 CREDENCIALES_INVALIDAS
    const loginFallido = await api.pedir("/auth/login", {
      method: "POST",
      body: {
        email: "admin.t02@test.centris.dev",
        password: "PasswordIncorrecta99!"
      }
    });
    expect(loginFallido.status).toBe(401);
    expect(loginFallido.body.errorCode).toBe(ERROR_CODES.CREDENCIALES_INVALIDAS);

    // 2. Petición autenticada sin token o con token adulterado devuelve 401 NO_AUTENTICADO
    const sinToken = await api.pedir("/afiliaciones/mias");
    expect(sinToken.status).toBe(401);
    expect(sinToken.body.errorCode).toBe(ERROR_CODES.NO_AUTENTICADO);

    const tokenInvalido = await api.pedir("/afiliaciones/mias", {
      token: "token.adulterado.invalido"
    });
    expect(tokenInvalido.status).toBe(401);
    expect(tokenInvalido.body.errorCode).toBe(ERROR_CODES.NO_AUTENTICADO);

    // 3. Usuario creado en mostrador (password_hash IS NULL) no puede hacer login antes de activar
    const loginSinActivar = await api.pedir("/auth/login", {
      method: "POST",
      body: {
        email: "mostrador.t02@test.centris.dev",
        password: "NuevaPassword123!"
      }
    });
    expect(loginSinActivar.status).toBe(401);
    expect(loginSinActivar.body.errorCode).toBe(
      ERROR_CODES.CREDENCIALES_INVALIDAS
    );

    // 4. Usuario sin Afiliación activa no puede activar cuenta
    const activacionSinAfiliacion = await api.pedir("/auth/activar-cuenta", {
      method: "POST",
      body: {
        email: "huertano.t02@test.centris.dev",
        password: "NuevaPassword123!"
      }
    });
    expect(activacionSinAfiliacion.status).toBe(401);
    expect(activacionSinAfiliacion.body.errorCode).toBe(
      ERROR_CODES.CREDENCIALES_INVALIDAS
    );

    // 5. Activación de primer ingreso define password_hash y devuelve sesión JWT válida
    const activacionExitosa = await api.pedir<SesionAuth>(
      "/auth/activar-cuenta",
      {
        method: "POST",
        body: {
          email: "mostrador.t02@test.centris.dev",
          password: "NuevaPassword123!"
        }
      }
    );
    expect(activacionExitosa.status).toBe(200);
    expect(activacionExitosa.body.usuario.id).toBe(IDS.usuarioMostrador);
    expect(activacionExitosa.body.usuario.passwordActivada).toBe(true);
    expect(typeof activacionExitosa.body.accessToken).toBe("string");

    // 6. Cualquier intento posterior de usar el flujo de activación queda rechazado con 409 CUENTA_YA_ACTIVADA
    const reintentoActivacion = await api.pedir("/auth/activar-cuenta", {
      method: "POST",
      body: {
        email: "mostrador.t02@test.centris.dev",
        password: "OtraPassword999!"
      }
    });
    expect(reintentoActivacion.status).toBe(409);
    expect(reintentoActivacion.body.errorCode).toBe(
      ERROR_CODES.CUENTA_YA_ACTIVADA
    );

    // 7. Ahora puede iniciar sesión normalmente con la contraseña recién activada
    const loginPostActivacion = await api.pedir<SesionAuth>("/auth/login", {
      method: "POST",
      body: {
        email: "mostrador.t02@test.centris.dev",
        password: "NuevaPassword123!"
      }
    });
    expect(loginPostActivacion.status).toBe(200);
    expect(loginPostActivacion.body.accessToken).toBeTruthy();
  });

  it("Criterios 2 y 3: lista las Afiliaciones del Usuario bajo RLS (app.usuario_id) y aplica la unión de los 4 roles atómicos al cambiar de Box sin re-autenticarse", async () => {
    const loginMulti = await api.pedir<SesionAuth>("/auth/login", {
      method: "POST",
      body: {
        email: "multi.t02@test.centris.dev",
        password: "PasswordSegura123!"
      }
    });
    expect(loginMulti.status).toBe(200);
    const tokenMulti = loginMulti.body.accessToken;

    // Consulta sus Afiliaciones bajo SET LOCAL app.usuario_id (sin ver las de usuarioAdmin)
    const mias = await api.pedir<AfiliacionConBox[]>("/afiliaciones/mias", {
      token: tokenMulti
    });
    expect(mias.status).toBe(200);
    expect(mias.body).toHaveLength(2);
    expect(
      mias.body.map((a) => ({
        boxId: a.boxId,
        roles: a.roles
      }))
    ).toEqual([
      { boxId: IDS.boxNorte, roles: ["atleta"] },
      { boxId: IDS.boxSur, roles: ["coach", "recepcionista"] }
    ]);

    // Sin header X-Box-Id en ruta operativa de Box devuelve 400 BOX_NO_SELECCIONADO
    const sinBox = await api.pedir("/prueba-roles/coach", {
      token: tokenMulti
    });
    expect(sinBox.status).toBe(400);
    expect(sinBox.body.errorCode).toBe(ERROR_CODES.BOX_NO_SELECCIONADO);

    // En Box Sur tiene ['coach', 'recepcionista']: habilita la unión de Coach y Recepcionista, pero 403 en Administrador
    const accionCoachSur = await api.pedir("/prueba-roles/coach", {
      token: tokenMulti,
      boxId: IDS.boxSur
    });
    expect(accionCoachSur.status).toBe(200);
    expect(accionCoachSur.body).toEqual({ permitido: "coach" });

    const accionRecepcionSur = await api.pedir("/prueba-roles/recepcionista", {
      token: tokenMulti,
      boxId: IDS.boxSur
    });
    expect(accionRecepcionSur.status).toBe(200);
    expect(accionRecepcionSur.body).toEqual({ permitido: "recepcionista" });

    const accionAdminSur = await api.pedir("/prueba-roles/administrador", {
      token: tokenMulti,
      boxId: IDS.boxSur
    });
    expect(accionAdminSur.status).toBe(403);
    expect(accionAdminSur.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // Cambia de Box activo a Box Norte sin volver a autenticarse (mismo JWT): allí solo es ['atleta']
    const accionCoachNorte = await api.pedir("/prueba-roles/coach", {
      token: tokenMulti,
      boxId: IDS.boxNorte
    });
    expect(accionCoachNorte.status).toBe(403);
    expect(accionCoachNorte.body.errorCode).toBe(
      ERROR_CODES.ACCESO_DENEGADO_ROL
    );
  });

  it("Criterio 4: permite al Administrador actualizar la configuración de su Box validada con Zod y devuelve 403 Forbidden a Recepcionista, Coach o Atleta", async () => {
    const loginAdmin = await api.pedir<SesionAuth>("/auth/login", {
      method: "POST",
      body: {
        email: "admin.t02@test.centris.dev",
        password: "PasswordSegura123!"
      }
    });
    const tokenAdmin = loginAdmin.body.accessToken;

    const loginMulti = await api.pedir<SesionAuth>("/auth/login", {
      method: "POST",
      body: {
        email: "multi.t02@test.centris.dev",
        password: "PasswordSegura123!"
      }
    });
    const tokenMulti = loginMulti.body.accessToken;

    // 1. Un usuario con ['coach', 'recepcionista'] en Box Sur o ['atleta'] en Box Norte recibe 403 al intentar PUT /boxes/configuracion
    const intentoNoAdmin = await api.pedir("/boxes/configuracion", {
      method: "PUT",
      token: tokenMulti,
      boxId: IDS.boxSur,
      body: {
        timezone: "America/Montevideo",
        moneda: "UYU",
        anticipacionReservaDias: 10,
        ventanaCancelacionMinutos: 90
      }
    });
    expect(intentoNoAdmin.status).toBe(403);
    expect(intentoNoAdmin.body.errorCode).toBe(ERROR_CODES.ACCESO_DENEGADO_ROL);

    // 2. Validación Zod en servidor rechaza timezone IANA inválida o moneda no ISO con 400 VALIDACION_FALLIDA
    const timezoneInvalida = await api.pedir("/boxes/configuracion", {
      method: "PUT",
      token: tokenAdmin,
      boxId: IDS.boxNorte,
      body: {
        timezone: "Zona/Falsa_999",
        moneda: "ARS",
        anticipacionReservaDias: 7,
        ventanaCancelacionMinutos: 120
      }
    });
    expect(timezoneInvalida.status).toBe(400);
    expect(timezoneInvalida.body.errorCode).toBe(
      ERROR_CODES.VALIDACION_FALLIDA
    );

    // 3. El Administrador actualiza la configuración de Box Norte y se persiste en la tabla boxes
    const actualizacionOk = await api.pedir<Box>("/boxes/configuracion", {
      method: "PUT",
      token: tokenAdmin,
      boxId: IDS.boxNorte,
      body: {
        timezone: "America/Santiago",
        moneda: "CLP",
        anticipacionReservaDias: 14,
        ventanaCancelacionMinutos: 180
      }
    });
    expect(actualizacionOk.status).toBe(200);
    expect(actualizacionOk.body).toMatchObject({
      id: IDS.boxNorte,
      timezone: "America/Santiago",
      moneda: "CLP",
      anticipacionReservaDias: 14,
      ventanaCancelacionMinutos: 180
    });

    const lecturaConfig = await api.pedir<Box>("/boxes/configuracion", {
      token: tokenAdmin,
      boxId: IDS.boxNorte
    });
    expect(lecturaConfig.status).toBe(200);
    expect(lecturaConfig.body.timezone).toBe("America/Santiago");
    expect(lecturaConfig.body.moneda).toBe("CLP");
  });

  it("Criterio 5: permite al Administrador gestionar roles y aplicar Soft Delete a Afiliaciones de su Box con efecto inmediato sin afectar otros Boxes, protegiendo al último Administrador", async () => {
    const loginAdmin = await api.pedir<SesionAuth>("/auth/login", {
      method: "POST",
      body: {
        email: "admin.t02@test.centris.dev",
        password: "PasswordSegura123!"
      }
    });
    const tokenAdmin = loginAdmin.body.accessToken;

    const loginMulti = await api.pedir<SesionAuth>("/auth/login", {
      method: "POST",
      body: {
        email: "multi.t02@test.centris.dev",
        password: "PasswordSegura123!"
      }
    });
    const tokenMulti = loginMulti.body.accessToken;

    // 1. El Administrador de Box Norte lista las Afiliaciones de su Box (aisladas por RLS)
    const listado = await api.pedir<AfiliacionConUsuario[]>("/afiliaciones", {
      token: tokenAdmin,
      boxId: IDS.boxNorte
    });
    expect(listado.status).toBe(200);
    expect(listado.body.every((a) => a.boxId === IDS.boxNorte)).toBe(true);

    // 2. Protección del último Administrador: no puede quitarse el rol de administrador ni hacerse soft delete si es el único en Box Norte
    const quitarUltimoAdmin = await api.pedir(
      `/afiliaciones/${IDS.afiliacionAdminNorte}`,
      {
        method: "PATCH",
        token: tokenAdmin,
        boxId: IDS.boxNorte,
        body: { roles: ["coach"] }
      }
    );
    expect(quitarUltimoAdmin.status).toBe(409);
    expect(quitarUltimoAdmin.body.errorCode).toBe(
      ERROR_CODES.ULTIMO_ADMINISTRADOR
    );

    const borrarUltimoAdmin = await api.pedir(
      `/afiliaciones/${IDS.afiliacionAdminNorte}`,
      {
        method: "DELETE",
        token: tokenAdmin,
        boxId: IDS.boxNorte
      }
    );
    expect(borrarUltimoAdmin.status).toBe(409);
    expect(borrarUltimoAdmin.body.errorCode).toBe(
      ERROR_CODES.ULTIMO_ADMINISTRADOR
    );

    // 3. El Administrador asigna ['coach', 'atleta'] a usuarioMulti en Box Norte: el permiso se habilita de inmediato sin re-login
    const promoverCoachNorte = await api.pedir<Afiliacion>(
      `/afiliaciones/${IDS.afiliacionMultiNorte}`,
      {
        method: "PATCH",
        token: tokenAdmin,
        boxId: IDS.boxNorte,
        body: { roles: ["coach", "atleta"] }
      }
    );
    expect(promoverCoachNorte.status).toBe(200);
    expect(promoverCoachNorte.body.roles).toEqual(["coach", "atleta"]);

    const accionCoachNorte = await api.pedir("/prueba-roles/coach", {
      token: tokenMulti,
      boxId: IDS.boxNorte
    });
    expect(accionCoachNorte.status).toBe(200);

    // 4. El Administrador aplica Soft Delete a la Afiliación de usuarioMulti en Box Norte:
    // pierde acceso inmediato en Box Norte, pero conserva intacta su Afiliación ['coach', 'recepcionista'] en Box Sur
    const bajaMultiNorte = await api.pedir(
      `/afiliaciones/${IDS.afiliacionMultiNorte}`,
      {
        method: "DELETE",
        token: tokenAdmin,
        boxId: IDS.boxNorte
      }
    );
    expect(bajaMultiNorte.status).toBe(200);

    const accesoRevocadoNorte = await api.pedir("/prueba-roles/coach", {
      token: tokenMulti,
      boxId: IDS.boxNorte
    });
    expect(accesoRevocadoNorte.status).toBe(403);
    expect(accesoRevocadoNorte.body.errorCode).toBe(
      ERROR_CODES.ACCESO_DENEGADO_ROL
    );

    const accesoIntactoSur = await api.pedir("/prueba-roles/recepcionista", {
      token: tokenMulti,
      boxId: IDS.boxSur
    });
    expect(accesoIntactoSur.status).toBe(200);

    // Verificar en base de datos que deleted_at quedó poblado en Box Norte y NULL en Box Sur
    const filasBd = await datos.consultar<{
      id: string;
      deleted_at: Date | null;
    }>(`SELECT id, deleted_at FROM afiliaciones WHERE id IN ($1, $2)`, [
      IDS.afiliacionMultiNorte,
      IDS.afiliacionMultiSur
    ]);
    const filaNorte = filasBd.find((f) => f.id === IDS.afiliacionMultiNorte);
    const filaSur = filasBd.find((f) => f.id === IDS.afiliacionMultiSur);
    expect(filaNorte?.deleted_at).not.toBeNull();
    expect(filaSur?.deleted_at).toBeNull();
  });

  it("Seguridad JWT: rechaza tokens expirados con 401 NO_AUTENTICADO y exige AUTH_SECRET sin usar secretos por defecto", async () => {
    const jwtService = new JwtTokenService();
    const secretoActual = process.env.AUTH_SECRET;
    expect(secretoActual).toBeTruthy();

    // 1. Un JWT firmado con la clave válida pero ya expirado (exp en el pasado) es rechazado con 401 NO_AUTENTICADO
    const clave = new TextEncoder().encode(secretoActual);
    const ahoraSegundos = Math.floor(Date.now() / 1000);
    const tokenExpirado = await new SignJWT({
      email: "admin.t02@test.centris.dev",
      nombre: "Admin Test"
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(IDS.usuarioAdmin)
      .setIssuedAt(ahoraSegundos - 7200)
      .setExpirationTime(ahoraSegundos - 3600)
      .sign(clave);

    const respuestaExpirado = await api.pedir("/afiliaciones/mias", {
      token: tokenExpirado
    });
    expect(respuestaExpirado.status).toBe(401);
    expect(respuestaExpirado.body.errorCode).toBe(ERROR_CODES.NO_AUTENTICADO);

    // 2. Si AUTH_SECRET no está definido, JwtTokenService falla explícitamente sin recurrir a un secreto hardcodeado
    try {
      delete process.env.AUTH_SECRET;
      await expect(
        jwtService.firmarTokenUsuario({
          id: IDS.usuarioAdmin,
          email: "admin.t02@test.centris.dev",
          nombre: "Admin Test"
        })
      ).rejects.toThrow(/Variable de entorno obligatoria no definida: AUTH_SECRET/);
    } finally {
      process.env.AUTH_SECRET = secretoActual;
    }
  });
});
