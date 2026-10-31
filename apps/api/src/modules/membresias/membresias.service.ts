import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  calcularFechaFinVigencia,
  type AjustarCreditosExtra,
  type AjustarPrecioMembresia,
  type BajaAnticipada,
  type CrearMembresia,
  type Membresia
} from "@centris/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx,
  UUID_REGEX
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

const PG_EXCLUSION_VIOLATION = "23P01";

function exigirUuidMembresia(membresiaId: string): void {
  if (!UUID_REGEX.test(membresiaId)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      "El identificador de la Membresía no es un UUID válido.",
      HttpStatus.BAD_REQUEST,
      { id: ["UUID inválido"] }
    );
  }
}

function membresiaNoEncontrada(): DomainException {
  return new DomainException(
    ERROR_CODES.VALIDACION_FALLIDA,
    "Membresía no encontrada en el Box activo.",
    HttpStatus.NOT_FOUND,
    { id: ["Membresía inexistente en este Box"] }
  );
}

function esViolacionDeSolapamiento(error: unknown): boolean {
  let actual: unknown = error;
  while (actual && typeof actual === "object") {
    const { code, constraint, cause } = actual as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (
      code === PG_EXCLUSION_VIOLATION &&
      constraint === "ex_membresias_sin_solapamiento"
    ) {
      return true;
    }
    actual = cause;
  }
  return false;
}

@Injectable()
export class MembresiasService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  /**
   * Asigna una Membresía copiando precio y condiciones del Plan al momento del alta.
   * La Vigencia es inclusiva y se calcula a partir de `duracion_dias` del Plan.
   * El no solapamiento por Atleta lo garantiza la constraint de exclusión en PostgreSQL.
   */
  async crearMembresia(
    boxId: string,
    input: CrearMembresia
  ): Promise<Membresia> {
    try {
      return await this.insertarMembresia(boxId, input);
    } catch (error) {
      if (esViolacionDeSolapamiento(error)) {
        throw new DomainException(
          ERROR_CODES.MEMBRESIA_SUPERPUESTA,
          "El Atleta ya posee una Membresía cuya Vigencia se solapa con la solicitada.",
          HttpStatus.CONFLICT,
          { fechaInicio: ["La Vigencia se solapa con otra Membresía del Atleta"] }
        );
      }
      throw error;
    }
  }

  private async insertarMembresia(
    boxId: string,
    input: CrearMembresia
  ): Promise<Membresia> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const plan = await this.buscarPlanActivo(tx, boxId, input.planId);
      await this.exigirAfiliacionDelBox(tx, boxId, input.afiliacionId);

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

  /** Ajusta la bolsa `creditos_extra` (válida para toda la Vigencia, no se renueva cada lunes). */
  async ajustarCreditosExtra(
    boxId: string,
    membresiaId: string,
    input: AjustarCreditosExtra
  ): Promise<Membresia> {
    return this.actualizarMembresia(boxId, membresiaId, {
      creditosExtra: input.creditosExtra
    });
  }

  /** Ajusta el Precio copiado del Plan (descuento o beca a $0). */
  async ajustarPrecio(
    boxId: string,
    membresiaId: string,
    input: AjustarPrecioMembresia
  ): Promise<Membresia> {
    return this.actualizarMembresia(boxId, membresiaId, {
      precio: input.precio
    });
  }

  private async actualizarMembresia(
    boxId: string,
    membresiaId: string,
    valores: Partial<typeof membresias.$inferInsert>
  ): Promise<Membresia> {
    exigirUuidMembresia(membresiaId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [actualizada] = await tx
        .update(membresias)
        .set({ ...valores, updatedAt: new Date() })
        .where(
          and(
            eq(membresias.boxId, boxId),
            eq(membresias.id, membresiaId),
            isNull(membresias.deletedAt)
          )
        )
        .returning();
      if (!actualizada) {
        throw membresiaNoEncontrada();
      }
      return mapearMembresia(actualizada);
    });
  }

  /**
   * Baja Anticipada (solo Administrador): acorta la Vigencia al día indicado y
   * registra quién y cuándo la ejecutó. Solo puede acortar, sin quedar antes del inicio.
   */
  async bajaAnticipada(
    boxId: string,
    membresiaId: string,
    usuarioId: string,
    input: BajaAnticipada
  ): Promise<Membresia> {
    exigirUuidMembresia(membresiaId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [actual] = await tx
        .select()
        .from(membresias)
        .where(
          and(
            eq(membresias.boxId, boxId),
            eq(membresias.id, membresiaId),
            isNull(membresias.deletedAt)
          )
        )
        .for("update");
      if (!actual) {
        throw membresiaNoEncontrada();
      }
      if (actual.bajaAnticipadaEn !== null) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "La Membresía ya registra una Baja Anticipada.",
          HttpStatus.BAD_REQUEST,
          { id: ["La Membresía ya fue dada de baja anticipadamente"] }
        );
      }
      if (input.fechaFin < actual.fechaInicio || input.fechaFin >= actual.fechaFin) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "La Baja Anticipada debe acortar la Vigencia sin quedar antes de su inicio.",
          HttpStatus.BAD_REQUEST,
          {
            fechaFin: [
              `Debe estar entre ${actual.fechaInicio} y el día anterior a ${actual.fechaFin}`
            ]
          }
        );
      }

      const ahora = new Date();
      const [actualizada] = await tx
        .update(membresias)
        .set({
          fechaFin: input.fechaFin,
          bajaAnticipadaEn: ahora,
          bajaPorUsuarioId: usuarioId,
          updatedAt: ahora
        })
        .where(
          and(eq(membresias.boxId, boxId), eq(membresias.id, membresiaId))
        )
        .returning();
      if (!actualizada) {
        throw membresiaNoEncontrada();
      }
      return mapearMembresia(actualizada);
    });
  }

  private async buscarPlanActivo(
    tx: DrizzleTx,
    boxId: string,
    planId: string
  ): Promise<typeof planes.$inferSelect> {
    const [plan] = await tx
      .select()
      .from(planes)
      .where(
        and(
          eq(planes.boxId, boxId),
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
    boxId: string,
    afiliacionId: string
  ): Promise<void> {
    const [afiliacion] = await tx
      .select({ id: afiliaciones.id, roles: afiliaciones.roles })
      .from(afiliaciones)
      .where(
        and(
          eq(afiliaciones.boxId, boxId),
          eq(afiliaciones.id, afiliacionId),
          eq(afiliaciones.activo, true),
          isNull(afiliaciones.deletedAt)
        )
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
