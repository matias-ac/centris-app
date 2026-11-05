-- 0008_clases_y_reservas.sql: Clases materializadas y Reservas mínimas con RLS forzado y FKs compuestas (ADR 0002, ADR 0004 y DER.md §2.1)

CREATE TABLE IF NOT EXISTS "clases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "horario_id" uuid,
  "tipo_clase_id" uuid NOT NULL,
  "coach_afiliacion_id" uuid NOT NULL,
  "inicio" timestamptz NOT NULL,
  "fin" timestamptz NOT NULL,
  "cupos" integer NOT NULL,
  "cancelada_en" timestamptz,
  "cancelada_por_usuario_id" uuid REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "motivo_cancelacion" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "uq_clases_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "fk_clases_horario" FOREIGN KEY ("box_id", "horario_id")
    REFERENCES "horarios"("box_id", "id") ON DELETE SET NULL,
  CONSTRAINT "fk_clases_tipo_clase" FOREIGN KEY ("box_id", "tipo_clase_id")
    REFERENCES "tipos_clase"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_clases_coach_afiliacion" FOREIGN KEY ("box_id", "coach_afiliacion_id")
    REFERENCES "afiliaciones"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "chk_clases_cupos" CHECK ("cupos" > 0),
  CONSTRAINT "chk_clases_inicio_fin" CHECK ("inicio" < "fin")
);

-- Índice único parcial para idempotencia de materialización de Clases desde Horario
CREATE UNIQUE INDEX IF NOT EXISTS "uq_clases_horario_inicio"
  ON "clases" ("box_id", "horario_id", "inicio")
  WHERE "deleted_at" IS NULL AND "horario_id" IS NOT NULL;

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "clases" TO centris_app_user;

-- Row Level Security forzado en clases
ALTER TABLE "clases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clases" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clases_select_policy" ON "clases";
CREATE POLICY "clases_select_policy" ON "clases"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "clases_insert_policy" ON "clases";
CREATE POLICY "clases_insert_policy" ON "clases"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "clases_update_policy" ON "clases";
CREATE POLICY "clases_update_policy" ON "clases"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "clases_delete_policy" ON "clases";
CREATE POLICY "clases_delete_policy" ON "clases"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

-- Tabla mínima de Reservas para respaldar conteo e invariantes de Cupos en Ticket 08 (DER.md §2.1)
CREATE TABLE IF NOT EXISTS "reservas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "clase_id" uuid NOT NULL,
  "afiliacion_id" uuid NOT NULL,
  "membresia_id" uuid NOT NULL,
  "creada_por_usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "estado" text NOT NULL,
  "asistencia_marcada_en" timestamptz,
  "asistencia_por_usuario_id" uuid REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "cancelada_en" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "uq_reservas_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "fk_reservas_clase" FOREIGN KEY ("box_id", "clase_id")
    REFERENCES "clases"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_reservas_afiliacion" FOREIGN KEY ("box_id", "afiliacion_id")
    REFERENCES "afiliaciones"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_reservas_membresia" FOREIGN KEY ("box_id", "membresia_id")
    REFERENCES "membresias"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "chk_reservas_estado" CHECK (
    "estado" IN ('CONFIRMADA', 'CANCELADA', 'CANCELADA_TARDIA', 'CANCELADA_POR_BOX')
  )
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "reservas" TO centris_app_user;

-- Row Level Security forzado en reservas
ALTER TABLE "reservas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservas" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservas_select_policy" ON "reservas";
CREATE POLICY "reservas_select_policy" ON "reservas"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "reservas_insert_policy" ON "reservas";
CREATE POLICY "reservas_insert_policy" ON "reservas"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "reservas_update_policy" ON "reservas";
CREATE POLICY "reservas_update_policy" ON "reservas"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "reservas_delete_policy" ON "reservas";
CREATE POLICY "reservas_delete_policy" ON "reservas"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

CREATE UNIQUE INDEX IF NOT EXISTS "uq_reserva_activa" ON "reservas" ("box_id", "clase_id", "afiliacion_id") WHERE "estado" = 'CONFIRMADA';
