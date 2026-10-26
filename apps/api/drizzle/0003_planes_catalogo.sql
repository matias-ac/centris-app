-- 0002_planes_catalogo.sql: Catálogo de Planes con RLS forzado y restricciones de integridad

CREATE TABLE IF NOT EXISTS "planes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "nombre" text NOT NULL,
  "precio_base" bigint NOT NULL,
  "duracion_dias" integer NOT NULL,
  "modalidad_creditos" text NOT NULL,
  "creditos_por_periodo" integer,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "uq_planes_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "chk_planes_precio_base" CHECK ("precio_base" >= 0),
  CONSTRAINT "chk_planes_duracion_dias" CHECK ("duracion_dias" > 0),
  CONSTRAINT "chk_planes_modalidad_creditos" CHECK (
    "modalidad_creditos" IN ('SEMANAL', 'VIGENCIA_TOTAL', 'ILIMITADO')
  ),
  CONSTRAINT "chk_planes_creditos_modalidad" CHECK (
    ("modalidad_creditos" = 'ILIMITADO' AND "creditos_por_periodo" IS NULL)
    OR ("modalidad_creditos" IN ('SEMANAL', 'VIGENCIA_TOTAL') AND "creditos_por_periodo" > 0)
  )
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "planes" TO centris_app_user;

-- Row Level Security forzado en planes (ADR 0004 y DER.md §2.2)
ALTER TABLE "planes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planes" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planes_select_policy" ON "planes";
CREATE POLICY "planes_select_policy" ON "planes"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "planes_insert_policy" ON "planes";
CREATE POLICY "planes_insert_policy" ON "planes"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "planes_update_policy" ON "planes";
CREATE POLICY "planes_update_policy" ON "planes"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "planes_delete_policy" ON "planes";
CREATE POLICY "planes_delete_policy" ON "planes"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );
