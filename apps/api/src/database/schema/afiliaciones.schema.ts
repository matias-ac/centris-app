import {
  boolean,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { boxes } from "./boxes.schema.js";
import { usuarios } from "./usuarios.schema.js";

export const afiliaciones = pgTable(
  "afiliaciones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    roles: text("roles").array().notNull(),
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
    unique("uq_afiliaciones_box_id").on(table.boxId, table.id),
    unique("uq_afiliaciones_box_usuario").on(table.boxId, table.usuarioId)
  ]
);
