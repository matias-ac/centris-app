import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Atleta } from "@centris/shared";
import { DatabaseService } from "../src/database/database.service.js";
import { afiliaciones, usuarios } from "../src/database/schema/index.js";
import { and, eq, isNull } from "drizzle-orm";
import {
  type ApiDePrueba,
  levantarApiDePrueba
} from "./support/api-de-prueba.js";
import { DatosDePrueba } from "./support/datos-de-prueba.js";

const IDS = {
  boxNorte: "c0000000-0000-4000-8000-000000000001",
  boxSur: "c0000000-0000-4000-8000-000000000002",
  usuarioAdminNorte: "c1000000-0000-4000-8000-000000000001",
  usuarioRecepNorte: "c1000000-0000-4000-8000-000000000002",
  usuarioCoachNorte: "c1000000-0000-4000-8000-000000000003",
  usuarioAtletaNorte: "c1000000-0000-4000-8000-000000000004",
  usuarioAdminSur: "c1000000-0000-4000-8000-000000000005",
  usuarioAtletaSur: "c1000000-0000-4000-8000-000000000006",
  afiliacionAdminNorte: "c2000000-0000-4000-8000-000000000001",
  afiliacionRecepNorte: "c2000000-0000-4000-8000-000000000002",
  afiliacionCoachNorte: "c2000000-0000-4000-8000-000000000003",
  afiliacionAtletaNorte: "c2000000-0000-4000-8000-000000000004",
  afiliacionAdminSur: "c2000000-0000-4000-8000-000000000005",
  afiliacionAtletaSur: "c2000000-0000-4000-8000-000000000006"
} as const;

describe("Seam 2 — Directorio y Alta de Atletas: API NestJS y Persistencia RLS", () => {
  let api: ApiDePrueba;
  let db: DatabaseService;
  let tokenAdminNorte: string;
  let tokenRecepNorte: string;
  let tokenCoachNorte: string;
  let tokenAtletaNorte: string;
  let tokenAdminSur: string;

  const datos = new DatosDePrueba({
    boxes: [
      { id: IDS.boxNorte, nombre: "Box Norte Atletas" },
      { id: IDS.boxSur, nombre: "Box Sur Atletas" }
    ],
    usuarios: [
      {
        id: IDS.usuarioAdminNorte,
        email: "admin.atletas@test.centris.dev",
        nombre: "Admin Norte Atletas",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioRecepNorte,
        email: "recep.atletas@test.centris.dev",
        nombre: "Recep Norte Atletas",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioCoachNorte,
        email: "coach.atletas@test.centris.dev",
        nombre: "Coach Norte Atletas",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAtletaNorte,
        email: "atleta.existente@test.centris.dev",
        nombre: "Atleta Inicial Norte",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAdminSur,
        email: "admin.sur.atletas@test.centris.dev",
        nombre: "Admin Sur Atletas",
        contrasena: "PasswordSegura123!"
      },
      {
        id: IDS.usuarioAtletaSur,
        email: "atleta.sur@test.centris.dev",
        nombre: "Atleta Solo Sur",
        contrasena: "PasswordSegura123!"
      }
    ],
    afiliaciones: [
      {
        id: IDS.afiliacionAdminNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAdminNorte,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionRecepNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioRecepNorte,
        roles: ["recepcionista"]
      },
      {
        id: IDS.afiliacionCoachNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioCoachNorte,
        roles: ["coach"]
      },
      {
        id: IDS.afiliacionAtletaNorte,
        boxId: IDS.boxNorte,
        usuarioId: IDS.usuarioAtletaNorte,
        roles: ["atleta"]
      },
      {
        id: IDS.afiliacionAdminSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioAdminSur,
        roles: ["administrador"]
      },
      {
        id: IDS.afiliacionAtletaSur,
        boxId: IDS.boxSur,
        usuarioId: IDS.usuarioAtletaSur,
        roles: ["atleta"]
      }
    ]
  });

  beforeAll(async () => {
    db = new DatabaseService();
    await datos.sembrar();
    api = await levantarApiDePrueba();

    async function login(email: string): Promise<string> {
      const resp = await api.pedir<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password: "PasswordSegura123!" }
      });
      return resp.body.accessToken;
    }

    tokenAdminNorte = await login("admin.atletas@test.centris.dev");
    tokenRecepNorte = await login("recep.atletas@test.centris.dev");
    tokenCoachNorte = await login("coach.atletas@test.centris.dev");
    tokenAtletaNorte = await login("atleta.existente@test.centris.dev");
    tokenAdminSur = await login("admin.sur.atletas@test.centris.dev");
  });

  afterAll(async () => {
    await api?.cerrar();
    await datos.cerrar();
  });

  it("Criterio 1: Alta de Atleta nuevo crea Usuario con password_hash = NULL y Afiliación con roles=['atleta']", async () => {
    const nuevoAtletaEmail = "nuevo.atleta@centris.test";
    const res = await api.pedir<Atleta>("/atletas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Nuevo Atleta Sin Clave",
        email: nuevoAtletaEmail
      }
    });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Nuevo Atleta Sin Clave");
    expect(res.body.email).toBe(nuevoAtletaEmail);
    expect(res.body.roles).toEqual(["atleta"]);
    expect(res.body.passwordActivada).toBe(false);
    expect(res.body.activo).toBe(true);

    // Verificar en DB que el password_hash es efectivamente NULL
    const usuarioDb = await db.client
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, nuevoAtletaEmail));

    expect(usuarioDb).toHaveLength(1);
    expect(usuarioDb[0]!.passwordHash).toBeNull();
  });

  it("Criterio 1 bis: Alta de Atleta con email existente en otro Box vincula transparentemente sin tocar password_hash", async () => {
    // El usuario de Box Sur existe y tiene password hash
    const res = await api.pedir<Atleta>("/atletas", {
      method: "POST",
      token: tokenAdminNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Atleta Solo Sur",
        email: "atleta.sur@test.centris.dev"
      }
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("atleta.sur@test.centris.dev");
    expect(res.body.roles).toEqual(["atleta"]);
    expect(res.body.passwordActivada).toBe(true); // Ya tiene contraseña

    // Verificar en DB que no se duplicó el usuario y conserva su contraseña
    const usuarioDb = await db.client
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, "atleta.sur@test.centris.dev"));

    expect(usuarioDb).toHaveLength(1);
    expect(usuarioDb[0]!.passwordHash).not.toBeNull();
  });

  it("Criterio 2: Si el Usuario ya es Coach en el mismo Box, se agrega 'atleta' a su Afiliación existente sin duplicar fila", async () => {
    const res = await api.pedir<Atleta>("/atletas", {
      method: "POST",
      token: tokenRecepNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Coach Norte Atletas",
        email: "coach.atletas@test.centris.dev"
      }
    });

    expect(res.status).toBe(201);
    expect(res.body.roles).toContain("coach");
    expect(res.body.roles).toContain("atleta");

    // Verificar en DB que la fila de afiliación para (box_id, usuario_id) es única
    await db.withBoxTransaction(IDS.boxNorte, async (tx) => {
      const afils = await tx
        .select()
        .from(afiliaciones)
        .where(
          and(
            eq(afiliaciones.usuarioId, IDS.usuarioCoachNorte),
            isNull(afiliaciones.deletedAt)
          )
        );

      expect(afils).toHaveLength(1);
      expect(afils[0]!.roles).toEqual(
        expect.arrayContaining(["coach", "atleta"])
      );
    });
  });

  it("Criterio 3: Buscador, ficha, edición y Soft Delete bajo RLS", async () => {
    // 1. Listar atletas en Box Norte
    const resListado = await api.pedir<Atleta[]>("/atletas", {
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(resListado.status).toBe(200);
    expect(resListado.body.length).toBeGreaterThanOrEqual(1);

    // No debe incluir atletas exclusivos de Box Sur
    const emailsNorte = resListado.body.map((a) => a.email);
    expect(emailsNorte).not.toContain("admin.sur.atletas@test.centris.dev");

    // Y el Administrador de Box Sur bajo RLS no ve los atletas de Box Norte
    const resSurListado = await api.pedir<Atleta[]>("/atletas", {
      token: tokenAdminSur,
      boxId: IDS.boxSur
    });
    expect(resSurListado.status).toBe(200);
    const emailsSur = resSurListado.body.map((a) => a.email);
    expect(emailsSur).not.toContain("atleta.existente@test.centris.dev");

    // 2. Buscador por texto parcial
    const resBusqueda = await api.pedir<Atleta[]>("/atletas?buscar=Inicial", {
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(resBusqueda.status).toBe(200);
    expect(
      resBusqueda.body.some((a) => a.email === "atleta.existente@test.centris.dev")
    ).toBe(true);

    // 3. Ficha individual
    const resFicha = await api.pedir<Atleta>(
      `/atletas/${IDS.afiliacionAtletaNorte}`,
      {
        token: tokenRecepNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(resFicha.status).toBe(200);
    expect(resFicha.body.nombre).toBe("Atleta Inicial Norte");

    // 4. Edición de datos operativos
    const resEdicion = await api.pedir<Atleta>(
      `/atletas/${IDS.afiliacionAtletaNorte}`,
      {
        method: "PATCH",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte,
        body: {
          nombre: "Atleta Inicial Editado"
        }
      }
    );
    expect(resEdicion.status).toBe(200);
    expect(resEdicion.body.nombre).toBe("Atleta Inicial Editado");

    // 5. Soft Delete
    const resDelete = await api.pedir<{ eliminada: boolean; id: string }>(
      `/atletas/${IDS.afiliacionAtletaNorte}`,
      {
        method: "DELETE",
        token: tokenAdminNorte,
        boxId: IDS.boxNorte
      }
    );
    expect(resDelete.status).toBe(200);
    expect(resDelete.body.eliminada).toBe(true);

    // Al listar solo activos, no debe aparecer
    const resListadoActivos = await api.pedir<Atleta[]>("/atletas?soloActivos=true", {
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(
      resListadoActivos.body.some(
        (a) => a.afiliacionId === IDS.afiliacionAtletaNorte
      )
    ).toBe(false);

    // Al listar inactivos (soloActivos=false), sí debe aparecer
    const resListadoTodos = await api.pedir<Atleta[]>("/atletas?soloActivos=false", {
      token: tokenRecepNorte,
      boxId: IDS.boxNorte
    });
    expect(
      resListadoTodos.body.some(
        (a) => a.afiliacionId === IDS.afiliacionAtletaNorte
      )
    ).toBe(true);
  });

  it("Criterio 4: Restricción estricta para Coach y Atleta (403 Forbidden)", async () => {
    // Coach intentando listar atletas
    const resCoachList = await api.pedir("/atletas", {
      token: tokenCoachNorte,
      boxId: IDS.boxNorte
    });
    expect(resCoachList.status).toBe(403);

    // Coach intentando crear atleta
    const resCoachCreate = await api.pedir("/atletas", {
      method: "POST",
      token: tokenCoachNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Intento Coach",
        email: "intento.coach@centris.test"
      }
    });
    expect(resCoachCreate.status).toBe(403);

    // Atleta intentando listar atletas
    const resAtletaList = await api.pedir("/atletas", {
      token: tokenAtletaNorte,
      boxId: IDS.boxNorte
    });
    expect(resAtletaList.status).toBe(403);

    // Atleta intentando crear atleta
    const resAtletaCreate = await api.pedir("/atletas", {
      method: "POST",
      token: tokenAtletaNorte,
      boxId: IDS.boxNorte,
      body: {
        nombre: "Intento Atleta",
        email: "intento.atleta@centris.test"
      }
    });
    expect(resAtletaCreate.status).toBe(403);
  });
});
