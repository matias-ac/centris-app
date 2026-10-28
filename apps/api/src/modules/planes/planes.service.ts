import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type ActualizarPlan,
  type CrearPlan,
  type Plan,
  type RolAfiliacion
} from "@centris/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx,
  UUID_REGEX
} from "../../database/database.service.js";
import { planes } from "../../database/schema/index.js";

function mapearPlan(fila: typeof planes.$inferSelect): Plan {
  return {
    id: fila.id,
    boxId: fila.boxId,
    nombre: fila.nombre,
    precioBase: Number(fila.precioBase),
    duracionDias: fila.duracionDias,
    modalidadCreditos: fila.modalidadCreditos as Plan["modalidadCreditos"],
    creditosPorPeriodo: fila.creditosPorPeriodo,
    activo: fila.activo,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    deletedAt: fila.deletedAt ? fila.deletedAt.toISOString() : null
  };
}

function validarUuidPlan(planId: string): void {
  if (!UUID_REGEX.test(planId)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      "El identificador del Plan no es un UUID válido.",
      HttpStatus.BAD_REQUEST,
      { id: ["UUID inválido"] }
    );
  }
}

@Injectable()
export class PlanesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async listarPlanes(
    boxId: string,
    rolesUsuario: RolAfiliacion[]
  ): Promise<Plan[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const esAdmin = rolesUsuario.includes("administrador");
      const condiciones = [
        eq(planes.boxId, boxId),
        isNull(planes.deletedAt),
        ...(!esAdmin ? [eq(planes.activo, true)] : [])
      ];

      const filas = await tx
        .select()
        .from(planes)
        .where(and(...condiciones))
        .orderBy(asc(planes.nombre));

      return filas.map(mapearPlan);
    });
  }

  private async buscarPlanActivoPorId(
    tx: DrizzleTx,
    planId: string,
    boxId?: string
  ): Promise<typeof planes.$inferSelect> {
    const condiciones = [eq(planes.id, planId), isNull(planes.deletedAt)];
    if (boxId) {
      condiciones.push(eq(planes.boxId, boxId));
    }

    const filas = await tx
      .select()
      .from(planes)
      .where(and(...condiciones));

    const plan = filas[0];
    if (!plan) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "Plan no encontrado en el Box activo.",
        HttpStatus.NOT_FOUND,
        { id: ["Plan inexistente en este Box"] }
      );
    }
    return plan;
  }

  async obtenerPlanPorId(boxId: string, planId: string): Promise<Plan> {
    validarUuidPlan(planId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const plan = await this.buscarPlanActivoPorId(tx, planId);
      return mapearPlan(plan);
    });
  }

  async crearPlan(boxId: string, input: CrearPlan): Promise<Plan> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [insertado] = await tx
        .insert(planes)
        .values({
          boxId,
          nombre: input.nombre,
          precioBase: input.precioBase,
          duracionDias: input.duracionDias,
          modalidadCreditos: input.modalidadCreditos,
          creditosPorPeriodo: input.creditosPorPeriodo,
          activo: true
        })
        .returning();

      if (!insertado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo crear el Plan en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearPlan(insertado);
    });
  }

  async actualizarPlan(
    boxId: string,
    planId: string,
    input: ActualizarPlan
  ): Promise<Plan> {
    validarUuidPlan(planId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      await this.buscarPlanActivoPorId(tx, planId);

      const valoresActualizados: Partial<typeof planes.$inferInsert> = {
        updatedAt: new Date()
      };
      if (input.nombre !== undefined) valoresActualizados.nombre = input.nombre;
      if (input.precioBase !== undefined)
        valoresActualizados.precioBase = input.precioBase;
      if (input.duracionDias !== undefined)
        valoresActualizados.duracionDias = input.duracionDias;
      if (input.modalidadCreditos !== undefined)
        valoresActualizados.modalidadCreditos = input.modalidadCreditos;
      if (input.creditosPorPeriodo !== undefined)
        valoresActualizados.creditosPorPeriodo = input.creditosPorPeriodo;
      if (input.activo !== undefined) valoresActualizados.activo = input.activo;

      const [actualizado] = await tx
        .update(planes)
        .set(valoresActualizados)
        .where(and(eq(planes.id, planId), isNull(planes.deletedAt)))
        .returning();

      if (!actualizado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo actualizar el Plan en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearPlan(actualizado);
    });
  }

  async eliminarPlan(
    boxId: string,
    planId: string
  ): Promise<{ success: boolean; id: string }> {
    validarUuidPlan(planId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      await this.buscarPlanActivoPorId(tx, planId);

      await tx
        .update(planes)
        .set({
          activo: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(planes.id, planId));

      return { success: true, id: planId };
    });
  }
}
