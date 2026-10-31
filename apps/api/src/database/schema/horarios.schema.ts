import {
  boolean,
  foreignKey,
  integer,
  pgTable,
  time,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { afiliaciones } from "./afiliaciones.schema.js";
import { boxes } from "./boxes.schema.js";
import { tiposClase } from "./tipos-clase.schema.js";

export const horarios = pgTable(
  "horarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    tipoClaseId: uuid("tipo_clase_id").notNull(),
    coachAfiliacionId: uuid("coach_afiliacion_id").notNull(),
    diaSemana: integer("dia_semana").notNull(),
    horaInicio: time("hora_inicio").notNull(),
    duracionMinutos: integer("duracion_minutos").notNull(),
    cuposDefault: integer("cupos_default").notNull(),
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
    unique("uq_horarios_box_id").on(table.boxId, table.id),
    foreignKey({
      name: "fk_horarios_tipo_clase",
      columns: [table.boxId, table.tipoClaseId],
      foreignColumns: [tiposClase.boxId, tiposClase.id]
    }),
    foreignKey({
      name: "fk_horarios_coach_afiliacion",
      columns: [table.boxId, table.coachAfiliacionId],
      foreignColumns: [afiliaciones.boxId, afiliaciones.id]
    })
  ]
);
