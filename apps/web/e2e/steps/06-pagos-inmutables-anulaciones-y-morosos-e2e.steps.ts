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

const E2E_PAGOS = {
  planId: "f6000000-0000-4000-8000-000000000001",
  usuarioId: "f6000000-0000-4000-8000-000000000002",
  afiliacionId: "f6000000-0000-4000-8000-000000000003",
  membresiaId: "f6000000-0000-4000-8000-000000000004",
  pagoId: "f6000000-0000-4000-8000-000000000005",
  email: "atleta.pagos.bdd@centris.test",
  nombre: "Atleta Pagos BDD"
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

async function limpiarDatosDePagos(): Promise<void> {
  await ejecutarSqlOwner(`DELETE FROM pagos WHERE box_id = $1`, [
    SEED_BOX_IDS.boxCentrisNorte
  ]);
  await ejecutarSqlOwner(`DELETE FROM membresias WHERE afiliacion_id = $1`, [
    E2E_PAGOS.afiliacionId
  ]);
  await ejecutarSqlOwner(`DELETE FROM afiliaciones WHERE id = $1`, [
    E2E_PAGOS.afiliacionId
  ]);
  await ejecutarSqlOwner(`DELETE FROM usuarios WHERE id = $1`, [
    E2E_PAGOS.usuarioId
  ]);
  await ejecutarSqlOwner(`DELETE FROM planes WHERE id = $1`, [
    E2E_PAGOS.planId
  ]);
}

After(async () => {
  await limpiarDatosDePagos();
});

async function prepararAtletaConMembresia(
  precio: number,
  fechaInicio: string,
  pagoInicialMonto?: number
): Promise<void> {
  await limpiarDatosDePagos();

  // 1. Plan
  await ejecutarSqlOwner(
    `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
     VALUES ($1, $2, 'Plan Caja BDD', $3, 30, 'ILIMITADO', NULL, true)`,
    [E2E_PAGOS.planId, SEED_BOX_IDS.boxCentrisNorte, precio]
  );

  // 2. Usuario
  await ejecutarSqlOwner(
    `INSERT INTO usuarios (id, email, nombre, password_hash) VALUES ($1, $2, $3, NULL)`,
    [E2E_PAGOS.usuarioId, E2E_PAGOS.email, E2E_PAGOS.nombre]
  );

  // 3. Afiliación
  await ejecutarSqlOwner(
    `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
     VALUES ($1, $2, $3, ARRAY['atleta'], true)`,
    [E2E_PAGOS.afiliacionId, SEED_BOX_IDS.boxCentrisNorte, E2E_PAGOS.usuarioId]
  );

  // 4. Membresía
  await ejecutarSqlOwner(
    `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4, $5, 'ILIMITADO', $6, '2026-11-30')`,
    [
      E2E_PAGOS.membresiaId,
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_PAGOS.afiliacionId,
      E2E_PAGOS.planId,
      precio,
      fechaInicio
    ]
  );

  // 5. Pago inicial si aplica
  if (pagoInicialMonto && pagoInicialMonto > 0) {
    const adminUsuarioId = "00000000-0000-4000-8000-000000000201";
    await ejecutarSqlOwner(
      `INSERT INTO pagos (id, box_id, membresia_id, monto, medio_pago, fecha_pago, registrado_por_usuario_id)
       VALUES ($1, $2, $3, $4, 'TRANSFERENCIA', '2026-11-01', $5)`,
      [
        E2E_PAGOS.pagoId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_PAGOS.membresiaId,
        pagoInicialMonto,
        adminUsuarioId
      ]
    );
  }
}

async function loginYVisitarAtletas(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL(/\/(inicio|atletas|caja|seleccionar-box)/);
  await page.goto("/atletas");
  await expect(page).toHaveURL(/\/atletas/);
  await page
    .getByTestId(`btn-ficha-atleta-${E2E_PAGOS.afiliacionId}`)
    .click();
  await expect(page.getByTestId("modal-ficha-atleta")).toBeVisible();
}

Given(
  "un Recepcionista autenticado en la ficha de un Atleta con Membresía de {int} iniciada el {string}",
  async ({ page }, precio: number, fechaInicio: string) => {
    await prepararAtletaConMembresia(precio, fechaInicio);
    await loginYVisitarAtletas(page, "recepcion@centris.dev");
  }
);

Then(
  "la ficha muestra un Saldo de {int} y el Atleta figura como Moroso",
  async ({ page }, _saldo: number) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await expect(ficha.getByTestId("badge-moroso")).toBeVisible();
    await expect(ficha.getByTestId("membresia-saldo")).toContainText("30.000");
  }
);

When(
  "registra un Pago de {int} en {string}",
  async ({ page }, monto: number, medio: string) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await ficha.getByTestId("input-monto-pago").fill(String(monto));
    await ficha.getByTestId("select-medio-pago").selectOption(medio);
    await ficha.getByTestId("btn-registrar-pago").click();
  }
);

When(
  "registra un Pago de {int} por {string}",
  async ({ page }, monto: number, medio: string) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await ficha.getByTestId("input-monto-pago").fill(String(monto));
    await ficha.getByTestId("select-medio-pago").selectOption(medio);
    await ficha.getByTestId("btn-registrar-pago").click();
  }
);

Then(
  "el Saldo de la Membresía se actualiza dinámicamente a {int}",
  async ({ page }, saldo: number) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    const textoEsperado = saldo === 0 ? "$ 0" : "5.000";
    await expect(ficha.getByTestId("membresia-saldo")).toContainText(textoEsperado);
  }
);

Then(
  "en el reporte de Morosos el Atleta figura con una deuda de {int}",
  async ({ page }, _deuda: number) => {
    await page.goto("/caja");
    await expect(page).toHaveURL(/\/caja/);
    const filaMoroso = page.getByTestId("fila-moroso").filter({
      hasText: E2E_PAGOS.nombre
    });
    await expect(filaMoroso).toBeVisible();
    await expect(filaMoroso.getByTestId("moroso-total-deuda")).toContainText("5.000");

    // Regresar a la ficha del Atleta
    await page.goto("/atletas");
    await page
      .getByTestId(`btn-ficha-atleta-${E2E_PAGOS.afiliacionId}`)
      .click();
    await expect(page.getByTestId("modal-ficha-atleta")).toBeVisible();
  }
);

Then(
  "el Atleta deja de figurar como Moroso",
  async ({ page }) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await expect(ficha.getByTestId("badge-moroso")).not.toBeVisible();

    await page.goto("/caja");
    const morosoEnCaja = page.getByTestId("fila-moroso").filter({
      hasText: E2E_PAGOS.nombre
    });
    await expect(morosoEnCaja).not.toBeVisible();
  }
);

Then(
  "el Recepcionista no dispone de controles para anular pagos ni acceder a la Auditoría de Caja",
  async ({ page }) => {
    await expect(page.getByTestId("tab-auditoria")).toHaveCount(0);

    await page.goto("/atletas");
    await page
      .getByTestId(`btn-ficha-atleta-${E2E_PAGOS.afiliacionId}`)
      .click();
    const ficha = page.getByTestId("modal-ficha-atleta");
    await expect(ficha).toBeVisible();
    await expect(ficha.locator('[data-testid^="btn-anular-pago-"]')).toHaveCount(0);
  }
);

Given(
  "un Administrador autenticado en la ficha de un Atleta con Membresía de {int} y un Pago de {int}",
  async ({ page }, precio: number, pagoInicial: number) => {
    await prepararAtletaConMembresia(precio, "2026-11-01", pagoInicial);
    await loginYVisitarAtletas(page, "admin@centris.dev");
  }
);

Then(
  "el Saldo de la Membresía es de {int}",
  async ({ page }, _saldo: number) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await expect(ficha.getByTestId("membresia-saldo")).toContainText("20.000");
  }
);

When(
  "el Administrador anula el Pago de {int} ingresando el motivo {string}",
  async ({ page }, _monto: number, motivo: string) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await ficha.getByTestId(`btn-anular-pago-${E2E_PAGOS.pagoId}`).click();
    await ficha.getByTestId("input-motivo-anulacion").fill(motivo);
    await ficha.getByTestId("btn-confirmar-anulacion").click();
  }
);

Then(
  "el Pago figura marcado como Anulado con el motivo {string}",
  async ({ page }, motivo: string) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await expect(ficha.getByTestId("badge-pago-anulado")).toBeVisible();
    await expect(ficha.getByTestId("pago-motivo-anulacion")).toContainText(motivo);
  }
);

Then(
  "el Saldo de la Membresía se recalcula automáticamente a {int}",
  async ({ page }, _saldo: number) => {
    const ficha = page.getByTestId("modal-ficha-atleta");
    await expect(ficha.getByTestId("membresia-saldo")).toContainText("30.000");
  }
);

Then(
  "en la Auditoría de Caja el Pago permanece visible con su motivo de anulación",
  async ({ page }) => {
    await page.goto("/caja");
    await expect(page).toHaveURL(/\/caja/);
    await page.getByTestId("tab-auditoria").click();
    await expect(page.getByTestId("tabla-auditoria-caja")).toBeVisible();
    const filaAuditoria = page.getByTestId("fila-auditoria-pago").first();
    await expect(filaAuditoria.getByTestId("badge-pago-anulado")).toBeVisible();
    await expect(filaAuditoria.getByTestId("pago-motivo-anulacion")).toBeVisible();
    await expect(filaAuditoria.getByTestId("pago-motivo-anulacion")).not.toBeEmpty();
  }
);

Given(
  "un Coach autenticado en el sistema",
  async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("coach@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await page.waitForURL(/\/(inicio|horarios|seleccionar-box)/);
  }
);

When(
  "intenta navegar a la pantalla de Caja y Morosos",
  async ({ page }) => {
    await page.goto("/caja");
  }
);

Then(
  "el sistema le deniega el acceso con 403 Forbidden",
  async ({ page }) => {
    await expect(page.getByTestId("acceso-denegado-rol")).toBeVisible();
    await expect(page.getByText("403 Forbidden")).toBeVisible();
  }
);
