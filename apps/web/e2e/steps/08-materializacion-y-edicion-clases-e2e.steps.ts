import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import {
  SEED_BOX_IDS,
  diaSemanaIso,
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

const E2E_CLASES = {
  horarioId: "f8000000-0000-4000-8000-000000000001",
  planId: "f8000000-0000-4000-8000-000000000020",
  membresiaId1: "f8000000-0000-4000-8000-000000000031",
  membresiaId2: "f8000000-0000-4000-8000-000000000032",
  reservaId1: "f8000000-0000-4000-8000-000000000011",
  reservaId2: "f8000000-0000-4000-8000-000000000012",
  tipoClaseId: "00000000-0000-4000-8000-000000000701", // WOD
  adminUsuarioId: "00000000-0000-4000-8000-000000000201",
  usuarioAdminEmail: "admin@centris.dev",
  usuarioRecepcionEmail: "recepcion@centris.dev"
};

let e2eClaseGeneradaId: string = "";

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

async function obtenerAfiliacionesCoaches(): Promise<{
  titularId: string;
  suplenteId: string;
}> {
  const res = await ejecutarSqlOwner(
    `SELECT a.id, u.email FROM afiliaciones a
     JOIN usuarios u ON a.usuario_id = u.id
     WHERE a.box_id = $1 AND 'coach' = ANY(a.roles)`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );

  const titular = res.rows.find((r) => r.email === "coach@centris.dev");
  const suplente = res.rows.find((r) => r.email === "coach.multi@centris.dev");

  if (!titular || !suplente) {
    throw new Error("No se encontraron afiliaciones de coach para el test E2E.");
  }

  return {
    titularId: titular.id,
    suplenteId: suplente.id
  };
}

async function obtenerAfiliacionesAtletas(): Promise<{
  atleta1Id: string;
  atleta2Id: string;
}> {
  const res = await ejecutarSqlOwner(
    `SELECT a.id, u.email FROM afiliaciones a
     JOIN usuarios u ON a.usuario_id = u.id
     WHERE a.box_id = $1 AND 'atleta' = ANY(a.roles)`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );

  if (res.rows.length < 2) {
    throw new Error("Se necesitan al menos 2 atletas en el Box para el test E2E.");
  }

  return {
    atleta1Id: res.rows[0].id,
    atleta2Id: res.rows[1].id
  };
}

async function limpiarDatosE2E(): Promise<void> {
  await ejecutarSqlOwner(`DELETE FROM reservas WHERE box_id = $1`, [
    SEED_BOX_IDS.boxCentrisNorte
  ]);
  await ejecutarSqlOwner(`DELETE FROM clases WHERE box_id = $1`, [
    SEED_BOX_IDS.boxCentrisNorte
  ]);
  await ejecutarSqlOwner(`DELETE FROM membresias WHERE id IN ($1, $2)`, [
    E2E_CLASES.membresiaId1,
    E2E_CLASES.membresiaId2
  ]);
  await ejecutarSqlOwner(`DELETE FROM planes WHERE id = $1`, [
    E2E_CLASES.planId
  ]);
  await ejecutarSqlOwner(`DELETE FROM horarios WHERE id = $1`, [
    E2E_CLASES.horarioId
  ]);
}

After(async () => {
  await limpiarDatosE2E();
});

async function loginYVisitarClases(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();

  await page.waitForURL(/\/(inicio|clases|seleccionar-box)/);
  if (page.url().includes("seleccionar-box")) {
    const btnBox = page.getByTestId(`opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`);
    if (await btnBox.isVisible()) {
      await btnBox.click();
    }
  }

  await page.goto("/clases");
  await expect(page).toHaveURL(/\/clases/);
  await expect(
    page.getByRole("heading", { name: /Calendario de Clases/i })
  ).toBeVisible();
}

async function asegurarClaseProgramada(): Promise<string> {
  if (e2eClaseGeneradaId) {
    const res = await ejecutarSqlOwner(
      `SELECT id FROM clases WHERE id = $1`,
      [e2eClaseGeneradaId]
    );
    if (res.rows.length > 0) {
      return e2eClaseGeneradaId;
    }
  }

  const { titularId } = await obtenerAfiliacionesCoaches();
  const hoy = obtenerFechaLocal(new Date(), "America/Argentina/Buenos_Aires");
  const manana = sumarDiasAFecha(hoy, 1);
  const diaSemana = diaSemanaIso(manana);

  await ejecutarSqlOwner(
    `INSERT INTO horarios (id, box_id, tipo_clase_id, coach_afiliacion_id, dia_semana, hora_inicio, duracion_minutos, cupos_default, activo)
     VALUES ($1, $2, $3, $4, $5, '07:00', 60, 16, true)
     ON CONFLICT (id) DO UPDATE SET coach_afiliacion_id = $4`,
    [
      E2E_CLASES.horarioId,
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_CLASES.tipoClaseId,
      titularId,
      diaSemana
    ]
  );

  const resClase = await ejecutarSqlOwner(
    `INSERT INTO clases (box_id, horario_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
     VALUES ($1, $2, $3, $4, ($5 || ' 10:00:00+00')::timestamptz, ($5 || ' 11:00:00+00')::timestamptz, 16)
     RETURNING id`,
    [
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_CLASES.horarioId,
      E2E_CLASES.tipoClaseId,
      titularId,
      manana
    ]
  );
  e2eClaseGeneradaId = resClase.rows[0].id;
  return e2eClaseGeneradaId;
}

// ---------------- ESCENARIO 1 ----------------

Given(
  'un Administrador autenticado en la pantalla de Clases con un Horario recurrente a las {string}',
  async ({ page }, hora: string) => {
    await limpiarDatosE2E();

    const { titularId } = await obtenerAfiliacionesCoaches();
    const hoy = obtenerFechaLocal(new Date(), "America/Argentina/Buenos_Aires");
    const manana = sumarDiasAFecha(hoy, 1);
    const diaSemana = diaSemanaIso(manana);

    await ejecutarSqlOwner(
      `INSERT INTO horarios (id, box_id, tipo_clase_id, coach_afiliacion_id, dia_semana, hora_inicio, duracion_minutos, cupos_default, activo)
       VALUES ($1, $2, $3, $4, $5, $6, 60, 16, true)`,
      [
        E2E_CLASES.horarioId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_CLASES.tipoClaseId,
        titularId,
        diaSemana,
        hora
      ]
    );

    await loginYVisitarClases(page, E2E_CLASES.usuarioAdminEmail);
  }
);

When('ejecuta la materialización de Clases', async ({ page }) => {
  await page.getByTestId("btn-materializar-clases").click();
  await expect(page.getByTestId("alerta-exito-clase")).toBeVisible({
    timeout: 10000
  });
});

Then(
  'se visualizan las Clases generadas con el horario local {string}',
  async ({ page }, rangoHorario: string) => {
    const textoHorario = page.getByText(rangoHorario).first();
    await expect(textoHorario).toBeVisible();

    // Guardar el ID de la primera clase visible para los siguientes escenarios
    const primeraCard = page.locator("[data-testid^='card-clase-']").first();
    const testId = await primeraCard.getAttribute("data-testid");
    if (testId) {
      e2eClaseGeneradaId = testId.replace("card-clase-", "");
    }
  }
);

Then(
  'la fecha y hora UTC almacenada en base de datos corresponde a las {string}',
  async ({}, horaUtc: string) => {
    const res = await ejecutarSqlOwner(
      `SELECT inicio::text, fin::text FROM clases
       WHERE box_id = $1 AND horario_id = $2
       ORDER BY inicio ASC LIMIT 1`,
      [SEED_BOX_IDS.boxCentrisNorte, E2E_CLASES.horarioId]
    );

    expect(res.rows.length).toBeGreaterThan(0);
    const inicioStr = res.rows[0].inicio as string;
    expect(inicioStr).toContain(horaUtc);
  }
);

// ---------------- ESCENARIO 2 ----------------

Given(
  'un Administrador autenticado en la pantalla de Clases con una Clase programada',
  async ({ page }) => {
    await asegurarClaseProgramada();
    await loginYVisitarClases(page, E2E_CLASES.usuarioAdminEmail);
  }
);

When(
  'edita la Clase puntual asignando al coach suplente',
  async ({ page }) => {
    const { suplenteId } = await obtenerAfiliacionesCoaches();
    await page.getByTestId(`btn-editar-clase-${e2eClaseGeneradaId}`).click();
    await page.getByTestId("select-coach-suplente").selectOption(suplenteId);
    await page.getByTestId("btn-guardar-edicion-clase").click();
    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible({
      timeout: 10000
    });
  }
);

Then(
  'la tarjeta de la Clase refleja al nuevo coach suplente',
  async ({ page }) => {
    const badgeCoach = page.getByTestId(`coach-clase-${e2eClaseGeneradaId}`);
    await expect(badgeCoach).toHaveText(/Diego Sosa/i);
  }
);

Then(
  'el Horario recurrente en la base de datos conserva su coach titular original',
  async ({}) => {
    const { titularId } = await obtenerAfiliacionesCoaches();
    const res = await ejecutarSqlOwner(
      `SELECT coach_afiliacion_id FROM horarios WHERE id = $1`,
      [E2E_CLASES.horarioId]
    );

    expect(res.rows[0].coach_afiliacion_id).toBe(titularId);
  }
);

// ---------------- ESCENARIO 3 ----------------

Given(
  'un Recepcionista autenticado en la pantalla de Clases',
  async ({ page }) => {
    await asegurarClaseProgramada();
    await loginYVisitarClases(page, E2E_CLASES.usuarioRecepcionEmail);
  }
);

When(
  'edita la Clase puntual incrementando los Cupos a {int}',
  async ({ page }, nuevosCupos: number) => {
    await page.getByTestId(`btn-editar-clase-${e2eClaseGeneradaId}`).click();
    await page
      .getByTestId("input-editar-cupos")
      .fill(nuevosCupos.toString());
    await page.getByTestId("btn-guardar-edicion-clase").click();
    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible({
      timeout: 10000
    });
  }
);

Then(
  'la tarjeta de la Clase muestra {int} cupos disponibles',
  async ({ page }, cuposEsperados: number) => {
    const spanCupos = page.getByTestId(`cupos-clase-${e2eClaseGeneradaId}`);
    await expect(spanCupos).toContainText(` / ${cuposEsperados}`);
  }
);

// ---------------- ESCENARIO 4 ----------------

Given(
  'un Administrador autenticado en la pantalla de Clases con una Clase que tiene {int} reservas confirmadas',
  async ({ page }, _cantidadReservas: number) => {
    const claseId = await asegurarClaseProgramada();
    const { atleta1Id, atleta2Id } = await obtenerAfiliacionesAtletas();

    // 1. Plan si no existe
    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, activo)
       VALUES ($1, $2, 'Plan E2E Clases', 30000, 30, 'ILIMITADO', true)
       ON CONFLICT (id) DO NOTHING`,
      [E2E_CLASES.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    // 2. Membresías para atleta1 y atleta2
    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, fecha_inicio, fecha_fin)
       VALUES
         ($1, $2, $3, $4, 30000, 'ILIMITADO', '2026-11-01', '2026-11-30'),
         ($5, $2, $6, $4, 30000, 'ILIMITADO', '2026-11-01', '2026-11-30')
       ON CONFLICT (id) DO NOTHING`,
      [
        E2E_CLASES.membresiaId1,
        SEED_BOX_IDS.boxCentrisNorte,
        atleta1Id,
        E2E_CLASES.planId,
        E2E_CLASES.membresiaId2,
        atleta2Id
      ]
    );

    // 3. Reservas confirmadas
    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES
         ($1, $2, $3, $4, $5, $6, 'CONFIRMADA'),
         ($7, $2, $3, $8, $9, $6, 'CONFIRMADA')
       ON CONFLICT (id) DO UPDATE SET estado = 'CONFIRMADA'`,
      [
        E2E_CLASES.reservaId1,
        SEED_BOX_IDS.boxCentrisNorte,
        claseId,
        atleta1Id,
        E2E_CLASES.membresiaId1,
        E2E_CLASES.adminUsuarioId,
        E2E_CLASES.reservaId2,
        atleta2Id,
        E2E_CLASES.membresiaId2
      ]
    );

    await loginYVisitarClases(page, E2E_CLASES.usuarioAdminEmail);
  }
);

When(
  'intenta reducir los Cupos de la Clase a {int}',
  async ({ page }, cuposMenores: number) => {
    await page.getByTestId(`btn-editar-clase-${e2eClaseGeneradaId}`).click();
    await page
      .getByTestId("input-editar-cupos")
      .fill(cuposMenores.toString());
    await page.getByTestId("btn-guardar-edicion-clase").click();
  }
);

Then(
  'la interfaz muestra un error indicando que los cupos no pueden ser menores a las reservas confirmadas',
  async ({ page }) => {
    const alertaError = page.getByTestId("alerta-error-clase");
    await expect(alertaError).toBeVisible({ timeout: 10000 });
    await expect(alertaError).toContainText(/reservas confirmadas/i);
  }
);
