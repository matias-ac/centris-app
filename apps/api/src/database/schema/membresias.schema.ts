import {
  bigint,
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { afiliaciones } from "./afiliaciones.schema.js";
import { boxes } from "./boxes.schema.js";
import { planes } from "./planes.schema.js";
import { usuarios } from "./usuarios.schema.js";

/**
 * La constraint de exclusión GiST `ex_membresias_sin_solapamiento`
 * (no solapamiento de Vigencias por Afiliación) vive en la migración SQL
 * 0004_membresias.sql porque Drizzle no modela constraints EXCLUDE.
 */
export const membresias = pgTable(
  "membresias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    afiliacionId: uuid("afiliacion_id").notNull(),
    planId: uuid("plan_id").notNull(),
    precio: bigint("precio", { mode: "number" }).notNull(),
    modalidadCreditos: text("modalidad_creditos").notNull(),
    creditosPorPeriodo: integer("creditos_por_periodo"),
    creditosExtra: integer("creditos_extra").default(0).notNull(),
    fechaInicio: date("fecha_inicio", { mode: "string" }).notNull(),
    fechaFin: date("fecha_fin", { mode: "string" }).notNull(),
    bajaAnticipadaEn: timestamp("baja_anticipada_en", { withTimezone: true }),
    bajaPorUsuarioId: uuid("baja_por_usuario_id").references(
      () => usuarios.id,
      { onDelete: "restrict" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    unique("uq_membresias_box_id").on(table.boxId, table.id),
    foreignKey({
      name: "fk_membresias_afiliacion",
      columns: [table.boxId, table.afiliacionId],
      foreignColumns: [afiliaciones.boxId, afiliaciones.id]
    }),
    foreignKey({
      name: "fk_membresias_plan",
      columns: [table.boxId, table.planId],
      foreignColumns: [planes.boxId, planes.id]
    })
  ]
);
