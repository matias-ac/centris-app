import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type ActualizarConfiguracionBox,
  type Box
} from "@centris/shared";
import { and, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import { DatabaseService } from "../../database/database.service.js";
import { boxes } from "../../database/schema/index.js";

function mapearBox(fila: typeof boxes.$inferSelect): Box {
  return {
    id: fila.id,
    nombre: fila.nombre,
    slug: fila.slug,
    timezone: fila.timezone,
    moneda: fila.moneda,
    anticipacionReservaDias: fila.anticipacionReservaDias,
    ventanaCancelacionMinutos: fila.ventanaCancelacionMinutos
  };
}

@Injectable()
export class BoxesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async obtenerConfiguracionBox(boxId: string): Promise<Box> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const filas = await tx
        .select()
        .from(boxes)
        .where(and(eq(boxes.id, boxId), isNull(boxes.deletedAt)));

      const box = filas[0];
      if (!box) {
        throw new DomainException(
          ERROR_CODES.BOX_NO_SELECCIONADO,
          "El Box activo no existe o se encuentra dado de baja.",
          HttpStatus.BAD_REQUEST
        );
      }

      return mapearBox(box);
    });
  }

  async actualizarConfiguracionBox(
    boxId: string,
    input: ActualizarConfiguracionBox
  ): Promise<Box> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const valoresActualizados: Partial<typeof boxes.$inferInsert> = {
        timezone: input.timezone,
        moneda: input.moneda,
        anticipacionReservaDias: input.anticipacionReservaDias,
        ventanaCancelacionMinutos: input.ventanaCancelacionMinutos,
        updatedAt: new Date()
      };
      if (input.nombre !== undefined) {
        valoresActualizados.nombre = input.nombre;
      }

      const actualizados = await tx
        .update(boxes)
        .set(valoresActualizados)
        .where(and(eq(boxes.id, boxId), isNull(boxes.deletedAt)))
        .returning();

      const box = actualizados[0];
      if (!box) {
        throw new DomainException(
          ERROR_CODES.BOX_NO_SELECCIONADO,
          "El Box activo no existe o se encuentra dado de baja.",
          HttpStatus.BAD_REQUEST
        );
      }

      return mapearBox(box);
    });
  }
}
