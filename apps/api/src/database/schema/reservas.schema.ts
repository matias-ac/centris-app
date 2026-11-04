import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { afiliaciones } from "./afiliaciones.schema.js";
import { boxes } from "./boxes.schema.js";
import { clases } from "./clases.schema.js";
import { membresias } from "./membresias.schema.js";
import { usuarios } from "./usuarios.schema.js";

export const reservas = pgTable(
  "reservas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    claseId: uuid("clase_id").notNull(),
    afiliacionId: uuid("afiliacion_id").notNull(),
    membresiaId: uuid("membresia_id").notNull(),
    creadaPorUsuarioId: uuid("creada_por_usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    estado: text("estado").notNull(),
    asistenciaMarcadaEn: timestamp("asistencia_marcada_en", {
      withTimezone: true
    }),
    asistenciaPorUsuarioId: uuid("asistencia_por_usuario_id").references(
      () => usuarios.id,
      { onDelete: "restrict" }
    ),
    canceladaEn: timestamp("cancelada_en", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    unique("uq_reservas_box_id").on(table.boxId, table.id),
    foreignKey({
      name: "fk_reservas_clase",
      columns: [table.boxId, table.claseId],
      foreignColumns: [clases.boxId, clases.id]
    }),
    foreignKey({
      name: "fk_reservas_afiliacion",
      columns: [table.boxId, table.afiliacionId],
      foreignColumns: [afiliaciones.boxId, afiliaciones.id]
    }),
    foreignKey({
      name: "fk_reservas_membresia",
      columns: [table.boxId, table.membresiaId],
      foreignColumns: [membresias.boxId, membresias.id]
    })
  ]
);
