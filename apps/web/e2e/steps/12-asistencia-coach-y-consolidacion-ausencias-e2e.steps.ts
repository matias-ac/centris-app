import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import {
  SEED_BOX_IDS,
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

const E2E_ASISTENCIAS = {
  planId: "fc000000-0000-4000-8000-000000000001",
  membresiaId: "fc000000-0000-4000-8000-000000000011",
  claseCoachId: "fc000000-0000-4000-8000-000000000021",
  claseOtroCoachId: "fc000000-0000-4000-8000-000000000022",
  claseVentana24hId: "fc000000-0000-4000-8000-000000000023",
  claseVencidaId: "fc000000-0000-4000-8000-000000000024",
  reservaCoachId: "fc000000-0000-4000-8000-000000000031",
  reservaVentanaId: "fc000000-0000-4000-8000-000000000033",
  reservaVencidaId: "fc000000-0000-4000-8000-000000000034",
  tipoClaseWodId: "00000000-0000-4000-8000-000000000701",
  coachEmail: "coach@centris.dev",
  coachMultiEmail: "coach.multi@centris.dev",
  recepcionEmail: "recepcion@centris.dev",
  adminEmail: "admin@centris.dev",
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
  coachUsuarioId: string;
  coachMultiAfiliacionId: string;
  coachMultiUsuarioId: string;
  recepcionAfiliacionId: string;
  recepcionUsuarioId: string;
  adminAfiliacionId: string;
  adminUsuarioId: string;
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

  const coach = res.rows.find((r) => r.email === E2E_ASISTENCIAS.coachEmail);
  const coachMulti = res.rows.find(
    (r) => r.email === E2E_ASISTENCIAS.coachMultiEmail
  );
  const recepcion = res.rows.find(
    (r) => r.email === E2E_ASISTENCIAS.recepcionEmail
  );
  const admin = res.rows.find((r) => r.email === E2E_ASISTENCIAS.adminEmail);
  const alDia = res.rows.find(
    (r) => r.email === E2E_ASISTENCIAS.atletaAlDiaEmail
  );

  if (!coach || !coachMulti || !recepcion || !admin || !alDia) {
    throw new Error(
      "No se encontraron las afiliaciones seed en Box Centris Norte para E2E 12."
    );
  }

  return {
    coachAfiliacionId: coach.afiliacion_id,
    coachUsuarioId: coach.usuario_id,
    coachMultiAfiliacionId: coachMulti.afiliacion_id,
    coachMultiUsuarioId: coachMulti.usuario_id,
    recepcionAfiliacionId: recepcion.afiliacion_id,
    recepcionUsuarioId: recepcion.usuario_id,
    adminAfiliacionId: admin.afiliacion_id,
    adminUsuarioId: admin.usuario_id,
    atletaAlDiaAfiliacionId: alDia.afiliacion_id,
    atletaAlDiaUsuarioId: alDia.usuario_id
  };
}

async function limpiarDatosE2EAsistencias(): Promise<void> {
  const pool = new pg.Pool({ connectionString: MIGRATION_URL });
  try {
    await pool.query(
      `DELETE FROM reservas WHERE box_id = $1 AND id IN ($2, $3, $4)`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.reservaCoachId,
        E2E_ASISTENCIAS.reservaVentanaId,
        E2E_ASISTENCIAS.reservaVencidaId
      ]
    );
    await pool.query(
      `DELETE FROM reservas WHERE box_id = $1 AND clase_id IN ($2, $3, $4, $5)`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.claseCoachId,
        E2E_ASISTENCIAS.claseOtroCoachId,
        E2E_ASISTENCIAS.claseVentana24hId,
        E2E_ASISTENCIAS.claseVencidaId
      ]
    );
    await pool.query(
      `DELETE FROM clases WHERE box_id = $1 AND id IN ($2, $3, $4, $5)`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.claseCoachId,
        E2E_ASISTENCIAS.claseOtroCoachId,
        E2E_ASISTENCIAS.claseVentana24hId,
        E2E_ASISTENCIAS.claseVencidaId
      ]
    );
    await pool.query(
      `DELETE FROM membresias WHERE box_id = $1 AND id = $2`,
      [SEED_BOX_IDS.boxCentrisNorte, E2E_ASISTENCIAS.membresiaId]
    );
    await pool.query(`DELETE FROM planes WHERE box_id = $1 AND id = $2`, [
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_ASISTENCIAS.planId
    ]);
  } finally {
    await pool.end();
  }
}

async function asegurarPlanYMembresiaAtleta(): Promise<void> {
  const { atletaAlDiaAfiliacionId } = await obtenerIdsSeedNorte();
  const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);

  await ejecutarSqlOwner(
    `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos)
     VALUES ($1, $2, 'Plan Libre Asistencia E2E', 50000, 60, 'ILIMITADO')
     ON CONFLICT (box_id, id) DO NOTHING`,
    [E2E_ASISTENCIAS.planId, SEED_BOX_IDS.boxCentrisNorte]
  );

  await ejecutarSqlOwner(
    `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, fecha_inicio, fecha_fin, modalidad_creditos, precio)
     VALUES ($1, $2, $3, $4, $5, $6, 'ILIMITADO', 50000)
     ON CONFLICT (id) DO NOTHING`,
    [
      E2E_ASISTENCIAS.membresiaId,
      SEED_BOX_IDS.boxCentrisNorte,
      atletaAlDiaAfiliacionId,
      E2E_ASISTENCIAS.planId,
      sumarDiasAFecha(hoyLocal, -30),
      sumarDiasAFecha(hoyLocal, 30)
    ]
  );
}

After(async () => {
  await limpiarDatosE2EAsistencias();
});

async function loginEIrA(page: Page, email: string, ruta: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();

  await page.waitForURL(/\/(inicio|clases|reservas|seleccionar-box)/);
  if (page.url().includes("seleccionar-box")) {
    const card = page.getByTestId(
      `opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`
    );
    if (await card.isVisible()) {
      await card.getByRole("button", { name: /Ingresar al Box/i }).click();
      await page.waitForURL(/\/(inicio|clases|reservas)/);
    }
  }

  await page.goto(ruta);
  await expect(page).toHaveURL(new RegExp(ruta));
}

// ---------------- ESCENARIO 1 ----------------

Given(
  "un usuario autenticado con rol exclusivo de {string} en Box Centris Norte para asistencias",
  async ({ page }, _rol: string) => {
    await limpiarDatosE2EAsistencias();
    await asegurarPlanYMembresiaAtleta();
    await loginEIrA(page, E2E_ASISTENCIAS.coachEmail, "/clases");
  }
);

Given(
  "dos Clases materializadas: una asignada a dicho Coach y otra dictada por un Coach diferente",
  async () => {
    const {
      coachAfiliacionId,
      coachMultiAfiliacionId,
      atletaAlDiaAfiliacionId,
      atletaAlDiaUsuarioId
    } = await obtenerIdsSeedNorte();

    const inicioClase1 = new Date(Date.now() + 2 * 3600_000);
    const finClase1 = new Date(inicioClase1.getTime() + 3600_000);

    const inicioClase2 = new Date(Date.now() + 4 * 3600_000);
    const finClase2 = new Date(inicioClase2.getTime() + 3600_000);

    // Clase 1 asignada a coach@centris.dev
    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 15)`,
      [
        E2E_ASISTENCIAS.claseCoachId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.tipoClaseWodId,
        coachAfiliacionId,
        inicioClase1.toISOString(),
        finClase1.toISOString()
      ]
    );

    // Reserva del atleta en Clase 1
    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_ASISTENCIAS.reservaCoachId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.claseCoachId,
        atletaAlDiaAfiliacionId,
        E2E_ASISTENCIAS.membresiaId,
        atletaAlDiaUsuarioId
      ]
    );

    // Clase 2 asignada a coach.multi@centris.dev
    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 15)`,
      [
        E2E_ASISTENCIAS.claseOtroCoachId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.tipoClaseWodId,
        coachMultiAfiliacionId,
        inicioClase2.toISOString(),
        finClase2.toISOString()
      ]
    );
  }
);

When(
  "el Coach consulta la barra de navegación y el Calendario de Clases",
  async ({ page }) => {
    await page.goto("/clases");
    await expect(
      page.getByRole("heading", { name: /Calendario de Clases/i })
    ).toBeVisible();
  }
);

Then(
  "no visualiza accesos a Caja, Morosos ni Configuración del Box",
  async ({ page }) => {
    await expect(page.getByTestId("nav-link-caja")).not.toBeVisible();
    await expect(page.getByTestId("nav-link-configuracion")).not.toBeVisible();
    await expect(page.getByTestId("nav-link-atletas")).not.toBeVisible();
    await expect(page.getByTestId("nav-link-planes")).not.toBeVisible();
  }
);

Then(
  "visualiza en su agenda únicamente la Clase que tiene asignada con su nómina de Atletas inscriptos",
  async ({ page }) => {
    // La clase del coach está visible
    await expect(
      page.getByTestId(`card-clase-${E2E_ASISTENCIAS.claseCoachId}`)
    ).toBeVisible();

    // La clase del otro coach no está visible para el coach con rol exclusivo
    await expect(
      page.getByTestId(`card-clase-${E2E_ASISTENCIAS.claseOtroCoachId}`)
    ).not.toBeVisible();

    // Abre el panel de asistencia de su clase
    await page
      .getByTestId(`btn-asistencia-clase-${E2E_ASISTENCIAS.claseCoachId}`)
      .click();

    await expect(
      page.getByTestId("panel-asistencia-clase")
    ).toBeVisible();
    await expect(
      page.getByTestId(`fila-asistencia-reserva-${E2E_ASISTENCIAS.reservaCoachId}`)
    ).toBeVisible();
  }
);

When(
  "cuando inicia sesión un {string} o un {string}",
  async ({ page }, _rol1: string, _rol2: string) => {
    await loginEIrA(page, E2E_ASISTENCIAS.recepcionEmail, "/clases");
  }
);

Then(
  "puede gestionar la Asistencia en las Clases de cualquier Coach del Box",
  async ({ page }) => {
    // Recepción visualiza ambas clases
    await expect(
      page.getByTestId(`card-clase-${E2E_ASISTENCIAS.claseCoachId}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`card-clase-${E2E_ASISTENCIAS.claseOtroCoachId}`)
    ).toBeVisible();

    // Puede abrir el panel de asistencia en la clase del otro coach
    await page
      .getByTestId(`btn-asistencia-clase-${E2E_ASISTENCIAS.claseOtroCoachId}`)
      .click();

    await expect(
      page.getByTestId("panel-asistencia-clase")
    ).toBeVisible();
    await expect(
      page.getByTestId("aviso-solo-coach-asignado")
    ).not.toBeVisible();
  }
);

// ---------------- ESCENARIO 2 ----------------

Given(
  "una Clase finalizada hace menos de 24 horas con una Reserva confirmada",
  async () => {
    await limpiarDatosE2EAsistencias();
    await asegurarPlanYMembresiaAtleta();

    const { coachAfiliacionId, atletaAlDiaAfiliacionId, atletaAlDiaUsuarioId } =
      await obtenerIdsSeedNorte();

    // Finalizada hace 1 hora (dentro de la ventana de 24 horas)
    const fin = new Date(Date.now() - 3600_000);
    const inicio = new Date(fin.getTime() - 3600_000);

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 12)`,
      [
        E2E_ASISTENCIAS.claseVentana24hId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.tipoClaseWodId,
        coachAfiliacionId,
        inicio.toISOString(),
        fin.toISOString()
      ]
    );

    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_ASISTENCIAS.reservaVentanaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.claseVentana24hId,
        atletaAlDiaAfiliacionId,
        E2E_ASISTENCIAS.membresiaId,
        atletaAlDiaUsuarioId
      ]
    );
  }
);

When(
  "el Coach asignado abre el panel de control de Asistencia",
  async ({ page }) => {
    await loginEIrA(page, E2E_ASISTENCIAS.coachEmail, "/clases");
    await page
      .getByTestId(`btn-asistencia-clase-${E2E_ASISTENCIAS.claseVentana24hId}`)
      .click();
    await expect(
      page.getByTestId("panel-asistencia-clase")
    ).toBeVisible();
  }
);

When("marca el presente del Atleta", async ({ page }) => {
  await page
    .getByTestId(`btn-marcar-asistencia-${E2E_ASISTENCIAS.reservaVentanaId}`)
    .click();
});

Then(
  "la Reserva se visualiza como {string} con la hora y el operador registrados",
  async ({ page }, _estado: string) => {
    await expect(
      page.getByTestId(`badge-presente-${E2E_ASISTENCIAS.reservaVentanaId}`)
    ).toBeVisible();

    const { rows } = await ejecutarSqlOwner(
      `SELECT asistencia_marcada_en, asistencia_por_usuario_id
       FROM reservas
       WHERE id = $1`,
      [E2E_ASISTENCIAS.reservaVentanaId]
    );

    expect(rows[0]?.asistencia_marcada_en).not.toBeNull();
    expect(rows[0]?.asistencia_por_usuario_id).not.toBeNull();
  }
);

When(
  "rectifica la lista desmarcando la Asistencia dentro del plazo permitido",
  async ({ page }) => {
    await page
      .getByTestId(`btn-desmarcar-asistencia-${E2E_ASISTENCIAS.reservaVentanaId}`)
      .click();
  }
);

Then(
  "la Reserva vuelve al estado {string}",
  async ({ page }, _estado: string) => {
    await expect(
      page.getByTestId(`badge-sin-marcar-${E2E_ASISTENCIAS.reservaVentanaId}`)
    ).toBeVisible();

    const { rows } = await ejecutarSqlOwner(
      `SELECT asistencia_marcada_en, asistencia_por_usuario_id
       FROM reservas
       WHERE id = $1`,
      [E2E_ASISTENCIAS.reservaVentanaId]
    );

    expect(rows[0]?.asistencia_marcada_en).toBeNull();
    expect(rows[0]?.asistencia_por_usuario_id).toBeNull();
  }
);

// ---------------- ESCENARIO 3 ----------------

Given(
  "una Clase finalizada hace más de 24 horas con una Reserva confirmada sin presente",
  async () => {
    await limpiarDatosE2EAsistencias();
    await asegurarPlanYMembresiaAtleta();

    const { coachAfiliacionId, atletaAlDiaAfiliacionId, atletaAlDiaUsuarioId } =
      await obtenerIdsSeedNorte();

    // Finalizada hace 26 horas (> 24 hs de fin)
    const fin = new Date(Date.now() - 26 * 3600_000);
    const inicio = new Date(fin.getTime() - 3600_000);

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 12)`,
      [
        E2E_ASISTENCIAS.claseVencidaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.tipoClaseWodId,
        coachAfiliacionId,
        inicio.toISOString(),
        fin.toISOString()
      ]
    );

    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_ASISTENCIAS.reservaVencidaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_ASISTENCIAS.claseVencidaId,
        atletaAlDiaAfiliacionId,
        E2E_ASISTENCIAS.membresiaId,
        atletaAlDiaUsuarioId
      ]
    );
  }
);

When(
  "el Coach o Recepcionista abre el panel de Asistencia de dicha Clase",
  async ({ page }) => {
    await loginEIrA(page, E2E_ASISTENCIAS.coachEmail, "/clases");
    await page
      .getByTestId(`btn-asistencia-clase-${E2E_ASISTENCIAS.claseVencidaId}`)
      .click();
  }
);

Then(
  "la interfaz muestra la advertencia de Ventana de Corrección Vencida y bloquea la modificación",
  async ({ page }) => {
    await expect(
      page.getByTestId("panel-asistencia-clase")
    ).toBeVisible();

    await expect(
      page.getByTestId("aviso-ventana-asistencia-expirada")
    ).toBeVisible();

    await expect(
      page.getByTestId(`btn-marcar-asistencia-${E2E_ASISTENCIAS.reservaVencidaId}`)
    ).not.toBeVisible();

    await expect(
      page.getByTestId(`badge-ausencia-${E2E_ASISTENCIAS.reservaVencidaId}`)
    ).toBeVisible();
  }
);

When(
  "el Atleta consulta su historial de reservas",
  async ({ page }) => {
    await loginEIrA(page, E2E_ASISTENCIAS.atletaAlDiaEmail, "/reservas");
  }
);

Then(
  "visualiza la Reserva consolidada con el indicador {string} y el Crédito perdido",
  async ({ page }, _indicador: string) => {
    await expect(
      page.getByTestId(`badge-ausencia-${E2E_ASISTENCIAS.reservaVencidaId}`)
    ).toBeVisible();

    await expect(
      page.getByTestId(`btn-cancelar-reserva-${E2E_ASISTENCIAS.claseVencidaId}`)
    ).not.toBeVisible();
  }
);
