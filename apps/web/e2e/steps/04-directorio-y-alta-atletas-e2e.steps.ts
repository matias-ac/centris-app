import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { SEED_BOX_IDS } from "@centris/shared";
import pg from "pg";

const { Given, When, Then, After } = createBdd();

function obtenerMigrationUrl(): string {
  const url = process.env.MIGRATION_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Variable de entorno obligatoria no definida: MIGRATION_DATABASE_URL."
    );
  }
  return url;
}

const MIGRATION_URL = obtenerMigrationUrl();

const E2E_ATLETA_BDD = {
  email: "atleta.nuevo.bdd@centris.test",
  nombre: "Atleta Nuevo BDD",
  nombreModificado: "Atleta BDD Modificado"
};

const E2E_ATLETA_SUR = {
  usuarioId: "f4000000-0000-4000-8000-000000000001",
  afiliacionSurId: "f4000000-0000-4000-8000-000000000002",
  email: "atleta.sur.global@centris.test",
  nombre: "Atleta Sur Global"
};

async function ejecutarSqlOwner(
  query: string,
  params: unknown[] = []
): Promise<pg.QueryResult> {
  const pool = new pg.Pool({ connectionString: MIGRATION_URL });
  try {
    return await pool.query(query, params);
  } finally {
    await pool.end();
  }
}

function filaAtletaEnDirectorio(
  page: import("@playwright/test").Page,
  texto: string
) {
  return page
    .getByTestId("tabla-atletas")
    .locator('[data-testid^="fila-atleta-"]', { hasText: texto });
}

After(async () => {
  // Limpiar usuarios y afiliaciones creados en tests E2E
  await ejecutarSqlOwner(
    `DELETE FROM afiliaciones WHERE usuario_id IN (
       SELECT id FROM usuarios WHERE email IN ($1, $2)
     )`,
    [E2E_ATLETA_BDD.email, E2E_ATLETA_SUR.email]
  );
  await ejecutarSqlOwner(
    `DELETE FROM usuarios WHERE email IN ($1, $2)`,
    [E2E_ATLETA_BDD.email, E2E_ATLETA_SUR.email]
  );
  // Revertir roles de coach@centris.dev a solo coach si se modificó
  await ejecutarSqlOwner(
    `UPDATE afiliaciones SET roles = ARRAY['coach'], activo = true, deleted_at = NULL
     WHERE box_id = $1 AND usuario_id = (SELECT id FROM usuarios WHERE email = 'coach@centris.dev')`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );
});

Given(
  'un Recepcionista autenticado operando en {string} en el Directorio de Atletas',
  async ({ page }, _nombreBox: string) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("recepcion@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    await page.waitForURL(/\/(inicio|atletas|seleccionar-box)/);
    await page.goto("/atletas");
    await expect(page).toHaveURL(/\/atletas/);
    await expect(
      page.getByRole("heading", { name: /Directorio de Atletas/i })
    ).toBeVisible();
  }
);

When(
  'da de alta un nuevo Atleta con nombre {string} y email {string}',
  async ({ page }, nombre: string, email: string) => {
    await page.getByTestId("btn-nuevo-atleta").click();
    await page.getByTestId("input-atleta-nombre").fill(nombre);
    await page.getByTestId("input-atleta-email").fill(email);
    await page.getByTestId("btn-guardar-atleta").click();
  }
);

Then(
  'el Atleta figura en el directorio con rol {string} y estado activo',
  async ({ page }, rol: string) => {
    await expect(page.getByTestId("alerta-exito")).toBeVisible();
    const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(new RegExp(rol, "i"));
    await expect(fila).toContainText("Activo");
  }
);

Then(
  'la base de datos almacena el usuario con contraseña nula',
  async () => {
    const res = await ejecutarSqlOwner(
      `SELECT password_hash FROM usuarios WHERE email = $1`,
      [E2E_ATLETA_BDD.email]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0]!.password_hash).toBeNull();
  }
);

Given(
  'un Administrador autenticado operando en {string} en el Directorio de Atletas',
  async ({ page }, _nombreBox: string) => {
    // Asegurar que exista el usuario global en Box Sur
    await ejecutarSqlOwner(
      `INSERT INTO usuarios (id, email, nombre, password_hash)
       VALUES ($1, $2, $3, 'hash_preexistente_seguro')
       ON CONFLICT (email) DO NOTHING`,
      [E2E_ATLETA_SUR.usuarioId, E2E_ATLETA_SUR.email, E2E_ATLETA_SUR.nombre]
    );
    await ejecutarSqlOwner(
      `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
       VALUES ($1, $2, (SELECT id FROM usuarios WHERE email = $3), ARRAY['atleta'], true)
       ON CONFLICT (box_id, usuario_id) DO NOTHING`,
      [E2E_ATLETA_SUR.afiliacionSurId, SEED_BOX_IDS.boxCentrisSur, E2E_ATLETA_SUR.email]
    );

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    await page.waitForURL(/\/(inicio|atletas|seleccionar-box)/);
    await page.goto("/atletas");
    await expect(page).toHaveURL(/\/atletas/);
  }
);

When(
  'da de alta un Atleta con email existente {string}',
  async ({ page }, _email: string) => {
    await page.getByTestId("btn-nuevo-atleta").click();
    await page.getByTestId("input-atleta-nombre").fill(E2E_ATLETA_SUR.nombre);
    await page.getByTestId("input-atleta-email").fill(E2E_ATLETA_SUR.email);
    await page.getByTestId("btn-guardar-atleta").click();
  }
);

Then(
  'el Atleta figura en {string} con rol {string} y estado activo',
  async ({ page }, _nombreBox: string, rol: string) => {
    await expect(page.getByTestId("alerta-exito")).toBeVisible();
    const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_SUR.email);
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(new RegExp(rol, "i"));
    await expect(fila).toContainText("Activo");
  }
);

Then(
  'la base de datos conserva el usuario sin duplicarlo',
  async () => {
    const resUsuarios = await ejecutarSqlOwner(
      `SELECT id, password_hash FROM usuarios WHERE email = $1`,
      [E2E_ATLETA_SUR.email]
    );
    expect(resUsuarios.rows.length).toBe(1);
    expect(resUsuarios.rows[0]!.password_hash).toBe("hash_preexistente_seguro");

    const resAfiliaciones = await ejecutarSqlOwner(
      `SELECT box_id FROM afiliaciones WHERE usuario_id = $1`,
      [resUsuarios.rows[0]!.id]
    );
    // Debe tener afiliación en Box Sur y ahora también en Box Norte
    expect(resAfiliaciones.rows.length).toBe(2);
  }
);

When(
  'da de alta como Atleta a un usuario que ya era Coach en el Box',
  async ({ page }) => {
    await page.getByTestId("btn-nuevo-atleta").click();
    await page.getByTestId("input-atleta-nombre").fill("Valentina Ruiz");
    await page.getByTestId("input-atleta-email").fill("coach@centris.dev");
    await page.getByTestId("btn-guardar-atleta").click();
  }
);

Then(
  'la afiliación combina los roles coach y atleta sin duplicar el registro',
  async ({ page }) => {
    await expect(page.getByTestId("alerta-exito")).toBeVisible();
    const fila = filaAtletaEnDirectorio(page, "coach@centris.dev");
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(/Coach/i);
    await expect(fila).toContainText(/Atleta/i);

    const res = await ejecutarSqlOwner(
      `SELECT count(*) as total, roles FROM afiliaciones
       WHERE box_id = $1 AND usuario_id = (SELECT id FROM usuarios WHERE email = 'coach@centris.dev')
       GROUP BY roles`,
      [SEED_BOX_IDS.boxCentrisNorte]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0]!.total).toBe("1");
    expect(res.rows[0]!.roles).toContain("coach");
    expect(res.rows[0]!.roles).toContain("atleta");
  }
);

Given(
  'un Administrador autenticado en el Directorio de Atletas de {string}',
  async ({ page }, _nombreBox: string) => {
    // Asegurar que exista el atleta BDD para buscarlo/editarlo/desactivarlo
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    await page.waitForURL(/\/(inicio|atletas|seleccionar-box)/);
    await page.goto("/atletas");
    await expect(page).toHaveURL(/\/atletas/);

    // Si no está creado todavía, darlo de alta
    const existe = await filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email).count();
    if (existe === 0) {
      await page.getByTestId("btn-nuevo-atleta").click();
      await page.getByTestId("input-atleta-nombre").fill(E2E_ATLETA_BDD.nombre);
      await page.getByTestId("input-atleta-email").fill(E2E_ATLETA_BDD.email);
      await page.getByTestId("btn-guardar-atleta").click();
      await expect(page.getByTestId("alerta-exito")).toBeVisible();
    }
  }
);

When('busca atletas por término {string}', async ({ page }, termino: string) => {
  await page.getByTestId("input-buscar-atleta").fill(termino);
});

Then(
  'el listado muestra exclusivamente los atletas que coinciden con la búsqueda',
  async ({ page }) => {
    const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
    await expect(fila).toBeVisible();

    const otraFila = filaAtletaEnDirectorio(page, "atleta.aldia@centris.dev");
    await expect(otraFila).not.toBeVisible();
  }
);

When('consulta la ficha individual del Atleta', async ({ page }) => {
  const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
  await fila.getByRole("button", { name: /Ficha/i }).click();
});

Then('visualiza los datos completos de su afiliación', async ({ page }) => {
  const modalFicha = page.getByTestId("modal-ficha-atleta");
  await expect(modalFicha).toBeVisible();
  await expect(modalFicha.getByTestId("ficha-atleta-nombre")).toContainText(
    E2E_ATLETA_BDD.nombre
  );
  await expect(modalFicha.getByTestId("ficha-atleta-email")).toContainText(
    E2E_ATLETA_BDD.email
  );
  await page.getByTestId("btn-cerrar-ficha-atleta").click();
  await expect(modalFicha).not.toBeVisible();
});

When(
  'edita el nombre del Atleta a {string}',
  async ({ page }, nuevoNombre: string) => {
    const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
    await fila.getByRole("button", { name: /Editar/i }).click();

    await expect(page.getByTestId("form-editar-atleta")).toBeVisible();
    await page.getByTestId("input-edit-atleta-nombre").fill(nuevoNombre);
    await page.getByTestId("btn-guardar-edicion-atleta").click();
  }
);

Then('el cambio se refleja en el directorio', async ({ page }) => {
  await expect(page.getByTestId("alerta-exito")).toBeVisible();
  const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.nombreModificado);
  await expect(fila).toBeVisible();
});

When('desactiva la afiliación del Atleta', async ({ page }) => {
  const fila = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
  await fila.getByRole("button", { name: /Desactivar/i }).click();
  const panelConfirmacion = fila.locator('[data-testid^="baja-atleta-"][data-testid$="-panel"]');
  await expect(panelConfirmacion).toBeVisible();
  await panelConfirmacion
    .locator('[data-testid^="baja-atleta-"][data-testid$="-confirm"]')
    .click();
});

Then(
  'el Atleta figura como inactivo con fecha de baja lógica',
  async ({ page }) => {
    await expect(page.getByTestId("alerta-exito")).toBeVisible();
    // Por defecto el filtro Activos oculta inactivos
    const filaOculta = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
    await expect(filaOculta).not.toBeVisible();

    // Seleccionar filtro "Todos" para ver inactivos
    await page.getByTestId("filtro-atletas-todos").click();
    const filaVisible = filaAtletaEnDirectorio(page, E2E_ATLETA_BDD.email);
    await expect(filaVisible).toBeVisible();
    await expect(filaVisible).toContainText("Inactivo");

    const res = await ejecutarSqlOwner(
      `SELECT activo, deleted_at FROM afiliaciones
       WHERE usuario_id = (SELECT id FROM usuarios WHERE email = $1)`,
      [E2E_ATLETA_BDD.email]
    );
    expect(res.rows[0]!.activo).toBe(false);
    expect(res.rows[0]!.deleted_at).not.toBeNull();
  }
);

When(
  'navega directamente a la ficha de {string} mediante parámetro afiliacionId',
  async ({ page }, emailAtleta: string) => {
    const res = await ejecutarSqlOwner(
      `SELECT a.id FROM afiliaciones a
       INNER JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.box_id = $1 AND u.email = $2`,
      [SEED_BOX_IDS.boxCentrisNorte, emailAtleta]
    );
    expect(res.rows.length).toBe(1);
    const afiliacionId = String(res.rows[0]!.id);
    await page.goto(`/atletas?afiliacionId=${afiliacionId}`);
  }
);

Then(
  'el panel lateral de la ficha se abre automáticamente mostrando sus datos y saldo pendiente',
  async ({ page }) => {
    const modalFicha = page.getByTestId("modal-ficha-atleta");
    await expect(modalFicha).toBeVisible();
    await expect(modalFicha.getByTestId("ficha-atleta-email")).toContainText(
      "atleta.moroso@centris.dev"
    );
    await expect(modalFicha.getByTestId("badge-moroso")).toBeVisible();
    await page.getByTestId("btn-cerrar-ficha-atleta").click();
    await expect(modalFicha).not.toBeVisible();
  }
);

Then(
  'la pantalla de Atletas no presenta desborde horizontal en desktop ni móvil',
  async ({ page }) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  }
);

Given(
  'un Atleta autenticado operando en {string}',
  async ({ page }, _nombreBox: string) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("atleta.aldia@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    await page.waitForURL(/\/(inicio|seleccionar-box)/);
    await expect(page).toHaveURL(/\/inicio/);
  }
);

When('intenta acceder a la ruta {string}', async ({ page }, ruta: string) => {
  await page.goto(ruta);
});

Then(
  'visualiza la restricción de acceso sin código 403 Forbidden y puede volver al panel',
  async ({ page }) => {
    const bannerDenegado = page.getByTestId("acceso-denegado-rol");
    await expect(bannerDenegado).toBeVisible();
    const texto = (await bannerDenegado.textContent()) ?? "";
    expect(texto).not.toMatch(/403|Forbidden/i);
    await expect(page.getByTestId("nav-link-atletas")).not.toBeVisible();
    await bannerDenegado.getByRole("link", { name: /Volver al panel/i }).click();
    await expect(page).toHaveURL(/\/inicio/);
  }
);
