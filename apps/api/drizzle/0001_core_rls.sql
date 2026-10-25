-- 0001_core_rls.sql: Esquema fundacional (boxes, usuarios, afiliaciones) y Row Level Security forzado

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'centris_app_user') THEN
    CREATE ROLE centris_app_user WITH
      LOGIN
      PASSWORD 'centris_app_pass'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO centris_app_user;

CREATE TABLE IF NOT EXISTS "boxes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nombre" text NOT NULL,
  "slug" text NOT NULL,
  "timezone" text NOT NULL,
  "moneda" text NOT NULL,
  "anticipacion_reserva_dias" integer NOT NULL,
  "ventana_cancelacion_minutos" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "boxes_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "nombre" text NOT NULL,
  "password_hash" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "afiliaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "roles" text[] NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "uq_afiliaciones_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "uq_afiliaciones_box_usuario" UNIQUE("box_id", "usuario_id"),
  CONSTRAINT "chk_afiliaciones_roles_no_vacios" CHECK (
    cardinality("roles") >= 1
    AND "roles" <@ ARRAY['administrador', 'recepcionista', 'coach', 'atleta']::text[]
  )
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "boxes", "usuarios", "afiliaciones" TO centris_app_user;

-- Row Level Security forzado en afiliaciones (ADR 0004 y DER.md §2.1)
ALTER TABLE "afiliaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "afiliaciones" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "afiliaciones_select_policy" ON "afiliaciones";
CREATE POLICY "afiliaciones_select_policy" ON "afiliaciones"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
    OR usuario_id = NULLIF(current_setting('app.usuario_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "afiliaciones_insert_policy" ON "afiliaciones";
CREATE POLICY "afiliaciones_insert_policy" ON "afiliaciones"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "afiliaciones_update_policy" ON "afiliaciones";
CREATE POLICY "afiliaciones_update_policy" ON "afiliaciones"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  )
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "afiliaciones_delete_policy" ON "afiliaciones";
CREATE POLICY "afiliaciones_delete_policy" ON "afiliaciones"
  FOR DELETE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );
