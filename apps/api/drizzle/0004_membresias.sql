-- 0004_membresias.sql: Membresías con RLS forzado, FK compuestas y no solapamiento de Vigencia (ADR 0003 y ADR 0004)

CREATE TABLE IF NOT EXISTS "membresias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "afiliacion_id" uuid NOT NULL,
  "plan_id" uuid NOT NULL,
  "precio" bigint NOT NULL,
  "modalidad_creditos" text NOT NULL,
  "creditos_por_periodo" integer,
  "creditos_extra" integer DEFAULT 0 NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "baja_anticipada_en" timestamptz,
  "baja_por_usuario_id" uuid REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "uq_membresias_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "fk_membresias_afiliacion" FOREIGN KEY ("box_id", "afiliacion_id")
    REFERENCES "afiliaciones"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_membresias_plan" FOREIGN KEY ("box_id", "plan_id")
    REFERENCES "planes"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "chk_membresias_precio" CHECK ("precio" >= 0),
  CONSTRAINT "chk_membresias_vigencia" CHECK ("fecha_fin" >= "fecha_inicio"),
  CONSTRAINT "chk_membresias_modalidad_creditos" CHECK (
    "modalidad_creditos" IN ('SEMANAL', 'VIGENCIA_TOTAL', 'ILIMITADO')
  ),
  CONSTRAINT "chk_membresias_creditos_modalidad" CHECK (
    ("modalidad_creditos" = 'ILIMITADO' AND "creditos_por_periodo" IS NULL)
    OR ("modalidad_creditos" IN ('SEMANAL', 'VIGENCIA_TOTAL') AND "creditos_por_periodo" > 0)
  ),
  CONSTRAINT "chk_membresias_baja" CHECK (
    ("baja_anticipada_en" IS NULL AND "baja_por_usuario_id" IS NULL)
    OR ("baja_anticipada_en" IS NOT NULL AND "baja_por_usuario_id" IS NOT NULL)
  ),
  -- Como máximo una Membresía vigente por Atleta en cualquier fecha calendario.
  -- Las Vigencias son intervalos inclusivos [fecha_inicio, fecha_fin].
  CONSTRAINT "ex_membresias_sin_solapamiento" EXCLUDE USING gist (
    "box_id" WITH =,
    "afiliacion_id" WITH =,
    daterange("fecha_inicio", "fecha_fin", '[]') WITH &&
  ) WHERE ("deleted_at" IS NULL)
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "membresias" TO centris_app_user;

-- Row Level Security forzado en membresias (ADR 0004 y DER.md §2.2)
ALTER TABLE "membresias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membresias" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membresias_select_policy" ON "membresias";
CREATE POLICY "membresias_select_policy" ON "membresias"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "membresias_insert_policy" ON "membresias";
CREATE POLICY "membresias_insert_policy" ON "membresias"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "membresias_update_policy" ON "membresias";
CREATE POLICY "membresias_update_policy" ON "membresias"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "membresias_delete_policy" ON "membresias";
CREATE POLICY "membresias_delete_policy" ON "membresias"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );
