import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type ActualizarHorario,
  type CrearHorario,
  type Horario
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
  horarios,
  tiposClase,
  usuarios
} from "../../database/schema/index.js";

function normalizarHora(hora: string): string {
  return hora.length >= 5 ? hora.slice(0, 5) : hora;
}

function mapearHorario(
  fila: typeof horarios.$inferSelect,
  tipoClaseNombre?: string,
  coachNombre?: string
): Horario {
  return {
    id: fila.id,
    boxId: fila.boxId,
    tipoClaseId: fila.tipoClaseId,
    coachAfiliacionId: fila.coachAfiliacionId,
    diaSemana: fila.diaSemana,
    horaInicio: normalizarHora(fila.horaInicio),
    duracionMinutos: fila.duracionMinutos,
    cuposDefault: fila.cuposDefault,
    activo: fila.activo,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    deletedAt: fila.deletedAt ? fila.deletedAt.toISOString() : null,
    tipoClaseNombre,
    coachNombre
  };
}

function validarUuidHorario(horarioId: string): void {
  if (!UUID_REGEX.test(horarioId)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      "El identificador del Horario no es un UUID válido.",
      HttpStatus.BAD_REQUEST,
      { id: ["UUID inválido"] }
    );
  }
}

@Injectable()
export class HorariosService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  private async validarCoach(
    tx: DrizzleTx,
    boxId: string,
    coachAfiliacionId: string
  ): Promise<void> {
    const [afiliacion] = await tx
      .select({
        id: afiliaciones.id,
        roles: afiliaciones.roles
      })
      .from(afiliaciones)
      .where(
        and(
          eq(afiliaciones.id, coachAfiliacionId),
          eq(afiliaciones.boxId, boxId),
          isNull(afiliaciones.deletedAt)
        )
      );

    if (!afiliacion || !afiliacion.roles.includes("coach")) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "La afiliación asignada como coach no pertenece al Box activo o no posee el rol 'coach'.",
        HttpStatus.BAD_REQUEST,
        {
          coachAfiliacionId: [
            "Debe ser una afiliación con rol 'coach' del Box"
          ]
        }
      );
    }
  }

  private async validarTipoClase(
    tx: DrizzleTx,
    boxId: string,
    tipoClaseId: string
  ): Promise<void> {
    const [tipo] = await tx
      .select({ id: tiposClase.id })
      .from(tiposClase)
      .where(
        and(
          eq(tiposClase.id, tipoClaseId),
          eq(tiposClase.boxId, boxId),
          isNull(tiposClase.deletedAt)
        )
      );

    if (!tipo) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "El Tipo de Clase seleccionado no existe en este Box.",
        HttpStatus.BAD_REQUEST,
        { tipoClaseId: ["Tipo de Clase inexistente en este Box"] }
      );
    }
  }

  async listarHorarios(boxId: string): Promise<Horario[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const filas = await tx
        .select({
          horario: horarios,
          tipoClaseNombre: tiposClase.nombre,
          coachNombre: usuarios.nombre
        })
        .from(horarios)
        .innerJoin(
          tiposClase,
          and(
            eq(horarios.tipoClaseId, tiposClase.id),
            eq(horarios.boxId, tiposClase.boxId)
          )
        )
        .innerJoin(
          afiliaciones,
          and(
            eq(horarios.coachAfiliacionId, afiliaciones.id),
            eq(horarios.boxId, afiliaciones.boxId)
          )
        )
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .where(
          and(eq(horarios.boxId, boxId), isNull(horarios.deletedAt))
        )
        .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));

      return filas.map(({ horario, tipoClaseNombre, coachNombre }) =>
        mapearHorario(horario, tipoClaseNombre, coachNombre)
      );
    });
  }

  async obtenerHorarioPorId(
    boxId: string,
    horarioId: string
  ): Promise<Horario> {
    validarUuidHorario(horarioId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [fila] = await tx
        .select({
          horario: horarios,
          tipoClaseNombre: tiposClase.nombre,
          coachNombre: usuarios.nombre
        })
        .from(horarios)
        .innerJoin(
          tiposClase,
          and(
            eq(horarios.tipoClaseId, tiposClase.id),
            eq(horarios.boxId, tiposClase.boxId)
          )
        )
        .innerJoin(
          afiliaciones,
          and(
            eq(horarios.coachAfiliacionId, afiliaciones.id),
            eq(horarios.boxId, afiliaciones.boxId)
          )
        )
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .where(
          and(
            eq(horarios.id, horarioId),
            eq(horarios.boxId, boxId),
            isNull(horarios.deletedAt)
          )
        );

      if (!fila) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Horario no encontrado en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Horario inexistente en este Box"] }
        );
      }

      return mapearHorario(
        fila.horario,
        fila.tipoClaseNombre,
        fila.coachNombre
      );
    });
  }

  async crearHorario(boxId: string, input: CrearHorario): Promise<Horario> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      await this.validarCoach(tx, boxId, input.coachAfiliacionId);
      await this.validarTipoClase(tx, boxId, input.tipoClaseId);

      const [insertado] = await tx
        .insert(horarios)
        .values({
          boxId,
          tipoClaseId: input.tipoClaseId,
          coachAfiliacionId: input.coachAfiliacionId,
          diaSemana: input.diaSemana,
          horaInicio: input.horaInicio,
          duracionMinutos: input.duracionMinutos,
          cuposDefault: input.cuposDefault,
          activo: true
        })
        .returning();

      if (!insertado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo crear el Horario en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearHorario(insertado);
    });
  }

  async actualizarHorario(
    boxId: string,
    horarioId: string,
    input: ActualizarHorario
  ): Promise<Horario> {
    validarUuidHorario(horarioId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [existente] = await tx
        .select()
        .from(horarios)
        .where(
          and(
            eq(horarios.id, horarioId),
            eq(horarios.boxId, boxId),
            isNull(horarios.deletedAt)
          )
        );

      if (!existente) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Horario no encontrado en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Horario inexistente en este Box"] }
        );
      }

      if (input.coachAfiliacionId) {
        await this.validarCoach(tx, boxId, input.coachAfiliacionId);
      }
      if (input.tipoClaseId) {
        await this.validarTipoClase(tx, boxId, input.tipoClaseId);
      }

      const valoresActualizados: Partial<typeof horarios.$inferInsert> = {
        updatedAt: new Date()
      };
      if (input.tipoClaseId !== undefined)
        valoresActualizados.tipoClaseId = input.tipoClaseId;
      if (input.coachAfiliacionId !== undefined)
        valoresActualizados.coachAfiliacionId = input.coachAfiliacionId;
      if (input.diaSemana !== undefined)
        valoresActualizados.diaSemana = input.diaSemana;
      if (input.horaInicio !== undefined)
        valoresActualizados.horaInicio = input.horaInicio;
      if (input.duracionMinutos !== undefined)
        valoresActualizados.duracionMinutos = input.duracionMinutos;
      if (input.cuposDefault !== undefined)
        valoresActualizados.cuposDefault = input.cuposDefault;
      if (input.activo !== undefined)
        valoresActualizados.activo = input.activo;

      const [actualizado] = await tx
        .update(horarios)
        .set(valoresActualizados)
        .where(
          and(
            eq(horarios.id, horarioId),
            eq(horarios.boxId, boxId),
            isNull(horarios.deletedAt)
          )
        )
        .returning();

      if (!actualizado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo actualizar el Horario en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearHorario(actualizado);
    });
  }

  async eliminarHorario(
    boxId: string,
    horarioId: string
  ): Promise<{ success: boolean; id: string }> {
    validarUuidHorario(horarioId);
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [existente] = await tx
        .select()
        .from(horarios)
        .where(
          and(
            eq(horarios.id, horarioId),
            eq(horarios.boxId, boxId),
            isNull(horarios.deletedAt)
          )
        );

      if (!existente) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Horario no encontrado en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Horario inexistente en este Box"] }
        );
      }

      await tx
        .update(horarios)
        .set({
          activo: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(horarios.id, horarioId));

      return { success: true, id: horarioId };
    });
  }
}
