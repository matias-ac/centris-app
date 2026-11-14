import { expect, type Locator, type Page } from "@playwright/test";
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

const E2E_SIN_BOX = {
  usuarioId: "d0000000-0000-4000-8000-000000000003",
  email: "sinbox.e2e@centris.dev",
  nombre: "Lucía Sin Box E2E"
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
  await ejecutarSqlOwner(`DELETE FROM usuarios WHERE id IN ($1, $2, $3)`, [
    E2E_MOSTRADOR.usuarioId,
    E2E_EQUIPO.usuarioId,
    E2E_SIN_BOX.usuarioId
  ]);
  await ejecutarSqlOwner(
    `UPDATE boxes SET nombre = 'Box Centris Norte', timezone = 'America/Argentina/Buenos_Aires', moneda = 'ARS', anticipacion_reserva_dias = 7, ventana_cancelacion_minutos = 120 WHERE id = $1`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );
  await ejecutarSqlOwner(
    `UPDATE boxes SET nombre = 'Box Centris Sur' WHERE id = $1`,
    [SEED_BOX_IDS.boxCentrisSur]
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
    const alerta = page.getByTestId("alerta-error-auth");
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText(/ya posee una contraseña|ya fue activada/i);
    await expect(alerta).not.toContainText("CUENTA_YA_ACTIVADA");
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

    await page.getByLabel(/Zona horaria/i).selectOption(timezone);
    await page.getByLabel(/Moneda/i).selectOption(moneda);
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
    await expect(filaIntegrante).toContainText(/Cambios sin guardar/i);
    await filaIntegrante
      .getByRole("button", { name: /Guardar roles/i })
      .click();

    await expect(
      page.getByTestId(`estado-guardado-${E2E_EQUIPO.afiliacionNorteId}`)
    ).toBeVisible();

    await filaIntegrante
      .getByRole("button", { name: /Dar de baja/i })
      .click();
    await expect(
      filaIntegrante.getByText(/No afectará sus cuentas en otros Boxes/i)
    ).toBeVisible();
    await filaIntegrante
      .getByRole("button", { name: /Confirmar baja/i })
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

async function verificarToggleVisibilidadClave(
  page: Page,
  passwordInput: Locator
): Promise<void> {
  const toggleBtn = page.getByRole("button", {
    name: /Mostrar clave/i
  });
  const toggleBox = await toggleBtn.boundingBox();
  expect(toggleBox?.width).toBeGreaterThanOrEqual(44);
  expect(toggleBox?.height).toBeGreaterThanOrEqual(44);
  await toggleBtn.click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await expect(
    page.getByRole("button", { name: /Ocultar clave/i })
  ).toHaveAttribute("aria-pressed", "true");
}

async function verificarSinDesbordeResponsive(
  page: Page,
  widths: number[] = [375, 1280, 1440]
): Promise<void> {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  }
}

Given(
  "un Usuario no autenticado en la pantalla de inicio de sesión",
  async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /Iniciar sesión/i })
    ).toBeVisible();
  }
);

When(
  "valida campos inválidos individualmente, alterna la visibilidad de contraseña y envía credenciales incorrectas",
  async ({ page }) => {
    const emailInput = page.getByLabel(/Correo electrónico/i);
    const passwordInput = page.getByLabel("Contraseña", { exact: true });
    const submitBtn = page.getByRole("button", { name: /Iniciar sesión/i });

    // Validación individual: solo email inválido
    await emailInput.fill("correo-invalido");
    await passwordInput.fill("Centris123!");
    await submitBtn.click();
    await expect(emailInput).toHaveAttribute("aria-invalid", "true");
    await expect(passwordInput).not.toHaveAttribute("aria-invalid", "true");

    // Toggle de visibilidad de contraseña accesible (>= 44px)
    await verificarToggleVisibilidadClave(page, passwordInput);

    // Credenciales válidas en formato pero incorrectas en servidor
    await emailInput.fill("admin@centris.dev");
    await passwordInput.fill("ClaveIncorrecta999!");
    await submitBtn.click();
  }
);

Then(
  "visualiza errores accesibles sin códigos técnicos, sin desborde horizontal en móvil ni escritorio y puede navegar a activar su cuenta",
  async ({ page }) => {
    const alerta = page.getByTestId("alerta-error-auth");
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveAttribute("role", "alert");
    const textoAlerta = (await alerta.textContent()) ?? "";
    expect(textoAlerta).not.toMatch(/CREDENCIALES_INVALIDAS|ERROR:|401|500/);

    // Sin desborde horizontal en móvil (375px) ni escritorio (1280px y 1440px)
    await verificarSinDesbordeResponsive(page);

    // Navegación accesible hacia /activar-cuenta
    const activarLink = page.getByRole("link", { name: /Activar mi cuenta/i });
    const linkBox = await activarLink.boundingBox();
    expect(linkBox?.height).toBeGreaterThanOrEqual(44);
    await activarLink.click();
    await expect(page).toHaveURL(/\/activar-cuenta/);
  }
);

Given(
  "un Usuario no autenticado en la pantalla de activación de cuenta",
  async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/activar-cuenta");
    await expect(
      page.getByRole("heading", { name: /Activá tu cuenta/i })
    ).toBeVisible();
  }
);

When(
  "valida campos inválidos individualmente, evalúa el mínimo de contraseña, alterna su visibilidad y envía un correo no elegible",
  async ({ page }) => {
    const emailInput = page.getByLabel(/Correo electrónico/i);
    const passwordInput = page.getByLabel("Nueva contraseña", { exact: true });
    const submitBtn = page.getByRole("button", { name: /Activar mi cuenta/i });
    const badgeMinimo = page.getByTestId("badge-minimo-contrasena");

    await expect(badgeMinimo).toContainText("Mínimo 8 caracteres");

    // Validación individual: solo email inválido
    await emailInput.fill("correo-invalido");
    await passwordInput.fill("ActivaCentris123!");
    await expect(badgeMinimo).toContainText("Cumple mínimo de 8 caracteres");
    await submitBtn.click();
    await expect(emailInput).toHaveAttribute("aria-invalid", "true");
    await expect(passwordInput).not.toHaveAttribute("aria-invalid", "true");

    // Toggle de visibilidad de contraseña accesible (>= 44px)
    await verificarToggleVisibilidadClave(page, passwordInput);

    // Correo válido en formato pero sin cuenta pendiente en servidor
    await emailInput.fill("inexistente.e2e@centris.dev");
    await submitBtn.click();
  }
);

Then(
  "visualiza errores accesibles de activación sin códigos técnicos, sin desborde horizontal en móvil ni escritorio y puede volver a iniciar sesión",
  async ({ page }) => {
    const alerta = page.getByTestId("alerta-error-auth");
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveAttribute("role", "alert");
    const textoAlerta = (await alerta.textContent()) ?? "";
    expect(textoAlerta).not.toMatch(
      /CREDENCIALES_INVALIDAS|CUENTA_YA_ACTIVADA|ERROR:|401|409|500/
    );

    // Sin desborde horizontal en móvil (375px) ni escritorio (1280px y 1440px)
    await verificarSinDesbordeResponsive(page);

    // Navegación accesible hacia /login
    const loginLink = page.getByRole("link", {
      name: /Volver a iniciar sesión/i
    });
    const linkBox = await loginLink.boundingBox();
    expect(linkBox?.height).toBeGreaterThanOrEqual(44);
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  }
);

Given(
  "un Usuario con Afiliaciones activas y un Box ya activo en su sesión",
  async ({ page }) => {
    await ejecutarSqlOwner(
      `UPDATE boxes SET nombre = 'Box Centris Sur Entrenamiento Funcional y Fuerza' WHERE id = $1`,
      [SEED_BOX_IDS.boxCentrisSur]
    );
    await page.context().clearCookies();
    await page.goto("/login");
    await page
      .getByLabel(/Correo electrónico/i)
      .fill("coach.multi@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/seleccionar-box/);

    await page
      .getByTestId(`opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`)
      .getByRole("button", { name: /Ingresar al Box/i })
      .click();
    await expect(page).toHaveURL(/\/inicio/);
  }
);

When(
  "visita la pantalla de selección de Box en móvil y escritorio",
  async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/seleccionar-box");
    await expect(
      page.getByRole("heading", { name: /Seleccioná tu Box/i })
    ).toBeVisible();
  }
);

Then(
  "visualiza la marca del Box activo, los roles en español sin string IANA crudo, cards alineadas sin saltos ni desborde horizontal y puede continuar en su Box",
  async ({ page }) => {
    const cardNorte = page.getByTestId(
      `opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`
    );
    const cardSur = page.getByTestId(
      `opcion-box-${SEED_BOX_IDS.boxCentrisSur}`
    );

    await expect(cardNorte).toContainText("Activo ahora");
    await expect(cardNorte).toContainText("Coach");
    await expect(cardNorte).toContainText("Recepcionista");
    await expect(cardNorte).toContainText("Buenos Aires");
    await expect(cardNorte).not.toContainText("America/Argentina/Buenos_Aires");
    await expect(
      cardNorte.getByRole("button", { name: /Continuar en este Box/i })
    ).toBeVisible();

    await expect(cardSur).not.toContainText("Activo ahora");
    await expect(cardSur).toContainText("Atleta");
    await expect(
      cardSur.getByRole("button", { name: /Ingresar al Box/i })
    ).toBeVisible();

    // Sin desborde horizontal en móvil (375px) ni escritorio (1280px y 1440px)
    await verificarSinDesbordeResponsive(page);

    // En desktop, cards en fila alineadas con la misma altura y posición vertical
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const rectNorte = await cardNorte.boundingBox();
      const rectSur = await cardSur.boundingBox();
      expect(rectNorte).not.toBeNull();
      expect(rectSur).not.toBeNull();
      if (rectNorte && rectSur) {
        expect(Math.abs(rectNorte.y - rectSur.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(rectNorte.height - rectSur.height)).toBeLessThanOrEqual(
          1
        );
      }
    }

    await cardNorte
      .getByRole("button", { name: /Continuar en este Box/i })
      .click();
    await expect(page).toHaveURL(/\/inicio/);
    await expect(page.getByTestId("box-activo-nombre")).toContainText(
      "Box Centris Norte"
    );
  }
);

Given(
  "un Usuario autenticado sin afiliaciones activas en ningún Box",
  async ({ page }) => {
    await ejecutarSqlOwner(
      `DELETE FROM afiliaciones WHERE usuario_id = $1`,
      [E2E_SIN_BOX.usuarioId]
    );
    await ejecutarSqlOwner(
      `DELETE FROM usuarios WHERE id = $1 OR email = $2`,
      [E2E_SIN_BOX.usuarioId, E2E_SIN_BOX.email]
    );
    await ejecutarSqlOwner(
      `INSERT INTO usuarios (id, email, nombre, password_hash)
       SELECT $1, $2, $3, password_hash
       FROM usuarios
       WHERE email = 'coach.multi@centris.dev'
       LIMIT 1`,
      [E2E_SIN_BOX.usuarioId, E2E_SIN_BOX.email, E2E_SIN_BOX.nombre]
    );

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill(E2E_SIN_BOX.email);
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  }
);

When("accede al selector de Box", async ({ page }) => {
  await expect(page).toHaveURL(/\/seleccionar-box/);
});

Then(
  "visualiza el estado vacío con opciones para actualizar el listado o cerrar sesión sin jerga técnica",
  async ({ page }) => {
    const estadoVacio = page.getByTestId("sin-afiliaciones-box");
    await expect(estadoVacio).toBeVisible();
    await expect(estadoVacio).toContainText("No tenés afiliaciones activas");

    const texto = (await estadoVacio.textContent()) ?? "";
    expect(texto).not.toMatch(/401|403|500|ERROR_|gimnasio/i);

    await expect(
      estadoVacio.getByRole("button", { name: /Actualizar listado/i })
    ).toBeVisible();
    await expect(
      estadoVacio.getByRole("button", { name: /Cerrar sesión/i })
    ).toBeVisible();

    await verificarSinDesbordeResponsive(page);

    await estadoVacio.getByRole("button", { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);
  }
);

Given(
  "un Usuario sin rol de Administrador en {string}",
  async ({ page }, _nombreBox: string) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill("recepcion@centris.dev");
    await page.getByLabel(/Contraseña/i).fill("Centris123!");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/inicio/);
  }
);

When("intenta abrir la configuración del Box", async ({ page }) => {
  await page.goto("/configuracion");
});

Then(
  "visualiza la restricción de acceso sin código 403 Forbidden y puede volver al panel",
  async ({ page }) => {
    const card = page.getByTestId("acceso-denegado-rol");
    await expect(card).toBeVisible();
    const texto = (await card.textContent()) ?? "";
    expect(texto).not.toMatch(/403|Forbidden/i);
    await card.getByRole("link", { name: /Volver al panel/i }).click();
    await expect(page).toHaveURL(/\/inicio/);
  }
);

When(
  "verifica la alineación responsive de \\/configuracion, prueba validación individual y usa atajos de cancelación",
  async ({ page }) => {
    await page.getByTestId("nav-link-configuracion").click();
    await expect(page).toHaveURL(/\/configuracion/);

    const anticipacionInput = page.getByLabel(/Anticipación de reserva/i);
    const ventanaInput = page.getByLabel(/Ventana de cancelación/i);

    // En móvil (375px), los campos .two-cols se apilan en 1 columna sin desborde
    await verificarSinDesbordeResponsive(page, [375]);
    const rectAntMovil = await anticipacionInput.boundingBox();
    const rectVenMovil = await ventanaInput.boundingBox();
    expect(rectAntMovil).not.toBeNull();
    expect(rectVenMovil).not.toBeNull();
    if (rectAntMovil && rectVenMovil) {
      expect(rectVenMovil.y).toBeGreaterThan(rectAntMovil.y + 10);
    }

    // En tablet/desktop (768px, 1280px, 1440px), los inputs horizontales arrancan a la misma altura
    for (const width of [768, 1280, 1440]) {
      await verificarSinDesbordeResponsive(page, [width]);

      const rectAnt = await anticipacionInput.boundingBox();
      const rectVen = await ventanaInput.boundingBox();
      expect(rectAnt).not.toBeNull();
      expect(rectVen).not.toBeNull();
      if (rectAnt && rectVen) {
        expect(Math.abs(rectAnt.y - rectVen.y)).toBeLessThanOrEqual(1);
      }
    }

    // Validación individual sin marcar otros campos ni exponer códigos técnicos
    const nombreInput = page.getByLabel(/Nombre del Box/i);
    await anticipacionInput.fill("0");
    await page
      .getByRole("button", { name: /Guardar configuración/i })
      .click();
    await expect(anticipacionInput).toHaveAttribute("aria-invalid", "true");
    await expect(nombreInput).not.toHaveAttribute("aria-invalid", "true");
    await expect(ventanaInput).not.toHaveAttribute("aria-invalid", "true");

    // Atajo frecuente de ventana de cancelación
    const chip6h = page.getByRole("button", { name: "6 horas (360 min)" });
    await chip6h.click();
    await expect(chip6h).toHaveAttribute("aria-pressed", "true");
    await expect(ventanaInput).toHaveValue("360");
  }
);

Then(
  "las columnas se apilan en móvil y alinean sus inputs en escritorio, sin desborde horizontal ni códigos técnicos y con opción de restablecer",
  async ({ page }) => {
    const preview = page.getByLabel("Vista previa operativa");
    await expect(preview).toContainText("6 horas (360 min)");

    const restablecerBtn = page.getByRole("button", { name: /Restablecer/i });
    await expect(restablecerBtn).toBeEnabled();
    await restablecerBtn.click();

    await expect(page.getByLabel(/Anticipación de reserva/i)).toHaveValue("7");
    await expect(page.getByLabel(/Ventana de cancelación/i)).toHaveValue("120");
    await expect(
      page.getByRole("button", { name: /Guardar configuración/i })
    ).toBeDisabled();
  }
);

When("intenta abrir la gestión de afiliaciones del Box", async ({ page }) => {
  await page.goto("/afiliaciones");
});

When(
  "gestiona filtros, edición de roles con cambios sin guardar y confirmación inline en \\/afiliaciones",
  async ({ page }) => {
    await page.getByTestId("nav-link-afiliaciones").click();
    await expect(page).toHaveURL(/\/afiliaciones/);

    // Filtro por rol Coach y buscador
    const grupoFiltros = page.getByRole("group", { name: /Filtrar por rol/i });
    await grupoFiltros.getByRole("button", { name: "Coach" }).click();
    await expect(
      grupoFiltros.getByRole("button", { name: "Coach" })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Diego Sosa")).toBeVisible();
    await expect(page.getByText("Sofía Castro")).toHaveCount(0);

    await grupoFiltros.getByRole("button", { name: "Todos" }).click();
    const buscador = page.getByLabel(/Buscar integrante/i);
    await buscador.fill("coach@centris.dev");
    await expect(page.getByText("Valentina Ruiz")).toBeVisible();
    await buscador.fill("");

    const filaValentina = page
      .locator('[data-testid^="fila-afiliacion-"]')
      .filter({ hasText: "Valentina Ruiz" });
    await expect(filaValentina).toBeVisible();

    // Estabilidad 0 desplazamiento de Guardar roles al activar "Cambios sin guardar" en desktop
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await filaValentina.scrollIntoViewIfNeeded();
      const btnGuardar = filaValentina.getByRole("button", {
        name: /Guardar roles/i
      });
      const obtenerPosicionDocumento = async () => {
        const box = await btnGuardar.boundingBox();
        const scroll = await page.evaluate(() => ({
          x: window.scrollX,
          y: window.scrollY
        }));
        if (!box) return null;
        return {
          x: box.x + scroll.x,
          y: box.y + scroll.y,
          width: box.width,
          height: box.height
        };
      };

      const antes = await obtenerPosicionDocumento();
      expect(antes).not.toBeNull();

      const pillAtleta = filaValentina.locator('[data-testid^="checkbox-rol-atleta-"]');
      await pillAtleta.check();
      await expect(filaValentina).toContainText(/Cambios sin guardar/i);

      const despues = await obtenerPosicionDocumento();
      expect(despues).not.toBeNull();
      if (antes && despues) {
        expect(Math.abs(antes.x - despues.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(antes.y - despues.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(antes.width - despues.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(antes.height - despues.height)).toBeLessThanOrEqual(1);
      }

      await filaValentina.getByRole("button", { name: /Descartar/i }).click();
      await expect(filaValentina).not.toContainText(/Cambios sin guardar/i);
    }

    // Validación accesible sin códigos técnicos al intentar guardar con 0 roles
    const pillCoach = filaValentina.locator('[data-testid^="checkbox-rol-coach-"]');
    await pillCoach.uncheck();
    await filaValentina.getByRole("button", { name: /Guardar roles/i }).click();
    const alerta = filaValentina.getByRole("alert");
    await expect(alerta).toBeVisible();
    const textoAlerta = (await alerta.textContent()) ?? "";
    expect(textoAlerta).not.toMatch(/VALIDACION_FALLIDA|ERROR:|400|422/);
    await filaValentina.getByRole("button", { name: /Descartar/i }).click();

    // Confirmación inline de baja con opción de cancelar
    await filaValentina.getByRole("button", { name: /Dar de baja/i }).click();
    await expect(
      filaValentina.getByText(/No afectará sus cuentas en otros Boxes/i)
    ).toBeVisible();
    await filaValentina.getByRole("button", { name: /Cancelar/i }).click();
    await expect(filaValentina).toBeVisible();
  }
);

Then(
  "el botón Guardar roles no se desplaza ni deforma en escritorio, valida al menos un rol y mantiene el diseño sin desborde en móvil y escritorio",
  async ({ page }) => {
    await verificarSinDesbordeResponsive(page, [375, 1280, 1440]);
  }
);
