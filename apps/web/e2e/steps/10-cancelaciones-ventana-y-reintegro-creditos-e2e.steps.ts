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

const E2E_CANCELACIONES = {
  planId: "fa000000-0000-4000-8000-000000000001",
  membresiaId: "fa000000-0000-4000-8000-000000000011",
  membresiaMorosoId: "fa000000-0000-4000-8000-000000000012",
  claseId: "fa000000-0000-4000-8000-000000000021",
  reservaId: "fa000000-0000-4000-8000-000000000031",
  tipoClaseWodId: "00000000-0000-4000-8000-000000000701",
  atletaAlDiaEmail: "atleta.aldia@centris.dev",
  atletaMorosoEmail: "atleta.moroso@centris.dev",
  adminNorteEmail: "admin@centris.dev"
} as const;

const EXTRA_ATLETAS_14 = Array.from({ length: 14 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return {
    usuarioId: `fa100000-0000-4000-8000-0000000000${num}`,
    afiliacionId: `fa200000-0000-4000-8000-0000000000${num}`,
    membresiaId: `fa300000-0000-4000-8000-0000000000${num}`,
    reservaId: `fa400000-0000-4000-8000-0000000000${num}`,
    email: `atleta.fcfs.e2e.${num}@centris.test`,
    nombre: `Atleta FCFS E2E ${num}`
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
  atletaAlDiaAfiliacionId: string;
  atletaAlDiaUsuarioId: string;
  atletaMorosoAfiliacionId: string;
  atletaMorosoUsuarioId: string;
}> {
  const res = await ejecutarSqlOwner(
    `SELECT a.id AS afiliacion_id, u.id AS usuario_id, u.email
     FROM afiliaciones a
     JOIN usuarios u ON a.usuario_id = u.id
     WHERE a.box_id = $1`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );

  const coach = res.rows.find((r) => r.email === "coach@centris.dev");
  const alDia = res.rows.find(
    (r) => r.email === E2E_CANCELACIONES.atletaAlDiaEmail
  );
  const moroso = res.rows.find(
    (r) => r.email === E2E_CANCELACIONES.atletaMorosoEmail
  );

  if (!coach || !alDia || !moroso) {
    throw new Error(
      "No se encontraron las afiliaciones seed en Box Centris Norte para E2E 10."
    );
  }

  return {
    coachAfiliacionId: coach.afiliacion_id,
    atletaAlDiaAfiliacionId: alDia.afiliacion_id,
    atletaAlDiaUsuarioId: alDia.usuario_id,
    atletaMorosoAfiliacionId: moroso.afiliacion_id,
    atletaMorosoUsuarioId: moroso.usuario_id
  };
}

async function limpiarDatosE2ECancelaciones(): Promise<void> {
  const { atletaAlDiaAfiliacionId, atletaMorosoAfiliacionId } =
    await obtenerIdsSeedNorte();

  const extraAfiliacionIds = EXTRA_ATLETAS_14.map((a) => a.afiliacionId);
  const extraUsuarioIds = EXTRA_ATLETAS_14.map((a) => a.usuarioId);

  await ejecutarSqlOwner(
    `DELETE FROM reservas WHERE box_id = $1 AND (afiliacion_id = ANY($2::uuid[]) OR clase_id = $3 OR id = $4)`,
    [
      SEED_BOX_IDS.boxCentrisNorte,
      [
        atletaAlDiaAfiliacionId,
        atletaMorosoAfiliacionId,
        ...extraAfiliacionIds
      ],
      E2E_CANCELACIONES.claseId,
      E2E_CANCELACIONES.reservaId
    ]
  );
  await ejecutarSqlOwner(`DELETE FROM clases WHERE id = $1`, [
    E2E_CANCELACIONES.claseId
  ]);
  await ejecutarSqlOwner(
    `DELETE FROM pagos WHERE membresia_id IN ($1, $2)`,
    [E2E_CANCELACIONES.membresiaId, E2E_CANCELACIONES.membresiaMorosoId]
  );
  await ejecutarSqlOwner(
    `DELETE FROM membresias WHERE afiliacion_id = ANY($1::uuid[])`,
    [[atletaAlDiaAfiliacionId, atletaMorosoAfiliacionId, ...extraAfiliacionIds]]
  );
  await ejecutarSqlOwner(
    `DELETE FROM afiliaciones WHERE id = ANY($1::uuid[])`,
    [extraAfiliacionIds]
  );
  await ejecutarSqlOwner(`DELETE FROM usuarios WHERE id = ANY($1::uuid[])`, [
    extraUsuarioIds
  ]);
  await ejecutarSqlOwner(`DELETE FROM planes WHERE id = $1`, [
    E2E_CANCELACIONES.planId
  ]);
  await ejecutarSqlOwner(
    `UPDATE boxes SET ventana_cancelacion_minutos = 120, anticipacion_reserva_dias = 7 WHERE id = $1`,
    [SEED_BOX_IDS.boxCentrisNorte]
  );
}

After(async () => {
  await limpiarDatosE2ECancelaciones();
});

async function loginEnBoxNorte(
  page: Page,
  email: string,
  rutaDestino: string
): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/Contraseña/i).fill("Centris123!");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();

  await page.waitForURL(/\/(inicio|reservas|clases|seleccionar-box)/);
  if (page.url().includes("seleccionar-box")) {
    const btnBox = page.getByTestId(
      `opcion-box-${SEED_BOX_IDS.boxCentrisNorte}`
    );
    if (await btnBox.isVisible()) {
      await btnBox.click();
    }
  }

  await page.goto(rutaDestino);
}

async function sembrarReservaParaMinutosFuturos(
  minutosHastaInicio: number
): Promise<void> {
  await limpiarDatosE2ECancelaciones();
  const {
    coachAfiliacionId,
    atletaAlDiaAfiliacionId,
    atletaAlDiaUsuarioId
  } = await obtenerIdsSeedNorte();

  const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);
  const ayer = sumarDiasAFecha(hoy, -1);
  const finVigencia = sumarDiasAFecha(hoy, 29);

  await ejecutarSqlOwner(
    `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
     VALUES ($1, $2, 'Plan 1x Semana Cancel E2E', 28000, 30, 'SEMANAL', 1, true)`,
    [E2E_CANCELACIONES.planId, SEED_BOX_IDS.boxCentrisNorte]
  );

  await ejecutarSqlOwner(
    `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4, 28000, 'SEMANAL', 1, 0, $5, $6)`,
    [
      E2E_CANCELACIONES.membresiaId,
      SEED_BOX_IDS.boxCentrisNorte,
      atletaAlDiaAfiliacionId,
      E2E_CANCELACIONES.planId,
      ayer,
      finVigencia
    ]
  );

  const inicio = new Date(Date.now() + minutosHastaInicio * 60_000);
  const fin = new Date(inicio.getTime() + 60 * 60_000);

  await ejecutarSqlOwner(
    `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
     VALUES ($1, $2, $3, $4, $5, $6, 12)`,
    [
      E2E_CANCELACIONES.claseId,
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_CANCELACIONES.tipoClaseWodId,
      coachAfiliacionId,
      inicio.toISOString(),
      fin.toISOString()
    ]
  );

  await ejecutarSqlOwner(
    `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
     VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
    [
      E2E_CANCELACIONES.reservaId,
      SEED_BOX_IDS.boxCentrisNorte,
      E2E_CANCELACIONES.claseId,
      atletaAlDiaAfiliacionId,
      E2E_CANCELACIONES.membresiaId,
      atletaAlDiaUsuarioId
    ]
  );
}

// ---------------- ESCENARIO 1 ----------------

Given(
  "un Atleta con Membresía semanal de 1 crédito que reservó una Clase fuera de la Ventana de Cancelación",
  async ({ page }) => {
    // 180 minutos antes de inicio (> ventana_cancelacion_minutos = 120)
    await sembrarReservaParaMinutosFuturos(180);
    await loginEnBoxNorte(
      page,
      E2E_CANCELACIONES.atletaAlDiaEmail,
      "/reservas"
    );
    await expect(page.getByTestId("creditos-periodo-restantes")).toContainText(
      "0 / 1"
    );
  }
);

When(
  "el Atleta cancela su Reserva en término desde la vista de Reservas",
  async ({ page }) => {
    await page
      .getByTestId(`btn-cancelar-reserva-${E2E_CANCELACIONES.claseId}`)
      .click();
    await expect(page.getByTestId("alerta-exito-reserva")).toBeVisible({
      timeout: 10000
    });
  }
);

Then(
  'el contador de Créditos del Período vuelve a mostrar {string} y el Cupo de la Clase pasa a {string}',
  async ({ page }, creditosTexto: string, cuposTexto: string) => {
    await expect(page.getByTestId("creditos-periodo-restantes")).toContainText(
      creditosTexto
    );
    await expect(
      page.getByTestId(`cupos-disponibles-clase-${E2E_CANCELACIONES.claseId}`)
    ).toContainText(cuposTexto);
  }
);

Then(
  'la Reserva figura en el historial con estado {string}',
  async ({ page }, estadoTexto: string) => {
    const itemHistorial = page.getByTestId(
      `item-historial-reserva-${E2E_CANCELACIONES.reservaId}`
    );
    await expect(itemHistorial).toBeVisible();
    await expect(itemHistorial).toContainText(estadoTexto);
  }
);

// ---------------- ESCENARIO 2 ----------------

Given(
  "un Atleta con Membresía semanal de 1 crédito que tiene una Reserva confirmada dentro de la Ventana de Cancelación",
  async ({ page }) => {
    // 90 minutos antes de inicio (< ventana_cancelacion_minutos = 120)
    await sembrarReservaParaMinutosFuturos(90);
    await loginEnBoxNorte(
      page,
      E2E_CANCELACIONES.atletaAlDiaEmail,
      "/reservas"
    );
    await expect(page.getByTestId("creditos-periodo-restantes")).toContainText(
      "0 / 1"
    );
  }
);

When(
  "el Atleta presiona Cancelar Reserva y visualiza la advertencia de Cancelación Tardía",
  async ({ page }) => {
    await page
      .getByTestId(`btn-cancelar-reserva-${E2E_CANCELACIONES.claseId}`)
      .click();
    const advertencia = page.getByTestId(
      `advertencia-cancelacion-tardia-${E2E_CANCELACIONES.claseId}`
    );
    await expect(advertencia).toBeVisible();
    await expect(advertencia).toContainText(/Cancelación Tardía/i);
  }
);

When("confirma la Cancelación Tardía desde la interfaz", async ({ page }) => {
  await page
    .getByTestId(
      `btn-confirmar-cancelacion-tardia-${E2E_CANCELACIONES.claseId}`
    )
    .click();
  await expect(page.getByTestId("alerta-exito-reserva")).toBeVisible({
    timeout: 10000
  });
});

Then(
  'el Cupo de la Clase se libera pasando a {string} pero el contador de Créditos del Período permanece en {string}',
  async ({ page }, cuposTexto: string, creditosTexto: string) => {
    await expect(
      page.getByTestId(`cupos-disponibles-clase-${E2E_CANCELACIONES.claseId}`)
    ).toContainText(cuposTexto);
    await expect(page.getByTestId("creditos-periodo-restantes")).toContainText(
      creditosTexto
    );
  }
);

// ---------------- ESCENARIO 3 (FCFS 15/15 -> 14/15 -> 15/15) ----------------

Given(
  'una Clase con Cupos agotados en {string} donde un Atleta cancela su Reserva',
  async ({ page }, cuposAgotadosTexto: string) => {
    await limpiarDatosE2ECancelaciones();
    const {
      coachAfiliacionId,
      atletaAlDiaAfiliacionId,
      atletaAlDiaUsuarioId,
      atletaMorosoAfiliacionId
    } = await obtenerIdsSeedNorte();

    const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const ayer = sumarDiasAFecha(hoy, -1);
    const finVigencia = sumarDiasAFecha(hoy, 29);

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, 'Plan FCFS E2E', 35000, 30, 'SEMANAL', 3, true)`,
      [E2E_CANCELACIONES.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    // Membresía para atletaAlDia (quien cancelará su lugar #15) y atletaMoroso (quien tomará el cupo liberado)
    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
       VALUES
         ($1, $3, $4, $6, 35000, 'SEMANAL', 3, 0, $7, $8),
         ($2, $3, $5, $6, 35000, 'SEMANAL', 3, 0, $7, $8)`,
      [
        E2E_CANCELACIONES.membresiaId,
        E2E_CANCELACIONES.membresiaMorosoId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        atletaMorosoAfiliacionId,
        E2E_CANCELACIONES.planId,
        ayer,
        finVigencia
      ]
    );

    const inicio = new Date(Date.now() + 240 * 60_000);
    const fin = new Date(inicio.getTime() + 60 * 60_000);

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 15)`,
      [
        E2E_CANCELACIONES.claseId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_CANCELACIONES.tipoClaseWodId,
        coachAfiliacionId,
        inicio.toISOString(),
        fin.toISOString()
      ]
    );

    // Sembrar 14 atletas adicionales + atletaAlDia = 15 Reservas confirmadas (15/15)
    for (const extra of EXTRA_ATLETAS_14) {
      await ejecutarSqlOwner(
        `INSERT INTO usuarios (id, email, nombre, password_hash) VALUES ($1, $2, $3, NULL)`,
        [extra.usuarioId, extra.email, extra.nombre]
      );
      await ejecutarSqlOwner(
        `INSERT INTO afiliaciones (id, box_id, usuario_id, roles, activo)
         VALUES ($1, $2, $3, ARRAY['atleta'], true)`,
        [extra.afiliacionId, SEED_BOX_IDS.boxCentrisNorte, extra.usuarioId]
      );
      await ejecutarSqlOwner(
        `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
         VALUES ($1, $2, $3, $4, 35000, 'SEMANAL', 3, 0, $5, $6)`,
        [
          extra.membresiaId,
          SEED_BOX_IDS.boxCentrisNorte,
          extra.afiliacionId,
          E2E_CANCELACIONES.planId,
          ayer,
          finVigencia
        ]
      );
      await ejecutarSqlOwner(
        `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
        [
          extra.reservaId,
          SEED_BOX_IDS.boxCentrisNorte,
          E2E_CANCELACIONES.claseId,
          extra.afiliacionId,
          extra.membresiaId,
          extra.usuarioId
        ]
      );
    }

    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_CANCELACIONES.reservaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_CANCELACIONES.claseId,
        atletaAlDiaAfiliacionId,
        E2E_CANCELACIONES.membresiaId,
        atletaAlDiaUsuarioId
      ]
    );

    await loginEnBoxNorte(
      page,
      E2E_CANCELACIONES.atletaAlDiaEmail,
      "/reservas"
    );
    await expect(
      page.getByTestId(`cupos-disponibles-clase-${E2E_CANCELACIONES.claseId}`)
    ).toContainText(cuposAgotadosTexto);

    await page
      .getByTestId(`btn-cancelar-reserva-${E2E_CANCELACIONES.claseId}`)
      .click();
    await expect(page.getByTestId("alerta-exito-reserva")).toBeVisible({
      timeout: 10000
    });
  }
);

When(
  'un segundo Atleta con Membresía vigente ingresa a la grilla de Reservas y ve {string}',
  async ({ page }, cuposLiberadosTexto: string) => {
    await loginEnBoxNorte(
      page,
      E2E_CANCELACIONES.atletaMorosoEmail,
      "/reservas"
    );
    await expect(
      page.getByTestId(`cupos-disponibles-clase-${E2E_CANCELACIONES.claseId}`)
    ).toContainText(cuposLiberadosTexto);
  }
);

When("presiona Reservar en esa Clase desde la grilla", async ({ page }) => {
  await page
    .getByTestId(`btn-reservar-clase-${E2E_CANCELACIONES.claseId}`)
    .click();
  await expect(page.getByTestId("alerta-exito-reserva")).toBeVisible({
    timeout: 10000
  });
});

Then(
  'obtiene el Cupo inmediatamente pasando la Clase a {string}',
  async ({ page }, cuposFinalesTexto: string) => {
    await expect(
      page.getByTestId(`cupos-disponibles-clase-${E2E_CANCELACIONES.claseId}`)
    ).toContainText(cuposFinalesTexto);
    await expect(
      page.getByTestId(
        `badge-reserva-confirmada-${E2E_CANCELACIONES.claseId}`
      )
    ).toBeVisible();
  }
);

// ---------------- ESCENARIO 4 ----------------

Given(
  "una Clase que comienza en 30 minutos con una Reserva confirmada que consumió el único Crédito semanal de un Atleta",
  async () => {
    await sembrarReservaParaMinutosFuturos(30);
  }
);

When(
  'el Administrador cancela la Clase desde el Calendario de Clases indicando el motivo {string}',
  async ({ page }, motivo: string) => {
    await loginEnBoxNorte(page, E2E_CANCELACIONES.adminNorteEmail, "/clases");
    await page
      .getByTestId(`btn-abrir-cancelar-clase-${E2E_CANCELACIONES.claseId}`)
      .click();
    await page.getByTestId("input-motivo-cancelacion-clase").fill(motivo);
    await page.getByTestId("btn-confirmar-cancelar-clase").click();
    await expect(page.getByTestId("alerta-exito-clase")).toBeVisible({
      timeout: 10000
    });
  }
);

Then(
  'la tarjeta de la Clase muestra el estado {string} y el motivo {string}',
  async ({ page }, estadoClase: string, motivo: string) => {
    const cardClase = page.getByTestId(
      `card-clase-${E2E_CANCELACIONES.claseId}`
    );
    await expect(cardClase).toBeVisible();
    await expect(cardClase).toContainText(estadoClase);
    await expect(cardClase).toContainText(motivo);
  }
);

Then(
  'cuando el Atleta consulta su vista de Reservas ve la Reserva como {string} y su Crédito restituido en {string}',
  async ({ page }, estadoReserva: string, creditosTexto: string) => {
    await loginEnBoxNorte(
      page,
      E2E_CANCELACIONES.atletaAlDiaEmail,
      "/reservas"
    );
    await expect(page.getByTestId("creditos-periodo-restantes")).toContainText(
      creditosTexto
    );
    const itemHistorial = page.getByTestId(
      `item-historial-reserva-${E2E_CANCELACIONES.reservaId}`
    );
    await expect(itemHistorial).toBeVisible();
    await expect(itemHistorial).toContainText(estadoReserva);
  }
);

// ---------------- ESCENARIO 5 (Baja Anticipada en cascada) ----------------

Given(
  "un Atleta con Membresía vigente y una Reserva confirmada para una Clase de la próxima semana",
  async () => {
    await limpiarDatosE2ECancelaciones();
    const {
      coachAfiliacionId,
      atletaAlDiaAfiliacionId,
      atletaAlDiaUsuarioId
    } = await obtenerIdsSeedNorte();

    const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);
    const finVigencia = sumarDiasAFecha(hoy, 29);

    await ejecutarSqlOwner(
      `INSERT INTO planes (id, box_id, nombre, precio_base, duracion_dias, modalidad_creditos, creditos_por_periodo, activo)
       VALUES ($1, $2, 'Plan Cascada Baja E2E', 40000, 30, 'SEMANAL', 3, true)`,
      [E2E_CANCELACIONES.planId, SEED_BOX_IDS.boxCentrisNorte]
    );

    await ejecutarSqlOwner(
      `INSERT INTO membresias (id, box_id, afiliacion_id, plan_id, precio, modalidad_creditos, creditos_por_periodo, creditos_extra, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, 40000, 'SEMANAL', 3, 0, $5, $6)`,
      [
        E2E_CANCELACIONES.membresiaId,
        SEED_BOX_IDS.boxCentrisNorte,
        atletaAlDiaAfiliacionId,
        E2E_CANCELACIONES.planId,
        hoy,
        finVigencia
      ]
    );

    // Clase en +5 días (dentro de anticipacion_reserva_dias = 7, posterior a hoy)
    const inicioFutura = new Date(Date.now() + 5 * 24 * 60 * 60_000);
    const finFutura = new Date(inicioFutura.getTime() + 60 * 60_000);

    await ejecutarSqlOwner(
      `INSERT INTO clases (id, box_id, tipo_clase_id, coach_afiliacion_id, inicio, fin, cupos)
       VALUES ($1, $2, $3, $4, $5, $6, 12)`,
      [
        E2E_CANCELACIONES.claseId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_CANCELACIONES.tipoClaseWodId,
        coachAfiliacionId,
        inicioFutura.toISOString(),
        finFutura.toISOString()
      ]
    );

    await ejecutarSqlOwner(
      `INSERT INTO reservas (id, box_id, clase_id, afiliacion_id, membresia_id, creada_por_usuario_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMADA')`,
      [
        E2E_CANCELACIONES.reservaId,
        SEED_BOX_IDS.boxCentrisNorte,
        E2E_CANCELACIONES.claseId,
        atletaAlDiaAfiliacionId,
        E2E_CANCELACIONES.membresiaId,
        atletaAlDiaUsuarioId
      ]
    );
  }
);

When(
  "el Administrador ejecuta la Baja Anticipada de la Membresía del Atleta con fecha de hoy desde el Directorio de Atletas",
  async ({ page }) => {
    const { atletaAlDiaAfiliacionId } = await obtenerIdsSeedNorte();
    const hoy = obtenerFechaLocal(new Date(), TIMEZONE_BA);

    await loginEnBoxNorte(page, E2E_CANCELACIONES.adminNorteEmail, "/atletas");
    await page
      .getByTestId(`btn-ficha-atleta-${atletaAlDiaAfiliacionId}`)
      .click();
    await expect(page.getByTestId("modal-ficha-atleta")).toBeVisible();

    const fila = page
      .getByTestId("seccion-membresias")
      .getByTestId("fila-membresia")
      .first();
    await fila.getByTestId("input-fecha-baja").fill(hoy);
    await fila.getByTestId("btn-baja-anticipada").click();
    await expect(fila.getByTestId("membresia-fecha-fin")).toHaveText(hoy);
  }
);

Then(
  'la Reserva futura del Atleta pasa al historial como {string} y el Cupo de esa Clase futura queda en {string}',
  async ({ page }, estadoTexto: string, cuposTexto: string) => {
    await loginEnBoxNorte(
      page,
      E2E_CANCELACIONES.atletaAlDiaEmail,
      "/reservas"
    );
    const itemHistorial = page.getByTestId(
      `item-historial-reserva-${E2E_CANCELACIONES.reservaId}`
    );
    await expect(itemHistorial).toBeVisible();
    await expect(itemHistorial).toContainText(estadoTexto);
    await expect(
      page.getByTestId(`cupos-disponibles-clase-${E2E_CANCELACIONES.claseId}`)
    ).toContainText(cuposTexto);
  }
);
