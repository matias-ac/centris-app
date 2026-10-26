import {
  bigint,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { boxes } from "./boxes.schema.js";

export const planes = pgTable(
  "planes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    nombre: text("nombre").notNull(),
    precioBase: bigint("precio_base", { mode: "number" }).notNull(),
    duracionDias: integer("duracion_dias").notNull(),
    modalidadCreditos: text("modalidad_creditos").notNull(),
    creditosPorPeriodo: integer("creditos_por_periodo"),
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
    unique("uq_planes_box_id").on(table.boxId, table.id)
  ]
);
