import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  calcularFechaFinVigencia,
  type CrearMembresia,
  type Membresia
} from "@centris/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx
} from "../../database/database.service.js";
import {
  afiliaciones,
  membresias,
  planes
} from "../../database/schema/index.js";

function mapearMembresia(fila: typeof membresias.$inferSelect): Membresia {
  return {
    id: fila.id,
    boxId: fila.boxId,
    afiliacionId: fila.afiliacionId,
    planId: fila.planId,
    precio: fila.precio,
    modalidadCreditos: fila.modalidadCreditos as Membresia["modalidadCreditos"],
    creditosPorPeriodo: fila.creditosPorPeriodo,
    creditosExtra: fila.creditosExtra,
    fechaInicio: fila.fechaInicio,
    fechaFin: fila.fechaFin,
    bajaAnticipadaEn: fila.bajaAnticipadaEn
      ? fila.bajaAnticipadaEn.toISOString()
      : null,
    bajaPorUsuarioId: fila.bajaPorUsuarioId,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    deletedAt: fila.deletedAt ? fila.deletedAt.toISOString() : null
  };
}

@Injectable()
export class MembresiasService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  /**
   * Asigna una Membresía copiando precio y condiciones del Plan al momento del alta.
   * La Vigencia es inclusiva y se calcula a partir de `duracion_dias` del Plan.
   */
  async crearMembresia(
    boxId: string,
    input: CrearMembresia
  ): Promise<Membresia> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const plan = await this.buscarPlanActivo(tx, input.planId);
      await this.exigirAfiliacionDelBox(tx, input.afiliacionId);

      const [insertada] = await tx
        .insert(membresias)
        .values({
          boxId,
          afiliacionId: input.afiliacionId,
          planId: plan.id,
          precio: plan.precioBase,
          modalidadCreditos: plan.modalidadCreditos,
          creditosPorPeriodo: plan.creditosPorPeriodo,
          fechaInicio: input.fechaInicio,
          fechaFin: calcularFechaFinVigencia(
            input.fechaInicio,
            plan.duracionDias
          )
        })
        .returning();

      if (!insertada) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo crear la Membresía en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      return mapearMembresia(insertada);
    });
  }

  async listarMembresias(
    boxId: string,
    filtro: { afiliacionId?: string }
  ): Promise<Membresia[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const condiciones = [
        eq(membresias.boxId, boxId),
        isNull(membresias.deletedAt),
        ...(filtro.afiliacionId
          ? [eq(membresias.afiliacionId, filtro.afiliacionId)]
          : [])
      ];
      const filas = await tx
        .select()
        .from(membresias)
        .where(and(...condiciones))
        .orderBy(asc(membresias.fechaInicio));
      return filas.map(mapearMembresia);
    });
  }

  private async buscarPlanActivo(
    tx: DrizzleTx,
    planId: string
  ): Promise<typeof planes.$inferSelect> {
    const [plan] = await tx
      .select()
      .from(planes)
      .where(
        and(
          eq(planes.id, planId),
          isNull(planes.deletedAt),
          eq(planes.activo, true)
        )
      );
    if (!plan) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "Plan activo no encontrado en el Box activo.",
        HttpStatus.NOT_FOUND,
        { planId: ["Plan inexistente o inactivo en este Box"] }
      );
    }
    return plan;
  }

  private async exigirAfiliacionDelBox(
    tx: DrizzleTx,
    afiliacionId: string
  ): Promise<void> {
    const [afiliacion] = await tx
      .select({ id: afiliaciones.id, roles: afiliaciones.roles })
      .from(afiliaciones)
      .where(
        and(eq(afiliaciones.id, afiliacionId), isNull(afiliaciones.deletedAt))
      );
    if (!afiliacion || !afiliacion.roles.includes("atleta")) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "Atleta no encontrado en el Box activo.",
        HttpStatus.NOT_FOUND,
        { afiliacionId: ["Atleta inexistente en este Box"] }
      );
    }
  }
}
