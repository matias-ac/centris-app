import { Inject, Injectable } from "@nestjs/common";
import {
  calcularInstantesClase,
  diaSemanaIso,
  obtenerFechaLocal,
  sumarDiasAFecha
} from "@centris/shared";
import { and, eq, isNull } from "drizzle-orm";
import { DatabaseService } from "../../database/database.service.js";
import { boxes, clases, horarios } from "../../database/schema/index.js";

function normalizarHora(hora: string): string {
  return hora.length >= 5 ? hora.slice(0, 5) : hora;
}

@Injectable()
export class MaterializacionClasesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  /**
   * Ejecuta el proceso de materialización iterando Box por Box con SET LOCAL app.box_id (ADR 0002 y ADR 0004).
   */
  async materializarClases(opciones?: {
    fechaReferencia?: Date;
  }): Promise<{ boxesProcesados: number; clasesCreadas: number }> {
    const cajasActivas = await this.db.client
      .select({
        id: boxes.id,
        timezone: boxes.timezone,
        anticipacionReservaDias: boxes.anticipacionReservaDias
      })
      .from(boxes)
      .where(isNull(boxes.deletedAt));

    let totalCreadas = 0;
    for (const box of cajasActivas) {
      const res = await this.materializarClasesParaBox(box.id, opciones);
      totalCreadas += res.clasesCreadas;
    }

    return {
      boxesProcesados: cajasActivas.length,
      clasesCreadas: totalCreadas
    };
  }

  /**
   * Materializa Clases de forma idempotente para un Box específico cubriendo
   * al menos su horizonte de Anticipación de Reserva (ADR 0002 y ADR 0005).
   */
  async materializarClasesParaBox(
    boxId: string,
    opciones?: { fechaReferencia?: Date }
  ): Promise<{ clasesCreadas: number }> {
    const [box] = await this.db.client
      .select({
        id: boxes.id,
        timezone: boxes.timezone,
        anticipacionReservaDias: boxes.anticipacionReservaDias
      })
      .from(boxes)
      .where(and(eq(boxes.id, boxId), isNull(boxes.deletedAt)));

    if (!box) {
      return { clasesCreadas: 0 };
    }

    const fechaRef = opciones?.fechaReferencia ?? new Date();
    const fechaHoy = obtenerFechaLocal(fechaRef, box.timezone);
    const diasHorizonte = Math.max(box.anticipacionReservaDias, 14);

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const horariosActivos = await tx
        .select()
        .from(horarios)
        .where(
          and(
            eq(horarios.boxId, boxId),
            eq(horarios.activo, true),
            isNull(horarios.deletedAt)
          )
        );

      let creadas = 0;

      for (let d = 0; d <= diasHorizonte; d++) {
        const fechaLocal = sumarDiasAFecha(fechaHoy, d);
        const diaSemana = diaSemanaIso(fechaLocal);
        const horariosDelDia = horariosActivos.filter(
          (h) => h.diaSemana === diaSemana
        );

        for (const h of horariosDelDia) {
          const { inicio, fin } = calcularInstantesClase({
            fechaLocal,
            horaInicio: normalizarHora(h.horaInicio),
            duracionMinutos: h.duracionMinutos,
            timezone: box.timezone
          });

          const resultado = await tx
            .insert(clases)
            .values({
              boxId,
              horarioId: h.id,
              tipoClaseId: h.tipoClaseId,
              coachAfiliacionId: h.coachAfiliacionId,
              inicio,
              fin,
              cupos: h.cuposDefault
            })
            .onConflictDoNothing()
            .returning({ id: clases.id });

          if (resultado.length > 0) {
            creadas += resultado.length;
          }
        }
      }

      return { clasesCreadas: creadas };
    });
  }
}
