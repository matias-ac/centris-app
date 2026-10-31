import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
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

async function ejecutarSqlOwner(
  query: string,
  params: unknown[] = []
): Promise<void> {
  const pool = new pg.Pool({ connectionString: MIGRATION_URL });
  try {
    await pool.query(query, params);
  } finally {
    await pool.end();
  }
}

async function limpiarDatosE2E(): Promise<void> {
  await ejecutarSqlOwner(
    `DELETE FROM horarios WHERE tipo_clase_id IN (SELECT id FROM tipos_clase WHERE nombre ILIKE '%E2E%')`
  );
  await ejecutarSqlOwner(
    `DELETE FROM tipos_clase WHERE nombre ILIKE '%E2E%'`
  );
}

After(async () => {
  await limpiarDatosE2E();
});

Given(
  'un Administrador autenticado operando en {string} en la pantalla de Horarios',
  async ({ page }, _box: string) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    await page.waitForURL(/\/(inicio|horarios|seleccionar-box)/);
    await page.goto("/horarios");
    await expect(page).toHaveURL(/\/horarios/);
    await expect(
      page.getByRole("heading", { name: /Horarios y Tipos de Clase/i })
    ).toBeVisible();
  }
);

When(
  'crea un Tipo de Clase con nombre {string} y descripción {string}',
  async ({ page }, nombre: string, descripcion: string) => {
    await page.getByTestId("btn-nuevo-tipo-clase").click();
    await page.getByTestId("input-tipo-clase-nombre").fill(nombre);
    await page.getByTestId("input-tipo-clase-descripcion").fill(descripcion);
    await page.getByTestId("btn-guardar-tipo-clase").click();
  }
);

Then(
  'el Tipo de Clase {string} figura en el listado de tipos de clase',
  async ({ page }, nombre: string) => {
    await expect(
      page.getByTestId(`item-tipo-clase-${nombre}`)
    ).toBeVisible();
  }
);

When(
  'da de baja lógica el Tipo de Clase {string}',
  async ({ page }, nombre: string) => {
    await page.getByTestId(`btn-eliminar-tipo-clase-${nombre}`).click();
  }
);

Then(
  'el Tipo de Clase {string} deja de mostrarse en el catálogo activo',
  async ({ page }, nombre: string) => {
    await expect(
      page.getByTestId(`item-tipo-clase-${nombre}`)
    ).not.toBeVisible();
  }
);

When(
  'programa un Horario recurrente con tipo {string}, día {int} a las {string} con duración de {int} minutos y {int} cupos',
  async (
    { page },
    _tipo: string,
    dia: number,
    hora: string,
    duracion: number,
    cupos: number
  ) => {
    await page.getByTestId("btn-nuevo-horario").click();
    // Seleccionar primer tipo de clase disponible si no hay seleccionado
    const selectTipo = page.getByTestId("select-horario-tipo-clase");
    const opcionesTipo = await selectTipo.locator("option").all();
    if (opcionesTipo.length > 1) {
      await selectTipo.selectOption({ index: 1 });
    }
    // Seleccionar primer coach disponible
    const selectCoach = page.getByTestId("select-horario-coach");
    const opcionesCoach = await selectCoach.locator("option").all();
    if (opcionesCoach.length > 1) {
      await selectCoach.selectOption({ index: 1 });
    }

    await page
      .getByTestId("select-horario-dia")
      .selectOption(dia.toString());
    await page.getByTestId("input-horario-hora").fill(hora);
    await page
      .getByTestId("input-horario-duracion")
      .fill(duracion.toString());
    await page.getByTestId("input-horario-cupos").fill(cupos.toString());
    await page.getByTestId("btn-guardar-horario").click();
  }
);

Then(
  'el Horario se visualiza en la grilla semanal en la columna del día {int} a las {string}',
  async ({ page }, dia: number, hora: string) => {
    await expect(
      page.getByTestId(`bloque-horario-dia-${dia}-${hora}`)
    ).toBeVisible();
  }
);

When(
  'da de baja lógica el bloque horario de las {string}',
  async ({ page }, hora: string) => {
    await page.getByTestId(`btn-eliminar-horario-${hora}`).click();
  }
);

Then(
  'el bloque horario deja de mostrarse en la grilla semanal',
  async ({ page }) => {
    await expect(
      page.getByTestId("bloque-horario-dia-1-07:00")
    ).not.toBeVisible();
  }
);

When('accede a la pantalla de Horarios', async ({ page }) => {
  await page.goto("/horarios");
  await expect(page).toHaveURL(/\/horarios/);
});

Then(
  'visualiza la grilla semanal sin controles de creación de horarios ni tipos de clase',
  async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Horarios y Tipos de Clase/i })
    ).toBeVisible();
    await expect(page.getByTestId("btn-nuevo-horario")).not.toBeVisible();
    await expect(page.getByTestId("btn-nuevo-tipo-clase")).not.toBeVisible();
  }
);
