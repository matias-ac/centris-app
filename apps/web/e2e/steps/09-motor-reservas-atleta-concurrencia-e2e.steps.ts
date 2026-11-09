import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import {
  SEED_BOX_IDS,
  calcularInstantesClase,
  obtenerFechaLocal,
  sumarDiasAFecha
} from "@centris/shared";
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
const TIMEZONE_BA = "America/Argentina/Buenos_Aires";

const E2E_RESERVAS = {
  planId: "f9000000-0000-4000-8000-000000000001",
  membresiaMorosoId: "f9000000-0000-4000-8000-000000000011",
  membresiaAlDiaId: "f9000000-0000-4000-8000-000000000012",
  clasePrincipalId: "f9000000-0000-4000-8000-000000000021",
  claseSecundariaId: "f9000000-0000-4000-8000-000000000022",
  reservaPreviaId: "f9000000-0000-4000-8000-000000000031",
  tipoClaseWodId: "00000000-0000-4000-8000-000000000701",
  atletaMorosoEmail: "atleta.moroso@centris.dev",
  atletaAlDiaEmail: "atleta.aldia@centris.dev"
} as const;

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

async function obtenerIdsSeedNorte(): Promise<{
  coachAfiliacionId: string;
  atletaMorosoAfiliacionId: string;
  atletaMorosoUsuarioId: string;
  atletaAlDiaAfiliacionId: string;
  atletaAlDiaUsuarioId: string;
}> {
  const res = await ejecutarSqlOwner(
    `SELECT a.id AS afiliacion_id, u.id AS usuario_id, u.email
     FROM afiliaciones a
     JOIN usuarios u ON a.usuario_id = u.id
     WHERE a.box_id = $1`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );

  const coach = res.rows.find((r) => r.email === "coach@centris.dev");
  const moroso = res.rows.find(
    (r) => r.email === E2E_RESERVAS.atletaMorosoEmail
  );
  const alDia = res.rows.find(
    (r) => r.email === E2E_RESERVAS.atletaAlDiaEmail
  );

  if (!coach || !moroso || !alDia) {
    throw new Error(
      "No se encontraron las afiliaciones seed en Box Centris Norte para E2E 09."
    );
  }

  return {
    coachAfiliacionId: coach.afiliacion_id,
    atletaMorosoAfiliacionId: moroso.afiliacion_id,
    atletaMorosoUsuarioId: moroso.usuario_id,
    atletaAlDiaAfiliacionId: alDia.afiliacion_id,
    atletaAlDiaUsuarioId: alDia.usuario_id
  };
}

async function limpiarDatosE2EReservas(): Promise<void> {
  const { atletaMorosoAfiliacionId, atletaAlDiaAfiliacionId } =
    await obtenerIdsSeedNorte();

  await ejecutarSqlOwner(
    `DELETE FROM reservas WHERE box_id = $1 AND (afiliacion_id IN ($2, $3) OR clase_id IN ($4, $5))`,
    [
      SEED_BOX_IDS.boxCentrisNorte,
      atletaMorosoAfiliacionId,
      atletaAlDiaAfiliacionId,
      E2E_RESERVAS.clasePrincipalId,
      E2E_RESERVAS.claseSecundariaId
    ]
  );
  await ejecutarSqlOwner(`DELETE FROM clases WHERE id IN ($1, $2)`, [
    E2E_RESERVAS.clasePrincipalId,
    E2E_RESERVAS.claseSecundariaId
  ]);
  await ejecutarSqlOwner(
    `DELETE FROM pagos WHERE membresia_id IN ($1, $2)`,
    [E2E_RESERVAS.membresiaMorosoId, E2E_RESERVAS.membresiaAlDiaId]
  );
  await ejecutarSqlOwner(
    `DELETE FROM membresias WHERE afiliacion_id IN ($1, $2)`,
    [atletaMorosoAfiliacionId, atletaAlDiaAfiliacionId]
  );
  await ejecutarSqlOwner(`DELETE FROM planes WHERE id = $1`, [
    E2E_RESERVAS.planId
  ]);
}

After(async () => {
  await limpiarDatosE2EReservas();
});

async function loginEIrAReservas(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();

  await page.waitForURL(/\/(inicio|reservas|seleccionar-box)/);
  if (page.url().includes("seleccionar-box")) {
    const btnBox = page.getByTestId(
      `opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`
    );
    if (await btnBox.isVisible()) {
      await btnBox.click();
    }
  }

  await page.goto("/reservas");
  await expect(page).toHaveURL(/\/reservas/);
  await expect(
    page.getByRole("heading", { name: /Mis Reservas y Clases/i })
  ).toBeVisible();
}

// ---------------- ESCENARIO 1 ----------------

Given(
  "un Atleta moroso con Membresía vigente impaga autenticado en la vista móvil de Reservas",
  async ({ page }) => {
    await limpiarDatosE2EReservas();
    const { coachAfiliacionId, atletaMorosoAfiliacionId } =
      await obtenerIdsSeedNorte();

    const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const manana = sumarDiasAFecha(hoy, 1);
    const finVigencia = sumarDiasAFecha(hoy, 29);

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, 'Plan 3x Semana E2E', 42000, 30, 'SEMANAL', 3, true)`,
      [E2E_RESERVAS.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    // Membresía vigente con Precio = 42000 y 0 Pagos -> Saldo = 42000 (Moroso)
    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, 42000, 'SEMANAL', 3, 0, $5, $6)`,
      [
        E2E_RESERVAS.membresiaMorosoId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaMorosoAfiliacionId,
        E2E_RESERVAS.planId,
        hoy,
        finVigencia
      ]
    );

    const { inicio, fin } = calcularInstantesClase({
      fechaLocal: manana,
      horaInicio: "18:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 12)`,
      [
        E2E_RESERVAS.clasePrincipalId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_RESERVAS.tipoClaseWodId,
        coachAfiliacionId,
        inicio.toISOString(),
        fin.toISOString()
      ]
    );

    await loginEIrAReservas(page, E2E_RESERVAS.atletaMorosoEmail);
  }
);

When(
  "el Atleta presiona Reservar en la Clase disponible desde su interfaz móvil",
  async ({ page }) => {
    await page
      .getByTestId(`btn-reservar-clase-${E2E_RESERVAS.clasePrincipalId}`)
      .click();
    await expect(page.getByTestId("alerta-exito-reserva")).toBeVisible({
      timeout: 10000
    });
  }
);

Then(
  'se muestra la confirmación de Reserva y el contador de Cupos de la Clase pasa a {string}',
  async ({ page }, cuposTexto: string) => {
    await expect(
      page.getByTestId(
        `cupos-disponibles-clase-${E2E_RESERVAS.clasePrincipalId}`
      )
    ).toContainText(cuposTexto);
    await expect(
      page.getByTestId(
        `badge-reserva-confirmada-${E2E_RESERVAS.clasePrincipalId}`
      )
    ).toBeVisible();
  }
);

Then(
  "la Clase figura dentro de la sección Mis Reservas Confirmadas del Atleta",
  async ({ page }) => {
    const seccionMisReservas = page.getByTestId("seccion-mis-reservas");
    await expect(seccionMisReservas).toBeVisible();
    await expect(
      page.getByTestId(`item-mi-reserva-${E2E_RESERVAS.clasePrincipalId}`)
    ).toBeVisible();
  }
);

// ---------------- ESCENARIO 2 ----------------

Given(
  "un Atleta con Membresía semanal de 1 crédito ya consumido en la semana pero con 1 crédito extra en bolsa",
  async ({ page }) => {
    await limpiarDatosE2EReservas();
    const {
      coachAfiliacionId,
      atletaAlDiaAfiliacionId,
      atletaAlDiaUsuarioId
    } = await obtenerIdsSeedNorte();

    const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    // Si hoy es domingo (ISO 7), usamos hoy mismo con dos horarios distintos para que ambas clases caigan en la misma semana ISO
    const fechaMismaSemana = hoy;
    const finVigencia = sumarDiasAFecha(hoy, 29);

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, 'Plan 1x Semana E2E', 28000, 30, 'SEMANAL', 1, true)`,
      [E2E_RESERVAS.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, 28000, 'SEMANAL', 1, 1, $5, $6)`,
      [
        E2E_RESERVAS.membresiaAlDiaId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        E2E_RESERVAS.planId,
        hoy,
        finVigencia
      ]
    );

    const clase1 = calcularInstantesClase({
      fechaLocal: fechaMismaSemana,
      horaInicio: "08:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });
    const clase2 = calcularInstantesClase({
      fechaLocal: fechaMismaSemana,
      horaInicio: "19:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES
         ($1, $2, $3, $4, $5, $6, 15),
         ($7, $2, $3, $4, $8, $9, 15)`,
      [
        E2E_RESERVAS.clasePrincipalId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_RESERVAS.tipoClaseWodId,
        coachAfiliacionId,
        clase1.inicio.toISOString(),
        clase1.fin.toISOString(),
        E2E_RESERVAS.claseSecundariaId,
        clase2.inicio.toISOString(),
        clase2.fin.toISOString()
      ]
    );

    // Reserva previa que ya consumió el único crédito semanal base
    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_RESERVAS.reservaPreviaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_RESERVAS.clasePrincipalId,
        atletaAlDiaAfiliacionId,
        E2E_RESERVAS.membresiaAlDiaId,
        atletaAlDiaUsuarioId
      ]
    );

    await loginEIrAReservas(page, E2E_RESERVAS.atletaAlDiaEmail);
  }
);

When(
  "el Atleta reserva una segunda Clase dentro de la misma semana desde la vista de Reservas",
  async ({ page }) => {
    await expect(page.getByTestId("creditos-extra-restantes")).toContainText(
      "1"
    );
    await page
      .getByTestId(`btn-reservar-clase-${E2E_RESERVAS.claseSecundariaId}`)
      .click();
    await expect(page.getByTestId("alerta-exito-reserva")).toBeVisible({
      timeout: 10000
    });
  }
);

Then(
  "la segunda Reserva queda confirmada y el indicador de créditos extra restantes muestra {int}",
  async ({ page }, extraRestantes: number) => {
    await expect(
      page.getByTestId(
        `badge-reserva-confirmada-${E2E_RESERVAS.claseSecundariaId}`
      )
    ).toBeVisible();
    await expect(page.getByTestId("creditos-extra-restantes")).toContainText(
      String(extraRestantes)
    );
  }
);

// ---------------- ESCENARIO 3 ----------------

Given(
  'un Atleta autenticado en la vista de Reservas que ya tiene una Reserva confirmada a las {string} y otra Clase a las {string}',
  async ({ page }, hora1: string, hora2: string) => {
    await limpiarDatosE2EReservas();
    const {
      coachAfiliacionId,
      atletaAlDiaAfiliacionId,
      atletaAlDiaUsuarioId
    } = await obtenerIdsSeedNorte();

    const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const manana = sumarDiasAFecha(hoy, 1);
    const finVigencia = sumarDiasAFecha(hoy, 29);

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, 'Pase Libre E2E', 55000, 30, 'ILIMITADO', NULL, true)`,
      [E2E_RESERVAS.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, 55000, 'ILIMITADO', NULL, 0, $5, $6)`,
      [
        E2E_RESERVAS.membresiaAlDiaId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        E2E_RESERVAS.planId,
        hoy,
        finVigencia
      ]
    );

    const clase1 = calcularInstantesClase({
      fechaLocal: manana,
      horaInicio: hora1,
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });
    const clase2 = calcularInstantesClase({
      fechaLocal: manana,
      horaInicio: hora2,
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES
         ($1, $2, $3, $4, $5, $6, 15),
         ($7, $2, $3, $4, $8, $9, 15)`,
      [
        E2E_RESERVAS.clasePrincipalId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_RESERVAS.tipoClaseWodId,
        coachAfiliacionId,
        clase1.inicio.toISOString(),
        clase1.fin.toISOString(),
        E2E_RESERVAS.claseSecundariaId,
        clase2.inicio.toISOString(),
        clase2.fin.toISOString()
      ]
    );

    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_RESERVAS.reservaPreviaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_RESERVAS.clasePrincipalId,
        atletaAlDiaAfiliacionId,
        E2E_RESERVAS.membresiaAlDiaId,
        atletaAlDiaUsuarioId
      ]
    );

    await loginEIrAReservas(page, E2E_RESERVAS.atletaAlDiaEmail);
  }
);

When(
  'el Atleta intenta reservar la Clase superpuesta de las {string}',
  async ({ page }, _hora2: string) => {
    await page
      .getByTestId(`btn-reservar-clase-${E2E_RESERVAS.claseSecundariaId}`)
      .click();
  }
);

Then(
  "la interfaz de Reservas muestra una alerta de error indicando superposición horaria",
  async ({ page }) => {
    const alertaError = page.getByTestId("alerta-error-reserva");
    await expect(alertaError).toBeVisible({ timeout: 10000 });
    await expect(alertaError).toContainText(/superpone|superpuesto/i);
  }
);
