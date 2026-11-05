import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type ActualizarHorario,
  type CrearHorario,
  type Horario
} from "@centris/shared";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx,
  UUID_REGEX
} from "../../database/database.service.js";
import {
  afiliaciones,
  clases,
  horarios,
  reservas,
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
          eq(tiposClase.activo, true),
          isNull(tiposClase.deletedAt)
        )
      );

    if (!tipo) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "El Tipo de Clase seleccionado no existe o no se encuentra activo en este Box.",
        HttpStatus.BAD_REQUEST,
        {
          tipoClaseId: [
            "Tipo de Clase inexistente o inactivo en este Box"
          ]
        }
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

      // Criterio 2: Al modificar el Horario recurrente, solo se actualizan las Clases futuras sin Reservas activas (ADR 0002)
      const ahora = new Date();
      const clasesFuturas = await tx
        .select({ id: clases.id })
        .from(clases)
        .leftJoin(
          reservas,
          and(
            eq(clases.id, reservas.claseId),
            eq(clases.boxId, reservas.boxId),
            eq(reservas.estado, "CONFIRMADA")
          )
        )
        .where(
          and(
            eq(clases.boxId, boxId),
            eq(clases.horarioId, horarioId),
            gt(clases.inicio, ahora),
            isNull(clases.deletedAt)
          )
        )
        .groupBy(clases.id)
        .having(sql`COALESCE(COUNT(${reservas.id}), 0) = 0`);

      const idsClasesAfectadas = clasesFuturas.map((c) => c.id);

      if (idsClasesAfectadas.length > 0) {
        const cambioEstructuraCalendario =
          input.diaSemana !== undefined ||
          input.horaInicio !== undefined ||
          input.duracionMinutos !== undefined;

        if (cambioEstructuraCalendario || input.activo === false) {
          // Si cambia día, hora o duración (o se desactiva), las ocurrencias futuras sin reservas
          // se dan de baja para que puedan regenerarse con la nueva configuración temporal
          await tx
            .update(clases)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(
              and(
                eq(clases.boxId, boxId),
                inArray(clases.id, idsClasesAfectadas)
              )
            );
        } else {
          const updatesClases: Partial<typeof clases.$inferInsert> = {
            updatedAt: new Date()
          };
          if (input.cuposDefault !== undefined) updatesClases.cupos = input.cuposDefault;
          if (input.coachAfiliacionId !== undefined) updatesClases.coachAfiliacionId = input.coachAfiliacionId;
          if (input.tipoClaseId !== undefined) updatesClases.tipoClaseId = input.tipoClaseId;

          if (Object.keys(updatesClases).length > 1) {
            await tx
              .update(clases)
              .set(updatesClases)
              .where(
                and(
                  eq(clases.boxId, boxId),
                  inArray(clases.id, idsClasesAfectadas)
                )
              );
          }
        }
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

      // Dar de baja Clases futuras sin reservas activas
      const ahora = new Date();
      const clasesFuturas = await tx
        .select({ id: clases.id })
        .from(clases)
        .leftJoin(
          reservas,
          and(
            eq(clases.id, reservas.claseId),
            eq(clases.boxId, reservas.boxId),
            eq(reservas.estado, "CONFIRMADA")
          )
        )
        .where(
          and(
            eq(clases.boxId, boxId),
            eq(clases.horarioId, horarioId),
            gt(clases.inicio, ahora),
            isNull(clases.deletedAt)
          )
        )
        .groupBy(clases.id)
        .having(sql`COALESCE(COUNT(${reservas.id}), 0) = 0`);

      const idsClasesAfectadas = clasesFuturas.map((c) => c.id);
      if (idsClasesAfectadas.length > 0) {
        await tx
          .update(clases)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(clases.boxId, boxId),
              inArray(clases.id, idsClasesAfectadas)
            )
          );
      }

      return { success: true, id: horarioId };
    });
  }
}
