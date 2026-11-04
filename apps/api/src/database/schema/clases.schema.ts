import {
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
import { horarios } from "./horarios.schema.js";
import { tiposClase } from "./tipos-clase.schema.js";
import { usuarios } from "./usuarios.schema.js";

export const clases = pgTable(
  "clases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "restrict" }),
    horarioId: uuid("horario_id"),
    tipoClaseId: uuid("tipo_clase_id").notNull(),
    coachAfiliacionId: uuid("coach_afiliacion_id").notNull(),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fin: timestamp("fin", { withTimezone: true }).notNull(),
    cupos: integer("cupos").notNull(),
    canceladaEn: timestamp("cancelada_en", { withTimezone: true }),
    canceladaPorUsuarioId: uuid("cancelada_por_usuario_id").references(
      () => usuarios.id,
      { onDelete: "restrict" }
    ),
    motivoCancelacion: text("motivo_cancelacion"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    unique("uq_clases_box_id").on(table.boxId, table.id),
    foreignKey({
      name: "fk_clases_horario",
      columns: [table.boxId, table.horarioId],
      foreignColumns: [horarios.boxId, horarios.id]
    }),
    foreignKey({
      name: "fk_clases_tipo_clase",
      columns: [table.boxId, table.tipoClaseId],
      foreignColumns: [tiposClase.boxId, tiposClase.id]
    }),
    foreignKey({
      name: "fk_clases_coach_afiliacion",
      columns: [table.boxId, table.coachAfiliacionId],
      foreignColumns: [afiliaciones.boxId, afiliaciones.id]
    })
  ]
);
