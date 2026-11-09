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

const E2E_WALKINS = {
  planId: "fb000000-0000-4000-8000-000000000001",
  membresiaId: "fb000000-0000-4000-8000-000000000011",
  clasePermisosId: "fb000000-0000-4000-8000-000000000021",
  claseCuposId: "fb000000-0000-4000-8000-000000000022",
  claseCreditosId: "fb000000-0000-4000-8000-000000000023",
  claseConsumoId: "fb000000-0000-4000-8000-000000000024",
  tipoClaseWodId: "00000000-0000-4000-8000-000000000701",
  coachEmail: "coach@centris.dev",
  coachMultiEmail: "coach.multi@centris.dev",
  recepcionEmail: "recepcion@centris.dev",
  atletaAlDiaEmail: "atleta.aldia@centris.dev"
} as const;

const ATLETAS_CLASE_20 = Array.from({ length: 20 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return {
    usuarioId: `fb100000-0000-4000-8000-0000000000${num}`,
    afiliacionId: `fb200000-0000-4000-8000-0000000000${num}`,
    membresiaId: `fb300000-0000-4000-8000-0000000000${num}`,
    email: `atleta.walkin.e2e.${num}@centris.test`,
    nombre: `Atleta Walkin E2E ${num}`
  };
});

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
  coachMultiAfiliacionId: string;
  coachMultiUsuarioId: string;
  recepcionAfiliacionId: string;
  recepcionUsuarioId: string;
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

  const coach = res.rows.find((r) => r.email === E2E_WALKINS.coachEmail);
  const coachMulti = res.rows.find(
    (r) => r.email === E2E_WALKINS.coachMultiEmail
  );
  const recepcion = res.rows.find((r) => r.email === E2E_WALKINS.recepcionEmail);
  const alDia = res.rows.find(
    (r) => r.email === E2E_WALKINS.atletaAlDiaEmail
  );

  if (!coach || !coachMulti || !recepcion || !alDia) {
    throw new Error(
      "No se encontraron las afiliaciones seed en Box Centris Norte para E2E 11."
    );
  }

  return {
    coachAfiliacionId: coach.afiliacion_id,
    coachMultiAfiliacionId: coachMulti.afiliacion_id,
    coachMultiUsuarioId: coachMulti.usuario_id,
    recepcionAfiliacionId: recepcion.afiliacion_id,
    recepcionUsuarioId: recepcion.usuario_id,
    atletaAlDiaAfiliacionId: alDia.afiliacion_id,
    atletaAlDiaUsuarioId: alDia.usuario_id
  };
}

async function limpiarDatosE2EWalkins(): Promise<void> {
  const pool = new pg.Pool({ connectionString: MIGRATION_URL });
  try {
    await pool.query(
      `DELETE FROM reservas WHERE box_id = $1 AND clase_id IN ($2, $3, $4, $5)`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.clasePermisosId,
        E2E_WALKINS.claseCuposId,
        E2E_WALKINS.claseCreditosId,
        E2E_WALKINS.claseConsumoId
      ]
    );
    await pool.query(
      `DELETE FROM clases WHERE box_id = $1 AND id IN ($2, $3, $4, $5)`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.clasePermisosId,
        E2E_WALKINS.claseCuposId,
        E2E_WALKINS.claseCreditosId,
        E2E_WALKINS.claseConsumoId
      ]
    );
    await pool.query(
      `DELETE FROM membresias WHERE box_id = $1 AND id = $2`,
      [SEED_BOX_IDS.boxCentrisNorte, E2E_WALKINS.membresiaId]
    );
    const afiliacionesExtras = ATLETAS_CLASE_20.map((a) => a.afiliacionId);
    await pool.query(
      `DELETE FROM reservas WHERE box_id = $1 AND afiliacion_id = ANY($2::uuid[])`,
      [SEED_BOX_IDS.boxCentrisNorte, afiliacionesExtras]
    );
    await pool.query(
      `DELETE FROM membresias WHERE box_id = $1 AND afiliacion_id = ANY($2::uuid[])`,
      [SEED_BOX_IDS.boxCentrisNorte, afiliacionesExtras]
    );
    await pool.query(
      `DELETE FROM afiliaciones WHERE box_id = $1 AND id = ANY($2::uuid[])`,
      [SEED_BOX_IDS.boxCentrisNorte, afiliacionesExtras]
    );
    const usuariosExtras = ATLETAS_CLASE_20.map((a) => a.usuarioId);
    await pool.query(`DELETE FROM usuarios WHERE id = ANY($1::uuid[])`, [
      usuariosExtras
    ]);
    await pool.query(`DELETE FROM planes WHERE box_id = $1 AND id = $2`, [
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_WALKINS.planId
    ]);
  } finally {
    await pool.end();
  }
}

After(async () => {
  await limpiarDatosE2EWalkins();
});

async function loginEIrAClases(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();

  await page.waitForURL(/\/(inicio|clases|seleccionar-box)/);
  if (page.url().includes("seleccionar-box")) {
    const card = page.getByTestId(
      `opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`
    );
    if (await card.isVisible()) {
      await card.getByRole("button", { name: /Ingresar al Box/i }).click();
      await page.waitForURL(/\/inicio/);
    }
  }

  await page.goto("/clases");
  await expect(page).toHaveURL(/\/clases/);
  await expect(
    page.getByRole("heading", { name: /Calendario de Clases/i })
  ).toBeVisible();
}

// ---------------- ESCENARIO 1 ----------------

Given(
  "un usuario autenticado con rol exclusivo de {string} en Box Centris Norte",
  async ({ page }, _rol: string) => {
    await limpiarDatosE2EWalkins();

    const { coachAfiliacionId, atletaAlDiaAfiliacionId } =
      await obtenerIdsSeedNorte();
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);
    const { inicio, fin } = calcularInstantesClase({
      fechaLocal: mananaLocal,
      horaInicio: "10:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 15)`,
      [
        E2E_WALKINS.clasePermisosId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.tipoClaseWodId,
        coachAfiliacionId,
        inicio.toISOString(),
        fin.toISOString()
      ]
    );

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos)
       VALUES ($1, $2, 'Plan Pase Libre Walkin', 50000, 30, 'ILIMITADO')
       ON CONFLICT (box_id, id) DO NOTHING`,
      [E2E_WALKINS.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, fecha_inicio, fecha_fin, modalidad_creditos, precio)
       VALUES ($1, $2, $3, $4, $5, $6, 'ILIMITADO', 50000)
       ON CONFLICT (id) DO NOTHING`,
      [
        E2E_WALKINS.membresiaId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        E2E_WALKINS.planId,
        hoyLocal,
        sumarDiasAFecha(hoyLocal, 30)
      ]
    );

    await loginEIrAClases(page, E2E_WALKINS.coachEmail);
  }
);

When("consulta el Calendario de Clases", async ({ page }) => {
  await expect(page).toHaveURL(/\/clases/);
});

Then(
  "no visualiza el botón de Anotar Walk-in en ninguna Clase",
  async ({ page }) => {
    const botones = page.locator('[data-testid^="btn-walkin-clase-"]');
    await expect(botones).toHaveCount(0);
  }
);

When(
  "cuando inicia sesión un {string} o un usuario con roles combinados {string}",
  async ({ page }, _rol1: string, _rol2: string) => {
    await loginEIrAClases(page, E2E_WALKINS.coachMultiEmail);
  }
);

When(
  "selecciona una Clase no cancelada para anotar un Walk-in",
  async ({ page }) => {
    const btn = page.getByTestId(
      `btn-walkin-clase-${E2E_WALKINS.clasePermisosId}`
    );
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.getByTestId("form-walkin")).toBeVisible();
  }
);

Then(
  "puede registrar exitosamente al Atleta espontáneo registrando al operador en creada_por_usuario_id",
  async ({ page }) => {
    const { atletaAlDiaAfiliacionId, coachMultiUsuarioId } =
      await obtenerIdsSeedNorte();

    await page
      .getByTestId("select-atleta-walkin")
      .selectOption(atletaAlDiaAfiliacionId);
    await page.getByTestId("btn-confirmar-walkin").click();

    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible();

    const res = await ejecutarSqlOwner(
      `SELECT creada_por_usuario_id FROM reservas WHERE box_id = $1 AND clase_id = $2 AND afiliacion_id = $3`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.clasePermisosId,
        atletaAlDiaAfiliacionId
      ]
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].creada_por_usuario_id).toBe(coachMultiUsuarioId);
  }
);

// ---------------- ESCENARIO 2 ----------------

Given(
  "una Clase con Cupos agotados en {string} en Box Centris Norte",
  async ({ page }, _cuposStr: string) => {
    await limpiarDatosE2EWalkins();

    const { coachAfiliacionId, atletaAlDiaAfiliacionId } =
      await obtenerIdsSeedNorte();
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);
    const { inicio, fin } = calcularInstantesClase({
      fechaLocal: mananaLocal,
      horaInicio: "19:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 20)`,
      [
        E2E_WALKINS.claseCuposId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.tipoClaseWodId,
        coachAfiliacionId,
        inicio.toISOString(),
        fin.toISOString()
      ]
    );

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos)
       VALUES ($1, $2, 'Plan Pase Libre Walkin', 50000, 30, 'ILIMITADO')
       ON CONFLICT (box_id, id) DO NOTHING`,
      [E2E_WALKINS.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    // Membresía para Atleta al Día
    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, fecha_inicio, fecha_fin, modalidad_creditos, precio)
       VALUES ($1, $2, $3, $4, $5, $6, 'ILIMITADO', 50000)
       ON CONFLICT (id) DO NOTHING`,
      [
        E2E_WALKINS.membresiaId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        E2E_WALKINS.planId,
        hoyLocal,
        sumarDiasAFecha(hoyLocal, 30)
      ]
    );

    // Crear 20 atletas e inscribirlos para llenar la clase a 20/20
    const pool = new pg.Pool({ connectionString: MIGRATION_URL });
    try {
      for (const a of ATLETAS_CLASE_20) {
        await pool.query(
          `INSERT INTO usuarios (id, email, nombre) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [a.usuarioId, a.email, a.nombre]
        );
        await pool.query(
          `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo) VALUES ($1, $2, $3, ARRAY['atleta'], true) ON CONFLICT DO NOTHING`,
          [a.afiliacionId, SEED_BOX_IDS.boxCentrisNorte, a.usuarioId]
        );
        await pool.query(
          `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, fecha_inicio, fecha_fin, modalidad_creditos, precio)
           VALUES ($1, $2, $3, $4, $5, $6, 'ILIMITADO', 50000) ON CONFLICT DO NOTHING`,
          [
            a.membresiaId,
            SEED_BOX_IDS.boxCentrisNorte,
            a.afiliacionId,
            E2E_WALKINS.planId,
            hoyLocal,
            sumarDiasAFecha(hoyLocal, 30)
          ]
        );
        await pool.query(
          `INSERT INTO reservas (box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
           VALUES ($1, $2, $3, $4, $5, 'CONFIRMADA')`,
          [
            SEED_BOX_IDS.boxCentrisNorte,
            E2E_WALKINS.claseCuposId,
            a.afiliacionId,
            a.membresiaId,
            a.usuarioId
          ]
        );
      }
    } finally {
      await pool.end();
    }
  }
);

When(
  "el {string} intenta anotar un Walk-in para un Atleta con Membresía vigente",
  async ({ page }, _rol: string) => {
    await loginEIrAClases(page, E2E_WALKINS.recepcionEmail);

    const btn = page.getByTestId(
      `btn-walkin-clase-${E2E_WALKINS.claseCuposId}`
    );
    await expect(btn).toBeVisible();
    await btn.click();

    const { atletaAlDiaAfiliacionId } = await obtenerIdsSeedNorte();
    await page
      .getByTestId("select-atleta-walkin")
      .selectOption(atletaAlDiaAfiliacionId);
    await page.getByTestId("btn-confirmar-walkin").click();
  }
);

Then(
  "la interfaz muestra el rechazo por Cupo Agotado y ofrece la opción de editar el Cupo",
  async ({ page }) => {
    await expect(page.getByTestId("alerta-error-walkin")).toBeVisible();
    await expect(page.getByTestId("btn-guia-editar-cupo")).toBeVisible();
  }
);

When(
  "cuando el Recepcionista aumenta los Cupos de la Clase a {string} y vuelve a confirmar el Walk-in",
  async ({ page }, nuevosCupos: string) => {
    await page.getByTestId("btn-guia-editar-cupo").click();
    await page.getByTestId("input-editar-cupos").fill(nuevosCupos);
    await page.getByTestId("btn-guardar-edicion-clase").click();

    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible();

    // Reabrir Walk-in
    await page
      .getByTestId(`btn-walkin-clase-${E2E_WALKINS.claseCuposId}`)
      .click();
    const { atletaAlDiaAfiliacionId } = await obtenerIdsSeedNorte();
    await page
      .getByTestId("select-atleta-walkin")
      .selectOption(atletaAlDiaAfiliacionId);
    await page.getByTestId("btn-confirmar-walkin").click();
  }
);

Then(
  "la Reserva se registra exitosamente y el Cupo de la Clase pasa a {string}",
  async ({ page }, cuposEsperados: string) => {
    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible();
    await expect(
      page.getByTestId(`cupos-clase-${E2E_WALKINS.claseCuposId}`)
    ).toContainText(cuposEsperados);
  }
);

// ---------------- ESCENARIO 3 ----------------

Given(
  "un Atleta que no dispone de Créditos libres en su Membresía para la fecha de la Clase",
  async ({ page }, _unused?: unknown) => {
    await limpiarDatosE2EWalkins();

    const { coachAfiliacionId, atletaAlDiaAfiliacionId, atletaAlDiaUsuarioId } =
      await obtenerIdsSeedNorte();
    const hoyLocal = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const mananaLocal = sumarDiasAFecha(hoyLocal, 1);

    const { inicio: inicio1, fin: fin1 } = calcularInstantesClase({
      fechaLocal: mananaLocal,
      horaInicio: "18:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });
    const { inicio: inicio2, fin: fin2 } = calcularInstantesClase({
      fechaLocal: mananaLocal,
      horaInicio: "09:00",
      duracionMinutos: 60,
      timezone: TIMEZONE_BA
    });

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 15),
              ($7, $2, $3, $4, $8, $9, 15)`,
      [
        E2E_WALKINS.claseCreditosId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.tipoClaseWodId,
        coachAfiliacionId,
        inicio1.toISOString(),
        fin1.toISOString(),
        E2E_WALKINS.claseConsumoId,
        inicio2.toISOString(),
        fin2.toISOString()
      ]
    );

    // Plan semanal de 1 crédito
    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo)
       VALUES ($1, $2, 'Plan 1 Semanal Walkin', 25000, 30, 'SEMANAL', 1)
       ON CONFLICT (box_id, id) DO NOTHING`,
      [E2E_WALKINS.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, fecha_inicio, fecha_fin, modalidad_creditos, creditos_por_periodo, creditos_extra, precio)
       VALUES ($1, $2, $3, $4, $5, $6, 'SEMANAL', 1, 0, 25000)
       ON CONFLICT (id) DO NOTHING`,
      [
        E2E_WALKINS.membresiaId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        E2E_WALKINS.planId,
        hoyLocal,
        sumarDiasAFecha(hoyLocal, 30)
      ]
    );

    // Consumir el único crédito en claseConsumoId
    await ejecutarSqlOwner(
      `INSERT INTO reservas (box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, 'CONFIRMADA')`,
      [
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_WALKINS.claseConsumoId,
        atletaAlDiaAfiliacionId,
        E2E_WALKINS.membresiaId,
        atletaAlDiaUsuarioId
      ]
    );
  }
);

When(
  "el {string} intenta inscribir al Atleta espontáneo como Walk-in",
  async ({ page }, _rol: string) => {
    await loginEIrAClases(page, E2E_WALKINS.recepcionEmail);

    const btn = page.getByTestId(
      `btn-walkin-clase-${E2E_WALKINS.claseCreditosId}`
    );
    await expect(btn).toBeVisible();
    await btn.click();

    const { atletaAlDiaAfiliacionId } = await obtenerIdsSeedNorte();
    await page
      .getByTestId("select-atleta-walkin")
      .selectOption(atletaAlDiaAfiliacionId);
    await page.getByTestId("btn-confirmar-walkin").click();
  }
);

Then(
  "la interfaz rechaza la Reserva por falta de Créditos y ofrece el acceso para regularizar su cuenta",
  async ({ page }) => {
    await expect(page.getByTestId("alerta-error-walkin")).toBeVisible();
    const link = page.getByTestId("link-regularizar-atleta");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/atletas");
  }
);

When(
  "cuando el Recepcionista le acredita 1 Crédito Extra y vuelve a confirmar la inscripción",
  async ({ page }) => {
    await ejecutarSqlOwner(
      `UPDATE membresias SET creditos_extra = creditos_extra + 1 WHERE id = $1`,
      [E2E_WALKINS.membresiaId]
    );

    await page.getByTestId("btn-confirmar-walkin").click();
  }
);

Then(
  "la Reserva del Walk-in se confirma exitosamente",
  async ({ page }) => {
    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible();
    await expect(
      page.getByTestId(`cupos-clase-${E2E_WALKINS.claseCreditosId}`)
    ).toContainText("1 / 15");
  }
);
