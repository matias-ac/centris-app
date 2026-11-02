-- 0006_pagos_inmutables.sql: Tabla inmutable de Pagos con RLS forzado y Anulaciones auditables (ADR 0004 y ADR 0006)

CREATE TABLE IF NOT EXISTS "pagos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "box_id" uuid NOT NULL REFERENCES "boxes"("id") ON DELETE RESTRICT,
  "membresia_id" uuid NOT NULL,
  "monto" bigint NOT NULL,
  "medio_pago" text NOT NULL,
  "fecha_pago" date NOT NULL,
  "registrado_por_usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "anulado_en" timestamptz,
  "anulado_por_usuario_id" uuid REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "motivo_anulacion" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "uq_pagos_box_id" UNIQUE("box_id", "id"),
  CONSTRAINT "fk_pagos_membresia" FOREIGN KEY ("box_id", "membresia_id")
    REFERENCES "membresias"("box_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "chk_pagos_monto" CHECK ("monto" > 0),
  CONSTRAINT "chk_pagos_medio_pago" CHECK (
    "medio_pago" IN ('EFECTIVO', 'TRANSFERENCIA', 'OTRO')
  ),
  CONSTRAINT "chk_pagos_anulacion" CHECK (
    ("anulado_en" IS NULL AND "anulado_por_usuario_id" IS NULL AND "motivo_anulacion" IS NULL)
    OR ("anulado_en" IS NOT NULL AND "anulado_por_usuario_id" IS NOT NULL AND "motivo_anulacion" IS NOT NULL)
  )
);

-- Permisos para el rol operativo de aplicación (sin BYPASSRLS)
-- Solo SELECT, INSERT y UPDATE (para registrar anulación). No se permite DELETE.
GRANT SELECT, INSERT, UPDATE ON TABLE "pagos" TO centris_app_user;

-- Row Level Security forzado en pagos (ADR 0004 y DER.md §2.2)
ALTER TABLE "pagos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pagos" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_select_policy" ON "pagos";
CREATE POLICY "pagos_select_policy" ON "pagos"
  FOR SELECT
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "pagos_insert_policy" ON "pagos";
CREATE POLICY "pagos_insert_policy" ON "pagos"
  FOR INSERT
  WITH CHECK (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );

DROP POLICY IF EXISTS "pagos_update_policy" ON "pagos";
CREATE POLICY "pagos_update_policy" ON "pagos"
  FOR UPDATE
  USING (
    box_id = NULLIF(current_setting('app.box_id', true), '')::uuid
  );
