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

const E2E_MOSTRADOR = {
  usuarioId: "d0000000-0000-4000-8000-000000000001",
  afiliacionId: "e0000000-0000-4000-8000-000000000001",
  email: "mostrador.e2e@centris.dev",
  nombre: "Valeria Mostrador E2E"
};

const E2E_EQUIPO = {
  usuarioId: "d0000000-0000-4000-8000-000000000002",
  afiliacionNorteId: "e0000000-0000-4000-8000-000000000002",
  afiliacionSurId: "e0000000-0000-4000-8000-000000000003",
  email: "equipo.e2e@centris.dev",
  nombre: "Bruno Equipo E2E"
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

After(async () => {
  await ejecutarSqlOwner(
    `DELETE FROM afiliaciones WHERE id IN ($1, $2, $3)`,
    [
      E2E_MOSTRADOR.afiliacionId,
      E2E_EQUIPO.afiliacionNorteId,
      E2E_EQUIPO.afiliacionSurId
    ]
  );
  await ejecutarSqlOwner(`DELETE FROM usuarios WHERE id IN ($1, $2)`, [
    E2E_MOSTRADOR.usuarioId,
    E2E_EQUIPO.usuarioId
  ]);
  await ejecutarSqlOwner(
    `UPDATE boxes SET nombre = 'Box Centris Norte', timezone = 'America/Argentina/Buenos_Aires', moneda = 'ARS', anticipacion_reserva_dias = 7, ventana_cancelacion_minutos = 120 WHERE id = $1`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );
});

Given(
  'un Usuario creado en mostrador con contraseña pendiente de activación y Afiliación activa en {string}',
  async ({}, _nombreBox: string) => {
    await ejecutarSqlOwner(
      `DELETE FROM afiliaciones WHERE id = $1`,
      [E2E_MOSTRADOR.afiliacionId]
    );
    await ejecutarSqlOwner(
      `DELETE FROM usuarios WHERE id = $1 OR email = $2`,
      [E2E_MOSTRADOR.usuarioId, E2E_MOSTRADOR.email]
    );
    await ejecutarSqlOwner(
      `INSERT INTO usuarios (id, email, nombre, password_hash) VALUES ($1, $2, $3, NULL)`,
      [E2E_MOSTRADOR.usuarioId, E2E_MOSTRADOR.email, E2E_MOSTRADOR.nombre]
    );
    await ejecutarSqlOwner(
      `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo) VALUES ($1, $2, $3, ARRAY['atleta'], true)`,
      [
        E2E_MOSTRADOR.afiliacionId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_MOSTRADOR.usuarioId
      ]
    );
  }
);

When(
  "accede por primera vez al flujo de activación de cuenta e ingresa su email y nueva contraseña",
  async ({ page }) => {
    await page.goto("/activar-cuenta");
    await page.getByLabel(/Correo electrónico/i).fill(E2E_MOSTRADOR.email);
    await page.getByLabel(/Nueva contraseña/i).fill("ActivaCentris123!");
    await page.getByRole("button", { name: /Activar mi cuenta/i }).click();
  }
);

Then(
  'define su contraseña global por única vez y accede al panel operativo de {string}',
  async ({ page }, nombreBox: string) => {
    await expect(page).toHaveURL(/\/inicio/);
    await expect(page.getByTestId("box-activo-nombre")).toContainText(
      nombreBox
    );
  }
);

When(
  "intenta utilizar nuevamente el flujo de activación de cuenta con ese mismo email",
  async ({ page }) => {
    await page.goto("/activar-cuenta");
    await page.getByLabel(/Correo electrónico/i).fill(E2E_MOSTRADOR.email);
    await page.getByLabel(/Nueva contraseña/i).fill("OtraClave999!");
    await page.getByRole("button", { name: /Activar mi cuenta/i }).click();
  }
);

Then(
  "visualiza el rechazo indicando que la cuenta ya fue activada previamente",
  async ({ page }) => {
    await expect(page.getByTestId("alerta-error-auth")).toContainText(
      /CUENTA_YA_ACTIVADA|ya posee una contraseña|ya fue activada/i
    );
  }
);

Given(
  'un Usuario autenticado con Afiliaciones activas en {string} como Coach y Recepcionista y en {string} como Atleta',
  async ({ page }, _boxNorte: string, _boxSur: string) => {
    await page.context().clearCookies();
  }
);

When(
  "inicia sesión en la aplicación web mediante Auth.js",
  async ({ page }) => {
    await page.goto("/login");
    await page
      .getByLabel(/Correo electrónico/i)
      .fill("coach.multi@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  }
);

Then(
  'visualiza el selector de Box con sus Afiliaciones en {string} y {string}',
  async ({ page }, boxNorte: string, boxSur: string) => {
    await expect(page).toHaveURL(/\/seleccionar-box/);
    await expect(
      page.getByRole("heading", { name: /Seleccioná tu Box/i })
    ).toBeVisible();
    await expect(
      page.getByTestId(`opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`)
    ).toContainText(boxNorte);
    await expect(
      page.getByTestId(`opcion-box-${SEED_BOX_IDS.boxCentrisSur}`)
    ).toContainText(boxSur);
  }
);

When('selecciona operar en {string}', async ({ page }, nombreBox: string) => {
  const boxId =
    nombreBox === "Box Centris Norte"
      ? SEED_BOX_IDS.boxCentrisNorte
      : SEED_BOX_IDS.boxCentrisSur;
  await page
    .getByTestId(`opcion-box-${boxId}`)
    .getByRole("button", { name: /Ingresar al Box/i })
    .click();
});

Then(
  "el layout le habilita la unión de las vistas de Coach y Recepcionista y le bloquea el acceso a la configuración exclusiva de Administrador",
  async ({ page }) => {
    await expect(page).toHaveURL(/\/inicio/);
    await expect(page.getByTestId("panel-rol-coach")).toBeVisible();
    await expect(page.getByTestId("panel-rol-recepcionista")).toBeVisible();
    await expect(page.getByTestId("nav-link-configuracion")).toHaveCount(0);

    await page.goto("/configuracion");
    await expect(page.getByTestId("acceso-denegado-rol")).toBeVisible();
    await page.goto("/inicio");
  }
);

When(
  'cambia de Box activo a {string} desde el encabezado sin volver a autenticarse',
  async ({ page }, nombreBox: string) => {
    const boxId =
      nombreBox === "Box Centris Norte"
        ? SEED_BOX_IDS.boxCentrisNorte
        : SEED_BOX_IDS.boxCentrisSur;
    await page.getByTestId("selector-box-header").selectOption(boxId);
  }
);

Then(
  'el encabezado muestra {string} y el layout habilita únicamente la vista de Atleta',
  async ({ page }, nombreBox: string) => {
    await expect(page.getByTestId("box-activo-nombre")).toContainText(
      nombreBox
    );
    await expect(page.getByTestId("panel-rol-atleta")).toBeVisible();
    await expect(page.getByTestId("panel-rol-coach")).toHaveCount(0);
    await expect(page.getByTestId("panel-rol-recepcionista")).toHaveCount(0);
  }
);

Given(
  'un Administrador autenticado operando en {string}',
  async ({ page }, _nombreBox: string) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/inicio/);
  }
);

When(
  'actualiza la configuración de su Box con zona horaria {string}, moneda {string}, anticipación de {int} días y ventana de cancelación de {int} minutos',
  async (
    { page },
    timezone: string,
    moneda: string,
    anticipacion: number,
    ventana: number
  ) => {
    await page.getByTestId("nav-link-configuracion").click();
    await expect(page).toHaveURL(/\/configuracion/);

    await page.getByLabel(/Zona horaria/i).fill(timezone);
    await page.getByLabel(/Moneda/i).fill(moneda);
    await page
      .getByLabel(/Anticipación de reserva/i)
      .fill(String(anticipacion));
    await page.getByLabel(/Ventana de cancelación/i).fill(String(ventana));
    await page
      .getByRole("button", { name: /Guardar configuración/i })
      .click();
  }
);

Then(
  'los cambios se validan con Zod y quedan persistidos en {string}',
  async ({ page }, _nombreBox: string) => {
    await expect(page.getByTestId("mensaje-exito-configuracion")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Zona horaria/i)).toHaveValue(
      "America/Montevideo"
    );
    await expect(page.getByLabel(/Moneda/i)).toHaveValue("UYU");
    await expect(page.getByLabel(/Anticipación de reserva/i)).toHaveValue("10");
    await expect(page.getByLabel(/Ventana de cancelación/i)).toHaveValue("90");
  }
);

Given(
  'un Usuario del equipo con Afiliación activa en {string} y en {string}',
  async ({ page }, _boxNorte: string, _boxSur: string) => {
    await ejecutarSqlOwner(
      `DELETE FROM afiliaciones WHERE id IN ($1, $2)`,
      [E2E_EQUIPO.afiliacionNorteId, E2E_EQUIPO.afiliacionSurId]
    );
    await ejecutarSqlOwner(
      `DELETE FROM usuarios WHERE id = $1 OR email = $2`,
      [E2E_EQUIPO.usuarioId, E2E_EQUIPO.email]
    );
    await ejecutarSqlOwner(
      `INSERT INTO usuarios (id, email, nombre, password_hash) VALUES ($1, $2, $3, NULL)`,
      [E2E_EQUIPO.usuarioId, E2E_EQUIPO.email, E2E_EQUIPO.nombre]
    );
    await ejecutarSqlOwner(
      `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
       VALUES
         ($1, $3, $5, ARRAY['coach'], true),
         ($2, $4, $5, ARRAY['atleta'], true)`,
      [
        E2E_EQUIPO.afiliacionNorteId,
        E2E_EQUIPO.afiliacionSurId,
        SEED_BOX_IDS.boxCentrisNorte,
        SEED_BOX_IDS.boxCentrisSur,
        E2E_EQUIPO.usuarioId
      ]
    );

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("admin@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/inicio/);
  }
);

When(
  'el Administrador de {string} modifica los roles de su Afiliación y luego le aplica baja lógica',
  async ({ page }, _nombreBox: string) => {
    await page.getByTestId("nav-link-afiliaciones").click();
    await expect(page).toHaveURL(/\/afiliaciones/);

    const filaIntegrante = page.getByTestId(
      `fila-afiliacion-${E2E_EQUIPO.afiliacionNorteId}`
    );
    await expect(filaIntegrante).toBeVisible();

    await filaIntegrante
      .getByTestId(`checkbox-rol-recepcionista-${E2E_EQUIPO.afiliacionNorteId}`)
      .check();
    await filaIntegrante
      .getByRole("button", { name: /Guardar roles/i })
      .click();

    await expect(
      page.getByTestId(`estado-guardado-${E2E_EQUIPO.afiliacionNorteId}`)
    ).toBeVisible();

    await filaIntegrante
      .getByRole("button", { name: /Dar de baja/i })
      .click();
  }
);

Then(
  'los permisos del Usuario se actualizan de inmediato en {string} sin afectar su Afiliación en {string}',
  async ({ page }, _boxNorte: string, _boxSur: string) => {
    await expect(
      page.getByTestId(`fila-afiliacion-${E2E_EQUIPO.afiliacionNorteId}`)
    ).toHaveCount(0);

    const pool = new pg.Pool({ connectionString: MIGRATION_URL });
    try {
      const res = await pool.query<{
        id: string;
        roles: string[];
        deleted_at: Date | null;
      }>(`SELECT id, roles, deleted_at FROM afiliaciones WHERE id IN ($1, $2)`, [
        E2E_EQUIPO.afiliacionNorteId,
        E2E_EQUIPO.afiliacionSurId
      ]);
      const norte = res.rows.find((r) => r.id === E2E_EQUIPO.afiliacionNorteId);
      const sur = res.rows.find((r) => r.id === E2E_EQUIPO.afiliacionSurId);
      expect(norte?.roles).toEqual(["coach", "recepcionista"]);
      expect(norte?.deleted_at).not.toBeNull();
      expect(sur?.deleted_at).toBeNull();
      expect(sur?.roles).toEqual(["atleta"]);
    } finally {
      await pool.end();
    }
  }
);
