import { SEED_BOX_IDS } from "@centris/shared";
import pg from "pg";
import {
  cargarVariablesDeEntorno,
  exigirVariableDeEntorno
} from "../common/config/env.js";
import { hashearContrasena } from "../modules/auth/contrasenas.js";

export const SEED_IDS = {
  boxCentrisNorte: SEED_BOX_IDS.boxCentrisNorte,
  boxCentrisSur: SEED_BOX_IDS.boxCentrisSur,
  usuarioAdmin: "00000000-0000-4000-8000-000000000201",
  usuarioRecepcion: "00000000-0000-4000-8000-000000000202",
  usuarioCoachMulti: "00000000-0000-4000-8000-000000000203",
  usuarioCoach: "00000000-0000-4000-8000-000000000204",
  usuarioAtletaAlDia: "00000000-0000-4000-8000-000000000205",
  usuarioAtletaMoroso: "00000000-0000-4000-8000-000000000206",
  usuarioAtletaNuevo: "00000000-0000-4000-8000-000000000207"
} as const;

export async function ejecutarSeed(connectionString?: string): Promise<void> {
  cargarVariablesDeEntorno();
  const url =
    connectionString ??
    process.env.MIGRATION_DATABASE_URL ??
    exigirVariableDeEntorno("DATABASE_URL");

  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1");
  const useSsl =
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
    (isRemote && process.env.NODE_ENV === "production");

  const pool = new pg.Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });
  try {
    await pool.query(
      `INSERT INTO boxes (id, nombre, slug, timezone, moneda, anticipacion_reserva_dias, ventana_cancelacion_minutos)
       VALUES
         ($1, 'Box Centris Norte', 'centris-norte', 'America/Argentina/Buenos_Aires', 'ARS', 7, 120),
         ($2, 'Box Centris Sur', 'centris-sur', 'America/Argentina/Buenos_Aires', 'ARS', 5, 60)
       ON CONFLICT (slug) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         timezone = EXCLUDED.timezone,
         moneda = EXCLUDED.moneda,
         anticipacion_reserva_dias = EXCLUDED.anticipacion_reserva_dias,
         ventana_cancelacion_minutos = EXCLUDED.ventana_cancelacion_minutos`,
      [SEED_IDS.boxCentrisNorte, SEED_IDS.boxCentrisSur]
    );

    const passwordHashDemo = await hashearContrasena(
      "Centris123!",
      "centris_demo_salt"
    );

    await pool.query(
      `INSERT INTO usuarios (id, email, nombre, password_hash)
       VALUES
         ($1, 'admin@centris.dev', 'Martín Gómez', $8),
         ($2, 'recepcion@centris.dev', 'Lucía Fernández', $8),
         ($3, 'coach.multi@centris.dev', 'Diego Sosa', $8),
         ($4, 'coach@centris.dev', 'Valentina Ruiz', $8),
         ($5, 'atleta.aldia@centris.dev', 'Sofía Castro', $8),
         ($6, 'atleta.moroso@centris.dev', 'Nicolás Pérez', $8),
         ($7, 'atleta.nuevo@centris.dev', 'Camila Díaz', NULL)
       ON CONFLICT (email) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         password_hash = EXCLUDED.password_hash`,
      [
        SEED_IDS.usuarioAdmin,
        SEED_IDS.usuarioRecepcion,
        SEED_IDS.usuarioCoachMulti,
        SEED_IDS.usuarioCoach,
        SEED_IDS.usuarioAtletaAlDia,
        SEED_IDS.usuarioAtletaMoroso,
        SEED_IDS.usuarioAtletaNuevo,
        passwordHashDemo
      ]
    );

    await pool.query(
      `INSERT INTO afiliaciones (box_id, usuario_id, roles, activo)
       VALUES
         ($1, $3, ARRAY['administrador'], true),
         ($1, $4, ARRAY['recepcionista'], true),
         ($1, $5, ARRAY['coach', 'recepcionista'], true),
         ($2, $5, ARRAY['atleta'], true),
         ($1, $6, ARRAY['coach'], true),
         ($1, $7, ARRAY['atleta'], true),
         ($1, $8, ARRAY['atleta'], true),
         ($1, $9, ARRAY['atleta'], true)
       ON CONFLICT (box_id, usuario_id) DO UPDATE SET
         roles = EXCLUDED.roles,
         activo = EXCLUDED.activo`,
      [
        SEED_IDS.boxCentrisNorte,
        SEED_IDS.boxCentrisSur,
        SEED_IDS.usuarioAdmin,
        SEED_IDS.usuarioRecepcion,
        SEED_IDS.usuarioCoachMulti,
        SEED_IDS.usuarioCoach,
        SEED_IDS.usuarioAtletaAlDia,
        SEED_IDS.usuarioAtletaMoroso,
        SEED_IDS.usuarioAtletaNuevo
      ]
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarSeed()
    .then(() => {
      console.log("Dataset de seed aplicado correctamente.");
    })
    .catch((err) => {
      console.error("Error ejecutando seed:", err);
      process.exit(1);
    });
}
