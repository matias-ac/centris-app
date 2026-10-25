import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const boxes = pgTable("boxes", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull(),
  moneda: text("moneda").notNull(),
  anticipacionReservaDias: integer("anticipacion_reserva_dias").notNull(),
  ventanaCancelacionMinutos: integer("ventana_cancelacion_minutos").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});
