import { expect, type Page } from "@playwright/test";
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

const E2E_MEMBRESIAS = {
  planId: "f5000000-0000-4000-8000-000000000001",
  usuarioId: "f5000000-0000-4000-8000-000000000002",
  afiliacionId: "f5000000-0000-4000-8000-000000000003",
  email: "atleta.membresia.bdd@centris.test",
  nombre: "Atleta Membresía BDD"
};

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

async function limpiarDatosDeMembresias(): Promise<void> {
  await ejecutarSqlOwner(`DELETE FROM membresias WHERE afiliacion_id = $1`, [
    E2E_MEMBRESIAS.afiliacionId
  ]);
  await ejecutarSqlOwner(`DELETE FROM afiliaciones WHERE id = $1`, [
    E2E_MEMBRESIAS.afiliacionId
  ]);
  await ejecutarSqlOwner(`DELETE FROM usuarios WHERE id = $1`, [
    E2E_MEMBRESIAS.usuarioId
  ]);
  await ejecutarSqlOwner(`DELETE FROM planes WHERE id = $1`, [
    E2E_MEMBRESIAS.planId
  ]);
}

After(async () => {
  await limpiarDatosDeMembresias();
});

async function prepararAtletaConPlan(
  nombrePlan: string,
  duracionDias: number,
  precioBase: number
): Promise<void> {
  await limpiarDatosDeMembresias();
  await ejecutarSqlOwner(
    `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
     VALUES ($1, $2, $3, $4, $5, 'SEMANAL', 3, true)`,
    [
      E2E_MEMBRESIAS.planId,
      SEED_BOX_IDS.boxCentrisNorte,
      nombrePlan,
      precioBase,
      duracionDias
    ]
  );
  await ejecutarSqlOwner(
    `INSERT INTO usuarios (id, email, nombre, password_hash) VALUES ($1, $2, $3, NULL)`,
    [E2E_MEMBRESIAS.usuarioId, E2E_MEMBRESIAS.email, E2E_MEMBRESIAS.nombre]
  );
  await ejecutarSqlOwner(
    `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
     VALUES ($1, $2, $3, ARRAY['atleta'], true)`,
    [
      E2E_MEMBRESIAS.afiliacionId,
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_MEMBRESIAS.usuarioId
    ]
  );
}

async function abrirFichaDelAtleta(
  page: Page,
  email: string
): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL(/\/(inicio|atletas|seleccionar-box)/);
  await page.goto("/atletas");
  await expect(page).toHaveURL(/\/atletas/);
  await page
    .getByTestId(`btn-ficha-atleta-${E2E_MEMBRESIAS.afiliacionId}`)
    .click();
  await expect(page.getByTestId("modal-ficha-atleta")).toBeVisible();
}

function filaDeMembresia(page: Page, fechaInicio: string) {
  return page
    .getByTestId("seccion-membresias")
    .getByTestId("fila-membresia")
    .filter({
      has: page.locator('[data-testid="membresia-fecha-inicio"]', {
        hasText: fechaInicio
      })
    });
}

async function asignarPlanDesdeLaFicha(
  page: Page,
  fechaInicio: string
): Promise<void> {
  await page.getByTestId("select-plan-membresia").selectOption({
    value: E2E_MEMBRESIAS.planId
  });
  await page.getByTestId("input-fecha-inicio-membresia").fill(fechaInicio);
  await page.getByTestId("btn-asignar-membresia").click();
}

Given(
  "un Recepcionista autenticado en la ficha de un Atleta con el Plan {string} de {int} días a {int}",
  async ({ page }, nombrePlan: string, duracionDias: number, precio: number) => {
    await prepararAtletaConPlan(nombrePlan, duracionDias, precio);
    await abrirFichaDelAtleta(page, "recepcion@centris.dev");
  }
);

Given(
  "un Administrador autenticado en la ficha de un Atleta con el Plan {string} de {int} días a {int}",
  async ({ page }, nombrePlan: string, duracionDias: number, precio: number) => {
    await prepararAtletaConPlan(nombrePlan, duracionDias, precio);
    await abrirFichaDelAtleta(page, "admin@centris.dev");
  }
);

When(
  "asigna el Plan al Atleta con inicio el {string}",
  async ({ page }, fechaInicio: string) => {
    await asignarPlanDesdeLaFicha(page, fechaInicio);
  }
);

When(
  "intenta asignar otra Membresía con inicio el {string}",
  async ({ page }, fechaInicio: string) => {
    await asignarPlanDesdeLaFicha(page, fechaInicio);
  }
);

When(
  "programa una Renovación con inicio el {string}",
  async ({ page }, fechaInicio: string) => {
    await asignarPlanDesdeLaFicha(page, fechaInicio);
  }
);

When(
  "ajusta los créditos extra de la Membresía del {string} a {int}",
  async ({ page }, fechaInicio: string, creditosExtra: number) => {
    const fila = filaDeMembresia(page, fechaInicio);
    await fila.getByTestId("input-creditos-extra").fill(String(creditosExtra));
    await fila.getByTestId("btn-guardar-creditos-extra").click();
  }
);

When(
  "ajusta el Precio de la Membresía del {string} a {int}",
  async ({ page }, fechaInicio: string, precio: number) => {
    const fila = filaDeMembresia(page, fechaInicio);
    await fila.getByTestId("input-precio-membresia").fill(String(precio));
    await fila.getByTestId("btn-guardar-precio-membresia").click();
  }
);

When(
  "ejecuta la Baja Anticipada de la Membresía del {string} con fin el {string}",
  async ({ page }, fechaInicio: string, fechaFin: string) => {
    const fila = filaDeMembresia(page, fechaInicio);
    await fila.getByTestId("input-fecha-baja").fill(fechaFin);
    await fila.getByTestId("btn-baja-anticipada").click();
  }
);

Then(
  "la ficha muestra una Membresía con Vigencia del {string} al {string}",
  async ({ page }, fechaInicio: string, fechaFin: string) => {
    const fila = filaDeMembresia(page, fechaInicio);
    await expect(fila).toBeVisible();
    await expect(fila.getByTestId("membresia-fecha-fin")).toHaveText(fechaFin);
  }
);

Then(
  "la ficha informa que la Vigencia se solapa con otra Membresía del Atleta",
  async ({ page }) => {
    await expect(page.getByTestId("alerta-error-membresias")).toContainText(
      "MEMBRESIA_SUPERPUESTA"
    );
  }
);

Then(
  "la Membresía del {string} muestra {int} créditos extra",
  async ({ page }, fechaInicio: string, creditosExtra: number) => {
    const fila = filaDeMembresia(page, fechaInicio);
    await expect(fila.getByTestId("membresia-creditos-extra")).toHaveText(
      String(creditosExtra)
    );
  }
);

Then(
  "la Membresía del {string} muestra un Precio de {int}",
  async ({ page }, fechaInicio: string, precio: number) => {
    const fila = filaDeMembresia(page, fechaInicio);
    await expect(fila.getByTestId("membresia-precio")).toHaveAttribute(
      "data-precio",
      String(precio)
    );
  }
);

Then(
  "no dispone de las acciones de ajuste de Precio ni de Baja Anticipada",
  async ({ page }) => {
    const seccion = page.getByTestId("seccion-membresias");
    await expect(seccion.getByTestId("input-precio-membresia")).toHaveCount(0);
    await expect(
      seccion.getByTestId("btn-guardar-precio-membresia")
    ).toHaveCount(0);
    await expect(seccion.getByTestId("btn-baja-anticipada")).toHaveCount(0);
  }
);
