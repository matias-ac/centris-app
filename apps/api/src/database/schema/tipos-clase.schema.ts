import {
  boolean,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { boxes } from "./boxes.schema.js";

export const tiposClase = pgTable(
  "tipos_clase",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    activo: boolean("activo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    unique("uq_tipos_clase_box_id").on(table.boxId, table.id)
  ]
);
