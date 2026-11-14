import { expect, type Page } from "@playwright/test";
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
    `DELETE FROM clases WHERE tipo_clase_id IN (SELECT id FROM tipos_clase WHERE nombre ILIKE '%E2E%')`
  );
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
    await page.getByTestId(`baja-tipo-clase-${nombre}-confirm`).click();
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

async function programarHorarioDesdeDrawer(
  page: Page,
  params: {
    tipoLabel?: string;
    dia: number;
    hora: string;
    duracion: number;
    cupos: number;
  }
): Promise<void> {
  await page.getByTestId("btn-nuevo-horario").click();
  const selectTipo = page.getByTestId("select-horario-tipo-clase");
  if (params.tipoLabel) {
    await selectTipo.selectOption({ label: params.tipoLabel });
  } else {
    const opcionesTipo = await selectTipo.locator("option").all();
    if (opcionesTipo.length > 1) {
      await selectTipo.selectOption({ index: 1 });
    }
  }

  const selectCoach = page.getByTestId("select-horario-coach");
  const opcionesCoach = await selectCoach.locator("option").all();
  if (opcionesCoach.length > 1) {
    await selectCoach.selectOption({ index: 1 });
  }

  await page
    .getByTestId("select-horario-dia")
    .selectOption(params.dia.toString());
  await page.getByTestId("input-horario-hora").fill(params.hora);
  await page
    .getByTestId("input-horario-duracion")
    .fill(params.duracion.toString());
  await page.getByTestId("input-horario-cupos").fill(params.cupos.toString());
  await page.getByTestId("btn-guardar-horario").click();
}

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
    await programarHorarioDesdeDrawer(page, { dia, hora, duracion, cupos });
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
    await page.getByTestId(`baja-horario-${hora}-confirm`).click();
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

When(
  'edita el Tipo de Clase {string} a nombre {string} y descripción {string}',
  async (
    { page },
    nombreActual: string,
    nuevoNombre: string,
    nuevaDescripcion: string
  ) => {
    await page.getByTestId(`btn-editar-tipo-clase-${nombreActual}`).click();
    await expect(page.getByTestId("drawer-tipo-clase")).toBeVisible();
    await page.getByTestId("input-tipo-clase-nombre").fill(nuevoNombre);
    await page
      .getByTestId("input-tipo-clase-descripcion")
      .fill(nuevaDescripcion);
    await page.getByTestId("btn-guardar-tipo-clase").click();
    await expect(page.getByTestId("drawer-tipo-clase")).not.toBeVisible();
    await expect(
      page.getByTestId(`item-tipo-clase-${nuevoNombre}`)
    ).toBeVisible();
  }
);

When(
  'programa un Horario para el Tipo de Clase {string} el día {int} a las {string} con {int} minutos y {int} cupos',
  async (
    { page },
    tipoNombre: string,
    dia: number,
    hora: string,
    duracion: number,
    cupos: number
  ) => {
    await programarHorarioDesdeDrawer(page, {
      tipoLabel: tipoNombre,
      dia,
      hora,
      duracion,
      cupos
    });
    await expect(
      page.getByTestId(`bloque-horario-dia-${dia}-${hora}`)
    ).toBeVisible();
  }
);

When(
  'edita el Horario del día {int} a las {string} a {int} cupos desde el panel lateral y filtra por el día {int}',
  async (
    { page },
    dia: number,
    hora: string,
    nuevosCupos: number,
    diaFiltro: number
  ) => {
    const bloque = page.getByTestId(`bloque-horario-dia-${dia}-${hora}`);
    await bloque.getByRole("button", { name: new RegExp(`Editar horario ${hora}`, "i") }).click();
    await expect(page.getByTestId("drawer-horario")).toBeVisible();
    await page.getByTestId("input-horario-cupos").fill(nuevosCupos.toString());
    await page.getByTestId("btn-guardar-horario").click();
    await expect(page.getByTestId("drawer-horario")).not.toBeVisible();
    await expect(page.getByTestId("banner-sincronizacion-clases")).toBeVisible();

    await page.getByTestId(`filtro-dia-${diaFiltro}`).click();
  }
);

Then(
  'visualiza el Tipo de Clase {string} y la franja {string} con {string} en desktop y mobile sin desborde horizontal',
  async ({ page }, tipoNombre: string, franja: string, cuposTexto: string) => {
    const bloque = page.getByTestId("bloque-horario-dia-2-08:00");
    await expect(bloque).toBeVisible();
    await expect(bloque).toContainText(tipoNombre);
    await expect(bloque).toContainText(franja);
    await expect(bloque).toContainText(cuposTexto);
    await expect(page.getByTestId(`item-tipo-clase-${tipoNombre}`)).toBeVisible();

    for (const width of [1280, 1440, 375]) {
      await page.setViewportSize({ width, height: 850 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);
    }
    await page.setViewportSize({ width: 1280, height: 850 });
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
