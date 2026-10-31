import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type ActualizarTipoClase,
  type CrearTipoClase,
  type RolAfiliacion,
  type TipoClase
} from "@centris/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx,
  UUID_REGEX
} from "../../database/database.service.js";
import { tiposClase } from "../../database/schema/index.js";

function mapearTipoClase(fila: typeof tiposClase.$inferSelect): TipoClase {
  return {
    id: fila.id,
    boxId: fila.boxId,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    activo: fila.activo,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    deletedAt: fila.deletedAt ? fila.deletedAt.toISOString() : null
  };
}

function validarUuidTipoClase(tipoClaseId: string): void {
  if (!UUID_REGEX.test(tipoClaseId)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      "El identificador del Tipo de Clase no es un UUID válido.",
      HttpStatus.BAD_REQUEST,
      { id: ["UUID inválido"] }
    );
  }
}

@Injectable()
export class TiposClaseService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async listarTiposClase(
    boxId: string,
    rolesUsuario: RolAfiliacion[]
  ): Promise<TipoClase[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const esAdmin = rolesUsuario.includes("administrador");
      const condiciones = [
        eq(tiposClase.boxId, boxId),
        isNull(tiposClase.deletedAt),
        ...(!esAdmin ? [eq(tiposClase.activo, true)] : [])
      ];

      const filas = await tx
        .select()
        .from(tiposClase)
        .where(and(...condiciones))
        .orderBy(asc(tiposClase.nombre));

      return filas.map(mapearTipoClase);
    });
  }

  private async buscarTipoClaseActivoPorId(
    tx: DrizzleTx,
    tipoClaseId: string,
    boxId?: string
  ): Promise<typeof tiposClase.$inferSelect> {
    const condiciones = [
      eq(tiposClase.id, tipoClaseId),
      isNull(tiposClase.deletedAt)
    ];
    if (boxId) {
      condiciones.push(eq(tiposClase.boxId, boxId));
    }

    const filas = await tx
      .select()
      .from(tiposClase)
      .where(and(...condiciones));

    const tipo = filas[0];
    if (!tipo) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "Tipo de Clase no encontrado en el Box activo.",
        HttpStatus.NOT_FOUND,
        { id: ["Tipo de Clase inexistente en este Box"] }
      );
    }
    return tipo;
  }

  async obtenerTipoClasePorId(
    boxId: string,
    tipoClaseId: string
  ): Promise<TipoClase> {
    validarUuidTipoClase(tipoClaseId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const tipo = await this.buscarTipoClaseActivoPorId(tx, tipoClaseId);
      return mapearTipoClase(tipo);
    });
  }

  async crearTipoClase(
    boxId: string,
    input: CrearTipoClase
  ): Promise<TipoClase> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [insertado] = await tx
        .insert(tiposClase)
        .values({
          boxId,
          nombre: input.nombre,
          descripcion: input.descripcion ?? null,
          activo: true
        })
        .returning();

      if (!insertado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo crear el Tipo de Clase en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearTipoClase(insertado);
    });
  }

  async actualizarTipoClase(
    boxId: string,
    tipoClaseId: string,
    input: ActualizarTipoClase
  ): Promise<TipoClase> {
    validarUuidTipoClase(tipoClaseId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      await this.buscarTipoClaseActivoPorId(tx, tipoClaseId);

      const valoresActualizados: Partial<typeof tiposClase.$inferInsert> = {
        updatedAt: new Date()
      };
      if (input.nombre !== undefined) valoresActualizados.nombre = input.nombre;
      if (input.descripcion !== undefined)
        valoresActualizados.descripcion = input.descripcion;
      if (input.activo !== undefined) valoresActualizados.activo = input.activo;

      const [actualizado] = await tx
        .update(tiposClase)
        .set(valoresActualizados)
        .where(
          and(eq(tiposClase.id, tipoClaseId), isNull(tiposClase.deletedAt))
        )
        .returning();

      if (!actualizado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo actualizar el Tipo de Clase en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearTipoClase(actualizado);
    });
  }

  async eliminarTipoClase(
    boxId: string,
    tipoClaseId: string
  ): Promise<{ success: boolean; id: string }> {
    validarUuidTipoClase(tipoClaseId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      await this.buscarTipoClaseActivoPorId(tx, tipoClaseId);

      await tx
        .update(tiposClase)
        .set({
          activo: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tiposClase.id, tipoClaseId));

      return { success: true, id: tipoClaseId };
    });
  }
}
