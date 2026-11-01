-- 0007_tipos_y_horarios.sql: Tipos de Clase y Horarios recurrentes con RLS forzado y FKs compuestas (ADR 0004 y DER.md §2.1)

CREATE TABLE IF NOT EXISTS "tipos_clase" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "nombre" text NOT NULL,
  "descripcion" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "uq_tipos_clase_box_id" UNIQUE("box_id", "id")
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tipos_clase" TO centris_app_user;

-- Row Level Security forzado en tipos_clase
ALTER TABLE "tipos_clase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tipos_clase" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tipos_clase_select_policy" ON "tipos_clase";
CREATE POLICY "tipos_clase_select_policy" ON "tipos_clase"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "tipos_clase_insert_policy" ON "tipos_clase";
CREATE POLICY "tipos_clase_insert_policy" ON "tipos_clase"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "tipos_clase_update_policy" ON "tipos_clase";
CREATE POLICY "tipos_clase_update_policy" ON "tipos_clase"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "tipos_clase_delete_policy" ON "tipos_clase";
CREATE POLICY "tipos_clase_delete_policy" ON "tipos_clase"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

-- Tabla de Horarios recurrentes
CREATE TABLE IF NOT EXISTS "horarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "tipo_clase_id" uuid NOT NULL,
  "coach_afiliacion_id" uuid NOT NULL,
  "dia_semana" integer NOT NULL,
  "hora_inicio" time NOT NULL,
  "duracion_minutos" integer NOT NULL,
  "cupos_default" integer NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "uq_horarios_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "fk_horarios_tipo_clase" FOREIGN KEY ("box_id", "tipo_clase_id")
    REFERENCES "tipos_clase"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_horarios_coach_afiliacion" FOREIGN KEY ("box_id", "coach_afiliacion_id")
    REFERENCES "afiliaciones"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "chk_horarios_dia_semana" CHECK ("dia_semana" >= 1 AND "dia_semana" <= 7),
  CONSTRAINT "chk_horarios_duracion_minutos" CHECK ("duracion_minutos" > 0),
  CONSTRAINT "chk_horarios_cupos_default" CHECK ("cupos_default" > 0)
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "horarios" TO centris_app_user;

-- Row Level Security forzado en horarios
ALTER TABLE "horarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "horarios" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horarios_select_policy" ON "horarios";
CREATE POLICY "horarios_select_policy" ON "horarios"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "horarios_insert_policy" ON "horarios";
CREATE POLICY "horarios_insert_policy" ON "horarios"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "horarios_update_policy" ON "horarios";
CREATE POLICY "horarios_update_policy" ON "horarios"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "horarios_delete_policy" ON "horarios";
CREATE POLICY "horarios_delete_policy" ON "horarios"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );
