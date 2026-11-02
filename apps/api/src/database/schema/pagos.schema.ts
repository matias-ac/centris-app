import {
  bigint,
  date,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { boxes } from "./boxes.schema.js";
import { membresias } from "./membresias.schema.js";
import { usuarios } from "./usuarios.schema.js";

/**
 * Tabla inmutable de Pagos con RLS forzado (ADR 0004 y ADR 0006).
 * No contiene columnas de borrado físico/lógico (sin deleted_at)
 * ni de modificación de importes (sin updated_at).
 * Un error se subsana únicamente mediante Anulación auditable.
 */
export const pagos = pgTable(
  "pagos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    membresiaId: uuid("membresia_id").notNull(),
    monto: bigint("monto", { mode: "number" }).notNull(),
    medioPago: text("medio_pago").notNull(),
    fechaPago: date("fecha_pago", { mode: "string" }).notNull(),
    registradoPorUsuarioId: uuid("registrado_por_usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    anuladoEn: timestamp("anulado_en", { withTimezone: true }),
    anuladoPorUsuarioId: uuid("anulado_por_usuario_id").references(
      () => usuarios.id,
      { onDelete: "restrict" }
    ),
    motivoAnulacion: text("motivo_anulacion"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    unique("uq_pagos_box_id").on(table.boxId, table.id),
    foreignKey({
      name: "fk_pagos_membresia",
      columns: [table.boxId, table.membresiaId],
      foreignColumns: [membresias.boxId, membresias.id]
    })
  ]
);
