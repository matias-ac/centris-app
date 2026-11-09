import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type CancelarClase,
  type Clase,
  type EditarClase,
  type FiltroClases,
  type RolAfiliacion
} from "@centris/shared";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx,
  UUID_REGEX
} from "../../database/database.service.js";
import {
  afiliaciones,
  boxes,
  clases,
  membresias,
  reservas,
  tiposClase,
  usuarios
} from "../../database/schema/index.js";

function validarUuid(id: string, campo: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      `El identificador ${campo} no es un UUID válido.`,
      HttpStatus.BAD_REQUEST,
      { [campo]: ["UUID inválido"] }
    );
  }
}

function mapearClase(
  fila: typeof clases.$inferSelect,
  tipoClaseNombre?: string,
  coachNombre?: string,
  reservasConfirmadas = 0
): Clase {
  return {
    id: fila.id,
    boxId: fila.boxId,
    horarioId: fila.horarioId,
    tipoClaseId: fila.tipoClaseId,
    coachAfiliacionId: fila.coachAfiliacionId,
    inicio: fila.inicio.toISOString(),
    fin: fila.fin.toISOString(),
    cupos: fila.cupos,
    canceladaEn: fila.canceladaEn ? fila.canceladaEn.toISOString() : null,
    canceladaPorUsuarioId: fila.canceladaPorUsuarioId,
    motivoCancelacion: fila.motivoCancelacion,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    deletedAt: fila.deletedAt ? fila.deletedAt.toISOString() : null,
    tipoClaseNombre,
    coachNombre,
    reservasConfirmadas
  };
}

@Injectable()
export class ClasesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  private async validarCoach(
    tx: DrizzleTx,
    boxId: string,
    coachAfiliacionId: string
  ): Promise<void> {
    const [afiliacion] = await tx
      .select({ id: afiliaciones.id, roles: afiliaciones.roles })
      .from(afiliaciones)
      .where(
        and(
          eq(afiliaciones.id, coachAfiliacionId),
          eq(afiliaciones.boxId, boxId),
          eq(afiliaciones.activo, true),
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

  async listarClases(boxId: string, filtro?: FiltroClases): Promise<Clase[]> {
    validarUuid(boxId, "boxId");

    const [box] = await this.db.client
      .select({ timezone: boxes.timezone })
      .from(boxes)
      .where(eq(boxes.id, boxId));
    const timezone = box?.timezone ?? "America/Argentina/Buenos_Aires";

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const condiciones = [
        eq(clases.boxId, boxId),
        isNull(clases.deletedAt)
      ];

      if (filtro?.desde) {
        condiciones.push(
          sql`(${clases.inicio} AT TIME ZONE ${timezone})::date >= ${filtro.desde}::date`
        );
      }
      if (filtro?.hasta) {
        condiciones.push(
          sql`(${clases.inicio} AT TIME ZONE ${timezone})::date <= ${filtro.hasta}::date`
        );
      }

      const filas = await tx
        .select({
          clase: clases,
          tipoClaseNombre: tiposClase.nombre,
          coachNombre: usuarios.nombre,
          reservasConfirmadas: sql<number>`COALESCE(COUNT(${reservas.id}) FILTER (WHERE ${reservas.estado} = 'CONFIRMADA'), 0)::int`
        })
        .from(clases)
        .innerJoin(
          tiposClase,
          and(
            eq(clases.tipoClaseId, tiposClase.id),
            eq(clases.boxId, tiposClase.boxId)
          )
        )
        .innerJoin(
          afiliaciones,
          and(
            eq(clases.coachAfiliacionId, afiliaciones.id),
            eq(clases.boxId, afiliaciones.boxId)
          )
        )
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .leftJoin(
          reservas,
          and(
            eq(clases.id, reservas.claseId),
            eq(clases.boxId, reservas.boxId)
          )
        )
        .where(and(...condiciones))
        .groupBy(clases.id, tiposClase.nombre, usuarios.nombre)
        .orderBy(asc(clases.inicio));

      return filas.map(({ clase, tipoClaseNombre, coachNombre, reservasConfirmadas }) =>
        mapearClase(clase, tipoClaseNombre, coachNombre, reservasConfirmadas)
      );
    });
  }

  async obtenerClasePorId(boxId: string, claseId: string): Promise<Clase> {
    validarUuid(claseId, "id");

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [fila] = await tx
        .select({
          clase: clases,
          tipoClaseNombre: tiposClase.nombre,
          coachNombre: usuarios.nombre,
          reservasConfirmadas: sql<number>`COALESCE(COUNT(${reservas.id}) FILTER (WHERE ${reservas.estado} = 'CONFIRMADA'), 0)::int`
        })
        .from(clases)
        .innerJoin(
          tiposClase,
          and(
            eq(clases.tipoClaseId, tiposClase.id),
            eq(clases.boxId, tiposClase.boxId)
          )
        )
        .innerJoin(
          afiliaciones,
          and(
            eq(clases.coachAfiliacionId, afiliaciones.id),
            eq(clases.boxId, afiliaciones.boxId)
          )
        )
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .leftJoin(
          reservas,
          and(
            eq(clases.id, reservas.claseId),
            eq(clases.boxId, reservas.boxId)
          )
        )
        .where(
          and(
            eq(clases.id, claseId),
            eq(clases.boxId, boxId),
            isNull(clases.deletedAt)
          )
        )
        .groupBy(clases.id, tiposClase.nombre, usuarios.nombre);

      if (!fila) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Clase no encontrada en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Clase inexistente en este Box"] }
        );
      }

      return mapearClase(
        fila.clase,
        fila.tipoClaseNombre,
        fila.coachNombre,
        fila.reservasConfirmadas
      );
    });
  }

  async editarClase(
    boxId: string,
    claseId: string,
    rolesUsuario: RolAfiliacion[],
    input: EditarClase
  ): Promise<Clase> {
    validarUuid(claseId, "id");

    const esAdmin = rolesUsuario.includes("administrador");
    const esRecep = rolesUsuario.includes("recepcionista");

    if (!esAdmin && !esRecep) {
      throw new DomainException(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "No posee permisos suficientes para editar una Clase.",
        HttpStatus.FORBIDDEN
      );
    }

    // Solo un Administrador puede alterar coach o instantes de inicio/fin
    if (
      (input.coachAfiliacionId !== undefined ||
        input.inicio !== undefined ||
        input.duracionMinutos !== undefined) &&
      !esAdmin
    ) {
      throw new DomainException(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "Solo un Administrador puede modificar el coach o el horario de una Clase puntual.",
        HttpStatus.FORBIDDEN
      );
    }

    await this.db.withBoxTransaction(boxId, async (tx) => {
      const [existente] = await tx
        .select()
        .from(clases)
        .where(
          and(
            eq(clases.id, claseId),
            eq(clases.boxId, boxId),
            isNull(clases.deletedAt)
          )
        )
        .for("update");

      if (!existente) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Clase no encontrada en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Clase inexistente en este Box"] }
        );
      }

      if (input.coachAfiliacionId) {
        await this.validarCoach(tx, boxId, input.coachAfiliacionId);
      }

      if (input.cupos !== undefined) {
        // Criterio 3: Invariante de reducción de Cupos
        const [conteo] = await tx
          .select({
            total: sql<number>`COALESCE(COUNT(*), 0)::int`
          })
          .from(reservas)
          .where(
            and(
              eq(reservas.boxId, boxId),
              eq(reservas.claseId, claseId),
              eq(reservas.estado, "CONFIRMADA")
            )
          );

        const reservasConfirmadas = conteo?.total ?? 0;
        if (input.cupos < reservasConfirmadas) {
          throw new DomainException(
            ERROR_CODES.CUPO_MENOR_A_RESERVAS,
            `No se puede reducir el Cupo a ${input.cupos} porque la Clase ya cuenta con ${reservasConfirmadas} Reservas confirmadas.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
            {
              cupos: [
                `No se puede reducir el Cupo por debajo de las ${reservasConfirmadas} reservas confirmadas.`
              ]
            }
          );
        }
      }

      const updates: Partial<typeof clases.$inferInsert> = {
        updatedAt: new Date()
      };
      if (input.coachAfiliacionId !== undefined) {
        updates.coachAfiliacionId = input.coachAfiliacionId;
      }
      if (input.cupos !== undefined) {
        updates.cupos = input.cupos;
      }

      if (input.inicio !== undefined || input.duracionMinutos !== undefined) {
        const inicioDate = input.inicio
          ? new Date(input.inicio)
          : existente.inicio;
        const duracionMs =
          input.duracionMinutos !== undefined
            ? input.duracionMinutos * 60_000
            : existente.fin.getTime() - existente.inicio.getTime();
        updates.inicio = inicioDate;
        updates.fin = new Date(inicioDate.getTime() + duracionMs);
      }

      await tx
        .update(clases)
        .set(updates)
        .where(and(eq(clases.id, claseId), eq(clases.boxId, boxId)));
    });

    return this.obtenerClasePorId(boxId, claseId);
  }

  /**
   * Cancela una Clase puntual por decisión del Administrador del Box (ADR 0003, PRD §4.3.4):
   * - Adquiere bloqueos en el orden canónico (Membresías afectadas -> Clase).
   * - Marca la Clase como cancelada (`cancelada_en`, `cancelada_por_usuario_id`, `motivo_cancelacion`).
   * - Pasa todas sus Reservas confirmadas a `CANCELADA_POR_BOX` en la misma transacción,
   *   restituyendo el 100% de los Créditos incluso dentro de la Ventana de Cancelación.
   */
  async cancelarClase(
    boxId: string,
    claseId: string,
    usuarioId: string,
    input: CancelarClase
  ): Promise<Clase> {
    validarUuid(boxId, "boxId");
    validarUuid(claseId, "id");

    await this.db.withBoxTransaction(boxId, async (tx) => {
      // 1. Identificar las Membresías con Reserva confirmada en la Clase y bloquearlas en orden canónico (Membresía -> Clase)
      const reservasActivas = await tx
        .select({ membresiaId: reservas.membresiaId })
        .from(reservas)
        .where(
          and(
            eq(reservas.boxId, boxId),
            eq(reservas.claseId, claseId),
            eq(reservas.estado, "CONFIRMADA")
          )
        );

      const membresiaIds = [
        ...new Set(reservasActivas.map((r) => r.membresiaId))
      ].sort();

      if (membresiaIds.length > 0) {
        await tx
          .select({ id: membresias.id })
          .from(membresias)
          .where(
            and(
              eq(membresias.boxId, boxId),
              inArray(membresias.id, membresiaIds)
            )
          )
          .orderBy(asc(membresias.id))
          .for("update");
      }

      // 2. Bloquear la fila de CLASE (SELECT ... FOR UPDATE)
      const [existente] = await tx
        .select()
        .from(clases)
        .where(
          and(
            eq(clases.id, claseId),
            eq(clases.boxId, boxId),
            isNull(clases.deletedAt)
          )
        )
        .for("update");

      if (!existente) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Clase no encontrada en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Clase inexistente en este Box"] }
        );
      }

      if (existente.canceladaEn !== null) {
        throw new DomainException(
          ERROR_CODES.CLASE_CANCELADA,
          "La Clase seleccionada ya se encuentra cancelada.",
          HttpStatus.CONFLICT
        );
      }

      const ahora = new Date();

      await tx
        .update(clases)
        .set({
          canceladaEn: ahora,
          canceladaPorUsuarioId: usuarioId,
          motivoCancelacion: input.motivoCancelacion ?? null,
          updatedAt: ahora
        })
        .where(and(eq(clases.id, claseId), eq(clases.boxId, boxId)));

      await tx
        .update(reservas)
        .set({
          estado: "CANCELADA_POR_BOX",
          canceladaEn: ahora,
          updatedAt: ahora
        })
        .where(
          and(
            eq(reservas.boxId, boxId),
            eq(reservas.claseId, claseId),
            eq(reservas.estado, "CONFIRMADA")
          )
        );
    });

    return this.obtenerClasePorId(boxId, claseId);
  }
}
