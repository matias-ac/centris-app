import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO,
  calcularDisponibilidadCreditos,
  obtenerFechaLocal,
  sumarDiasAFecha,
  type CrearReserva,
  type EstadoReserva,
  type FiltroReservas,
  type ModalidadCreditos,
  type Reserva
} from "@centris/shared";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ContextoBoxActivo } from "../../common/decorators/contexto.decorator.js";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
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

function mapearReserva(
  fila: typeof reservas.$inferSelect,
  extras?: {
    claseInicio?: Date;
    claseFin?: Date;
    tipoClaseNombre?: string;
    coachNombre?: string;
    atletaNombre?: string;
    atletaEmail?: string;
  }
): Reserva {
  return {
    id: fila.id,
    boxId: fila.boxId,
    claseId: fila.claseId,
    afiliacionId: fila.afiliacionId,
    membresiaId: fila.membresiaId,
    creadaPorUsuarioId: fila.creadaPorUsuarioId,
    estado: fila.estado as EstadoReserva,
    asistenciaMarcadaEn: fila.asistenciaMarcadaEn
      ? fila.asistenciaMarcadaEn.toISOString()
      : null,
    asistenciaPorUsuarioId: fila.asistenciaPorUsuarioId,
    canceladaEn: fila.canceladaEn ? fila.canceladaEn.toISOString() : null,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    claseInicio: extras?.claseInicio?.toISOString(),
    claseFin: extras?.claseFin?.toISOString(),
    tipoClaseNombre: extras?.tipoClaseNombre,
    coachNombre: extras?.coachNombre,
    atletaNombre: extras?.atletaNombre,
    atletaEmail: extras?.atletaEmail
  };
}

function esViolacionReservaActivaDuplicada(error: unknown): boolean {
  let actual: unknown = error;
  while (actual && typeof actual === "object") {
    const { code, constraint, cause } = actual as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (code === "23505" && constraint === "uq_reserva_activa") {
      return true;
    }
    actual = cause;
  }
  return false;
}

@Injectable()
export class ReservasService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async listarReservas(
    contexto: ContextoBoxActivo,
    filtro?: FiltroReservas
  ): Promise<Reserva[]> {
    const boxId = contexto.boxId;
    validarUuid(boxId, "boxId");

    const esStaff =
      contexto.roles.includes("administrador") ||
      contexto.roles.includes("recepcionista") ||
      contexto.roles.includes("coach");

    if (
      !esStaff &&
      filtro?.afiliacionId &&
      filtro.afiliacionId !== contexto.afiliacionId
    ) {
      throw new DomainException(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "Un Atleta solo puede consultar sus propias Reservas.",
        HttpStatus.FORBIDDEN
      );
    }

    const afiliacionFiltro = esStaff
      ? filtro?.afiliacionId
      : contexto.afiliacionId;

    const [box] = await this.db.client
      .select({ timezone: boxes.timezone })
      .from(boxes)
      .where(eq(boxes.id, boxId));
    const timezone = box?.timezone ?? "America/Argentina/Buenos_Aires";

    const afiliacionAtleta = alias(afiliaciones, "afiliacion_atleta");
    const usuarioAtleta = alias(usuarios, "usuario_atleta");
    const afiliacionCoach = alias(afiliaciones, "afiliacion_coach");
    const usuarioCoach = alias(usuarios, "usuario_coach");

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const condiciones = [eq(reservas.boxId, boxId)];

      if (afiliacionFiltro) {
        condiciones.push(eq(reservas.afiliacionId, afiliacionFiltro));
      }
      if (filtro?.claseId) {
        condiciones.push(eq(reservas.claseId, filtro.claseId));
      }
      if (filtro?.estado) {
        condiciones.push(eq(reservas.estado, filtro.estado));
      }
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
          reserva: reservas,
          claseInicio: clases.inicio,
          claseFin: clases.fin,
          tipoClaseNombre: tiposClase.nombre,
          coachNombre: usuarioCoach.nombre,
          atletaNombre: usuarioAtleta.nombre,
          atletaEmail: usuarioAtleta.email
        })
        .from(reservas)
        .innerJoin(
          clases,
          and(
            eq(reservas.claseId, clases.id),
            eq(reservas.boxId, clases.boxId)
          )
        )
        .innerJoin(
          tiposClase,
          and(
            eq(clases.tipoClaseId, tiposClase.id),
            eq(clases.boxId, tiposClase.boxId)
          )
        )
        .innerJoin(
          afiliacionCoach,
          and(
            eq(clases.coachAfiliacionId, afiliacionCoach.id),
            eq(clases.boxId, afiliacionCoach.boxId)
          )
        )
        .innerJoin(usuarioCoach, eq(afiliacionCoach.usuarioId, usuarioCoach.id))
        .innerJoin(
          afiliacionAtleta,
          and(
            eq(reservas.afiliacionId, afiliacionAtleta.id),
            eq(reservas.boxId, afiliacionAtleta.boxId)
          )
        )
        .innerJoin(
          usuarioAtleta,
          eq(afiliacionAtleta.usuarioId, usuarioAtleta.id)
        )
        .where(and(...condiciones))
        .orderBy(asc(clases.inicio), asc(reservas.createdAt));

      return filas.map((f) =>
        mapearReserva(f.reserva, {
          claseInicio: f.claseInicio,
          claseFin: f.claseFin,
          tipoClaseNombre: f.tipoClaseNombre,
          coachNombre: f.coachNombre,
          atletaNombre: f.atletaNombre,
          atletaEmail: f.atletaEmail
        })
      );
    });
  }

  private validarClaseEnVentanaReserva<
    T extends { inicio: Date; canceladaEn: Date | null }
  >(
    clase: T | undefined,
    timezone: string,
    anticipacionReservaDias: number,
    fechaMaximaReserva: string
  ): { clase: T; fechaLocal: string } {
    if (!clase) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "Clase no encontrada en el Box activo.",
        HttpStatus.NOT_FOUND,
        { claseId: ["Clase inexistente en este Box"] }
      );
    }

    if (clase.canceladaEn !== null) {
      throw new DomainException(
        ERROR_CODES.CLASE_CANCELADA,
        "No es posible reservar una Clase que fue cancelada por el Box.",
        HttpStatus.CONFLICT
      );
    }

    const fechaLocal = obtenerFechaLocal(clase.inicio, timezone);
    if (fechaLocal > fechaMaximaReserva) {
      throw new DomainException(
        ERROR_CODES.FUERA_DE_ANTICIPACION,
        `La Clase solicitada (${fechaLocal}) supera el horizonte de Anticipación de Reserva (${anticipacionReservaDias} días).`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    return { clase, fechaLocal };
  }

  /**
   * Motor transaccional de alta de Reserva con bloqueo pesimista en orden canónico:
   * 1. Bloqueo `SELECT ... FOR UPDATE` sobre `membresias` (serializa al Atleta).
   * 2. Bloqueo `SELECT ... FOR UPDATE` sobre `clases` (serializa el Cupo de la Clase).
   * Desacoplado del estado de Pago / Saldo (ADR 0003, ADR 0005, ADR 0006).
   */
  async crearReserva(
    contexto: ContextoBoxActivo,
    usuarioId: string,
    input: CrearReserva
  ): Promise<Reserva> {
    const boxId = contexto.boxId;
    validarUuid(boxId, "boxId");
    validarUuid(input.claseId, "claseId");

    const esAdminORecep =
      contexto.roles.includes("administrador") ||
      contexto.roles.includes("recepcionista");

    let afiliacionObjetivoId: string;
    if (input.afiliacionId !== undefined) {
      validarUuid(input.afiliacionId, "afiliacionId");
      if (input.afiliacionId !== contexto.afiliacionId && !esAdminORecep) {
        throw new DomainException(
          ERROR_CODES.ACCESO_DENEGADO_ROL,
          "Solo Recepción o Administración pueden crear una Reserva para otro Atleta.",
          HttpStatus.FORBIDDEN
        );
      }
      afiliacionObjetivoId = input.afiliacionId;
    } else {
      if (!contexto.roles.includes("atleta")) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Debe especificar la Afiliación del Atleta para registrar la Reserva.",
          HttpStatus.BAD_REQUEST,
          { afiliacionId: ["Debe indicar la Afiliación del Atleta"] }
        );
      }
      afiliacionObjetivoId = contexto.afiliacionId;
    }

    const [box] = await this.db.client
      .select({
        timezone: boxes.timezone,
        anticipacionReservaDias: boxes.anticipacionReservaDias
      })
      .from(boxes)
      .where(and(eq(boxes.id, boxId), isNull(boxes.deletedAt)));

    if (!box) {
      throw new DomainException(
        ERROR_CODES.BOX_NO_SELECCIONADO,
        "El Box seleccionado no existe o fue desactivado.",
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      return await this.db.withBoxTransaction(boxId, async (tx) => {
        // 1. Verificar que la Afiliación exista en el Box y posea rol 'atleta'
        const [afiliacion] = await tx
          .select({ id: afiliaciones.id, roles: afiliaciones.roles })
          .from(afiliaciones)
          .where(
            and(
              eq(afiliaciones.boxId, boxId),
              eq(afiliaciones.id, afiliacionObjetivoId),
              eq(afiliaciones.activo, true),
              isNull(afiliaciones.deletedAt)
            )
          );

        if (!afiliacion || !afiliacion.roles.includes("atleta")) {
          throw new DomainException(
            ERROR_CODES.VALIDACION_FALLIDA,
            "Atleta no encontrado o inactivo en el Box.",
            HttpStatus.NOT_FOUND,
            { afiliacionId: ["Atleta inexistente en este Box"] }
          );
        }

        // 2. Lectura sin bloqueo de la Clase para obtener su fecha local en timezone del Box
        //    y poder adquirir los bloqueos en el orden canónico estricto: Membresía -> Clase (ADR 0003).
        const [clasePrevia] = await tx
          .select({
            id: clases.id,
            inicio: clases.inicio,
            canceladaEn: clases.canceladaEn
          })
          .from(clases)
          .where(
            and(
              eq(clases.boxId, boxId),
              eq(clases.id, input.claseId),
              isNull(clases.deletedAt)
            )
          );

        const hoyLocal = obtenerFechaLocal(new Date(), box.timezone);
        const fechaMaximaReserva = sumarDiasAFecha(
          hoyLocal,
          box.anticipacionReservaDias
        );
        const { fechaLocal: fechaLocalClaseInicial } =
          this.validarClaseEnVentanaReserva(
            clasePrevia,
            box.timezone,
            box.anticipacionReservaDias,
            fechaMaximaReserva
          );

        // 3. BLOQUEO CANÓNICO #1: Bloquear la fila de MEMBRESIA del Atleta (SELECT ... FOR UPDATE)
        //    Esto serializa todas las peticiones concurrentes del mismo Atleta.
        const [membresiaBloqueada] = await tx
          .select()
          .from(membresias)
          .where(
            and(
              eq(membresias.boxId, boxId),
              eq(membresias.afiliacionId, afiliacionObjetivoId),
              isNull(membresias.deletedAt),
              sql`${membresias.fechaInicio} <= ${fechaLocalClaseInicial}::date`,
              sql`${membresias.fechaFin} >= ${fechaLocalClaseInicial}::date`
            )
          )
          .for("update");

        if (!membresiaBloqueada) {
          throw new DomainException(
            ERROR_CODES.MEMBRESIA_NO_VIGENTE,
            `El Atleta no posee una Membresía vigente que cubra la fecha de la Clase (${fechaLocalClaseInicial}).`,
            HttpStatus.UNPROCESSABLE_ENTITY
          );
        }

        // 4. BLOQUEO CANÓNICO #2: Bloquear la fila de CLASE (SELECT ... FOR UPDATE)
        //    Esto serializa la contienda por Cupos sobre la Clase.
        const [claseEnCurso] = await tx
          .select()
          .from(clases)
          .where(
            and(
              eq(clases.boxId, boxId),
              eq(clases.id, input.claseId),
              isNull(clases.deletedAt)
            )
          )
          .for("update");

        const { clase: claseBloqueada, fechaLocal: fechaLocalClase } =
          this.validarClaseEnVentanaReserva(
            claseEnCurso,
            box.timezone,
            box.anticipacionReservaDias,
            fechaMaximaReserva
          );

        if (
          fechaLocalClase < membresiaBloqueada.fechaInicio ||
          fechaLocalClase > membresiaBloqueada.fechaFin
        ) {
          throw new DomainException(
            ERROR_CODES.MEMBRESIA_NO_VIGENTE,
            `El Atleta no posee una Membresía vigente que cubra la fecha de la Clase (${fechaLocalClase}).`,
            HttpStatus.UNPROCESSABLE_ENTITY
          );
        }

        // 5. Validar unicidad y no superposición horaria [inicio, fin) del mismo Atleta
        const [solapada] = await tx
          .select({ id: reservas.id })
          .from(reservas)
          .innerJoin(
            clases,
            and(
              eq(reservas.claseId, clases.id),
              eq(reservas.boxId, clases.boxId)
            )
          )
          .where(
            and(
              eq(reservas.boxId, boxId),
              eq(reservas.afiliacionId, afiliacionObjetivoId),
              eq(reservas.estado, "CONFIRMADA"),
              isNull(clases.deletedAt),
              sql`${clases.inicio} < ${claseBloqueada.fin}`,
              sql`${clases.fin} > ${claseBloqueada.inicio}`
            )
          )
          .limit(1);

        if (solapada) {
          throw new DomainException(
            ERROR_CODES.SUPERPOSICION_HORARIA,
            "El Atleta ya posee una Reserva confirmada en esa Clase o en un horario que se superpone.",
            HttpStatus.CONFLICT
          );
        }

        // 6. Validar disponibilidad de Créditos en el Período (lunes a domingo en timezone del Box) + creditos_extra
        const consumos = await tx
          .select({ inicioClase: clases.inicio })
          .from(reservas)
          .innerJoin(
            clases,
            and(
              eq(reservas.claseId, clases.id),
              eq(reservas.boxId, clases.boxId)
            )
          )
          .where(
            and(
              eq(reservas.boxId, boxId),
              eq(reservas.membresiaId, membresiaBloqueada.id),
              inArray(reservas.estado, [
                ...ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO
              ])
            )
          );

        const fechasClasesConsumidas = consumos.map((c) =>
          obtenerFechaLocal(c.inicioClase, box.timezone)
        );

        const disponibilidad = calcularDisponibilidadCreditos({
          modalidadCreditos:
            membresiaBloqueada.modalidadCreditos as ModalidadCreditos,
          creditosPorPeriodo: membresiaBloqueada.creditosPorPeriodo,
          creditosExtra: membresiaBloqueada.creditosExtra,
          fechasClasesConsumidas,
          fechaClaseObjetivo: fechaLocalClase
        });

        if (!disponibilidad.disponible) {
          throw new DomainException(
            ERROR_CODES.SIN_CREDITOS_DISPONIBLES,
            "La Membresía no dispone de Créditos para el Período de la Clase ni en su bolsa de créditos extra.",
            HttpStatus.UNPROCESSABLE_ENTITY
          );
        }

        // 7. Validar disponibilidad de Cupos en la Clase bloqueada
        const [conteoCupos] = await tx
          .select({
            confirmadas: sql<number>`COALESCE(COUNT(*), 0)::int`
          })
          .from(reservas)
          .where(
            and(
              eq(reservas.boxId, boxId),
              eq(reservas.claseId, claseBloqueada.id),
              eq(reservas.estado, "CONFIRMADA")
            )
          );

        if ((conteoCupos?.confirmadas ?? 0) >= claseBloqueada.cupos) {
          throw new DomainException(
            ERROR_CODES.CUPO_AGOTADO,
            "La Clase seleccionada no dispone de Cupos libres.",
            HttpStatus.CONFLICT
          );
        }

        // 8. Insertar la Reserva confirmada (sin consultar Saldo ni Pagos — ADR 0006)
        const [insertada] = await tx
          .insert(reservas)
          .values({
            boxId,
            claseId: claseBloqueada.id,
            afiliacionId: afiliacionObjetivoId,
            membresiaId: membresiaBloqueada.id,
            creadaPorUsuarioId: usuarioId,
            estado: "CONFIRMADA"
          })
          .returning();

        if (!insertada) {
          throw new DomainException(
            ERROR_CODES.ERROR_INTERNO,
            "No se pudo registrar la Reserva en la base de datos.",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        return mapearReserva(insertada, {
          claseInicio: claseBloqueada.inicio,
          claseFin: claseBloqueada.fin
        });
      });
    } catch (error) {
      if (esViolacionReservaActivaDuplicada(error)) {
        throw new DomainException(
          ERROR_CODES.SUPERPOSICION_HORARIA,
          "El Atleta ya posee una Reserva confirmada en esta Clase.",
          HttpStatus.CONFLICT
        );
      }
      throw error;
    }
  }
}
