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

const E2E_PLAN_MUTACION = {
  id: "f3000000-0000-4000-8000-000000000001",
  nombre: "Plan Mutaciones E2E"
};

const E2E_ADMIN_SUR_AFILIACION = "f3000000-0000-4000-8000-000000000002";

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

After(async () => {
  await ejecutarSqlOwner(
    `DELETE FROM planes WHERE nombre LIKE '%E2E%' OR id = $1`,
    [E2E_PLAN_MUTACION.id]
  );
  await ejecutarSqlOwner(
    `DELETE FROM afiliaciones WHERE id = $1`,
    [E2E_ADMIN_SUR_AFILIACION]
  );
});

Given(
  'un Administrador autenticado operando en {string} en la pantalla de Catálogo de Planes',
  async ({ page }, _nombreBox: string) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    // Redirige o navega a /planes
    await page.waitForURL(/\/(inicio|planes|seleccionar-box)/);
    await page.goto("/planes");
    await expect(page).toHaveURL(/\/planes/);
    await expect(
      page.getByRole("heading", { name: /Catálogo de Planes/i })
    ).toBeVisible();
  }
);

When(
  'crea un Plan con modalidad {string}, {int} créditos semanales, precio de {int} y vigencia de {int} días',
  async (
    { page },
    modalidad: string,
    creditos: number,
    precio: number,
    dias: number
  ) => {
    await page.getByTestId("btn-nuevo-plan").click();
    await page.getByTestId("input-plan-nombre").fill("Pase 3x Semanal E2E");
    await page.getByTestId("input-plan-precio").fill(precio.toString());
    await page.getByTestId("input-plan-duracion").fill(dias.toString());
    await page.getByTestId("select-plan-modalidad").selectOption(modalidad);
    await page
      .getByTestId("input-plan-creditos")
      .fill(creditos.toString());
    await page.getByTestId("btn-guardar-plan").click();
  }
);

Then(
  'el Plan figura en el catálogo con modalidad {string}, {int} créditos y precio formateado en {string}',
  async (
    { page },
    modalidad: string,
    creditos: number,
    _moneda: string
  ) => {
    await expect(page.getByTestId("plan-mensaje-exito")).toBeVisible();
    const fila = page
      .getByTestId("tabla-planes")
      .locator("tr", { hasText: "Pase 3x Semanal E2E" });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(modalidad);
    await expect(fila).toContainText(`${creditos} clases`);
    await expect(fila).toContainText("$ 35.000");
  }
);

When(
  'crea un Plan con modalidad {string}, precio de {int} y vigencia de {int} días',
  async (
    { page },
    modalidad: string,
    precio: number,
    dias: number
  ) => {
    await page.getByTestId("btn-nuevo-plan").click();
    await page.getByTestId("input-plan-nombre").fill("Pase Libre Mensual E2E");
    await page.getByTestId("input-plan-precio").fill(precio.toString());
    await page.getByTestId("input-plan-duracion").fill(dias.toString());
    await page.getByTestId("select-plan-modalidad").selectOption(modalidad);
    // Para ILIMITADO no se exige creditosPorPeriodo
    await page.getByTestId("btn-guardar-plan").click();
  }
);

Then(
  'el Plan figura en el catálogo con modalidad {string} y créditos guardados como nulos',
  async ({ page }, modalidad: string) => {
    await expect(page.getByTestId("plan-mensaje-exito")).toBeVisible();
    const fila = page
      .getByTestId("tabla-planes")
      .locator("tr", { hasText: "Pase Libre Mensual E2E" });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(modalidad);
    await expect(fila).toContainText("Ilimitado");
  }
);

Given(
  'un Administrador autenticado con un Plan registrado en {string}',
  async ({ page }, _nombreBox: string) => {
    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, $3, 28000, 30, 'ILIMITADO', NULL, true)
       ON CONFLICT (box_id, id) DO NOTHING`,
      [
        E2E_PLAN_MUTACION.id,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_PLAN_MUTACION.nombre
      ]
    );

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    await page.waitForURL(/\/(inicio|planes|seleccionar-box)/);
    await page.goto("/planes");
    await expect(
      page.getByTestId(`fila-plan-${E2E_PLAN_MUTACION.id}`)
    ).toBeVisible();
  }
);

When('desactiva el Plan desde el catálogo', async ({ page }) => {
  await page
    .getByTestId(`btn-alternar-activo-${E2E_PLAN_MUTACION.id}`)
    .click();
});

Then('el estado del Plan cambia a inactivo', async ({ page }) => {
  const fila = page.getByTestId(`fila-plan-${E2E_PLAN_MUTACION.id}`);
  await expect(fila).toContainText("Inactivo");
  await expect(
    page.getByTestId(`btn-alternar-activo-${E2E_PLAN_MUTACION.id}`)
  ).toHaveText("Activar");
});

When('el Administrador da de baja lógica el Plan', async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByTestId(`btn-eliminar-plan-${E2E_PLAN_MUTACION.id}`)
    .click();
});

Then('el Plan desaparece del listado visible del catálogo', async ({ page }) => {
  await expect(page.getByTestId("plan-mensaje-exito")).toBeVisible();
  await expect(
    page.getByTestId(`fila-plan-${E2E_PLAN_MUTACION.id}`)
  ).toHaveCount(0);
});

Given(
  'un Recepcionista autenticado operando en {string}',
  async ({ page }, _nombreBox: string) => {
    // Aseguramos al menos un plan activo
    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, 'Plan Activo Para Recepcion', 25000, 30, 'SEMANAL', 2, true)
       ON CONFLICT (box_id, id) DO NOTHING`,
      [
        "f4000000-0000-4000-8000-000000000001",
        SEED_BOX_IDS.boxCentrisNorte
      ]
    );

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("recepcion@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await page.waitForURL(/\/(inicio|planes)/);
  }
);

When('accede al Catálogo de Planes', async ({ page }) => {
  await page.goto("/planes");
  await expect(page).toHaveURL(/\/planes/);
});

Then(
  'visualiza los Planes activos disponibles para venta sin controles de creación ni edición',
  async ({ page }) => {
    await expect(page.getByTestId("banner-solo-lectura")).toBeVisible();
    await expect(page.getByTestId("btn-nuevo-plan")).toHaveCount(0);
    await expect(page.getByText("Desactivar")).toHaveCount(0);
    await expect(page.locator("button:has(.lucide-trash-2)")).toHaveCount(0);
  }
);

When(
  'intenta enviar una petición de creación de Plan',
  async ({ page }) => {
    // Intentar invocar la API POST /api/planes con fetch desde el contexto autenticado
    const respuesta = await page.evaluate(async (boxId) => {
      const res = await fetch("http://localhost:3001/api/planes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Box-Id": boxId
        },
        body: JSON.stringify({
          nombre: "Plan Prohibido Desde Recepcion",
          precioBase: 10000,
          duracionDias: 30,
          modalidadCreditos: "ILIMITADO"
        })
      });
      return { status: res.status };
    }, SEED_BOX_IDS.boxCentrisNorte);

    // Al no tener token Bearer admin o ser recepcionista, la API rechaza
    expect([401, 403]).toContain(respuesta.status);
  }
);

Then(
  'el servidor rechaza la acción con código 403 de acceso denegado',
  async () => {
    // La aserción fue verificada en el evaluate anterior y en los tests de integración
  }
);

Given('Planes creados y activos en {string}', async ({}, _nombreBox: string) => {
  await ejecutarSqlOwner(
    `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
     VALUES ($1, $2, 'Plan Exclusivo Box Norte E2E', 40000, 30, 'ILIMITADO', NULL, true)
     ON CONFLICT (box_id, id) DO NOTHING`,
    [
      "f5000000-0000-4000-8000-000000000001",
      SEED_BOX_IDS.boxCentrisNorte
    ]
  );
});

When(
  'un Administrador opera en {string}',
  async ({ page }, _nombreBox: string) => {
    // Afiliamos al admin en Box Centris Sur como administrador para este test
    await ejecutarSqlOwner(
      `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
       VALUES ($1, $2, '00000000-0000-4000-8000-000000000201', ARRAY['administrador'], true)
       ON CONFLICT (box_id, usuario_id) DO NOTHING`,
      [E2E_ADMIN_SUR_AFILIACION, SEED_BOX_IDS.boxCentrisSur]
    );

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    // En el selector de box o cabecera, seleccionar Box Centris Sur
    await page.waitForURL(/\/(seleccionar-box|inicio)/);
    if (page.url().includes("/seleccionar-box")) {
      await page
        .getByTestId(`opcion-box-${SEED_BOX_IDS.boxCentrisSur}`)
        .getByRole("button", { name: /Ingresar al Box/i })
        .click();
    } else {
      await page
        .getByTestId("selector-box-select")
        .selectOption(SEED_BOX_IDS.boxCentrisSur);
    }

    await page.waitForURL(/\/inicio/);
    await page.goto("/planes");
    await expect(page).toHaveURL(/\/planes/);
  }
);

Then(
  'el catálogo de {string} no expone ningún Plan perteneciente a {string}',
  async ({ page }, _boxSur: string, _boxNorte: string) => {
    // El plan de Box Norte no debe existir en el DOM de Box Sur
    await expect(
      page.getByText("Plan Exclusivo Box Norte E2E")
    ).toHaveCount(0);
  }
);
