import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  RolAfiliacionSchema,
  type ActualizarRolesAfiliacion,
  type Afiliacion,
  type AfiliacionConBox,
  type AfiliacionStaff
} from "@centris/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  UUID_REGEX
} from "../../database/database.service.js";
import {
  afiliaciones,
  boxes,
  usuarios
} from "../../database/schema/index.js";

@Injectable()
export class AfiliacionesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async listarMisAfiliaciones(usuarioId: string): Promise<AfiliacionConBox[]> {
    return this.db.withUsuarioTransaction(usuarioId, async (tx) => {
      const filas = await tx
        .select({
          afiliacion: afiliaciones,
          box: boxes
        })
        .from(afiliaciones)
        .innerJoin(boxes, eq(afiliaciones.boxId, boxes.id))
        .where(
          and(
            eq(afiliaciones.activo, true),
            isNull(afiliaciones.deletedAt),
            isNull(boxes.deletedAt)
          )
        )
        .orderBy(asc(boxes.nombre));

      return filas.map(({ afiliacion, box }) => ({
        id: afiliacion.id,
        boxId: afiliacion.boxId,
        usuarioId: afiliacion.usuarioId,
        roles: afiliacion.roles.map((r) => RolAfiliacionSchema.parse(r)),
        activo: afiliacion.activo,
        box: {
          id: box.id,
          nombre: box.nombre,
          slug: box.slug,
          timezone: box.timezone,
          moneda: box.moneda,
          anticipacionReservaDias: box.anticipacionReservaDias,
          ventanaCancelacionMinutos: box.ventanaCancelacionMinutos
        }
      }));
    });
  }

  async listarAfiliacionesDelBox(boxId: string): Promise<AfiliacionStaff[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const filas = await tx
        .select({
          afiliacion: afiliaciones,
          usuario: usuarios
        })
        .from(afiliaciones)
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .where(
          and(
            eq(afiliaciones.activo, true),
            isNull(afiliaciones.deletedAt),
            isNull(usuarios.deletedAt)
          )
        )
        .orderBy(asc(usuarios.nombre));

      return filas.map(({ afiliacion, usuario }) => ({
        id: afiliacion.id,
        boxId: afiliacion.boxId,
        usuarioId: afiliacion.usuarioId,
        roles: afiliacion.roles.map((r) => RolAfiliacionSchema.parse(r)),
        activo: afiliacion.activo,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          passwordActivada: usuario.passwordHash !== null
        }
      }));
    });
  }

  async actualizarRolesAfiliacion(
    boxId: string,
    afiliacionId: string,
    input: ActualizarRolesAfiliacion
  ): Promise<Afiliacion> {
    if (!UUID_REGEX.test(afiliacionId)) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "El identificador de la Afiliación no es un UUID válido.",
        HttpStatus.BAD_REQUEST,
        { id: ["UUID inválido"] }
      );
    }

    const rolesUnicos = Array.from(new Set(input.roles));

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const existentes = await tx
        .select()
        .from(afiliaciones)
        .where(
          and(
            eq(afiliaciones.id, afiliacionId),
            isNull(afiliaciones.deletedAt)
          )
        );

      const actual = existentes[0];
      if (!actual) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "No se encontró la Afiliación en el Box activo.",
          HttpStatus.BAD_REQUEST,
          { id: ["Afiliación inexistente en este Box"] }
        );
      }

      const eraAdmin =
        actual.activo && actual.roles.includes("administrador");
      const sigueSiendoAdmin = rolesUnicos.includes("administrador");

      if (eraAdmin && !sigueSiendoAdmin) {
        const adminsActivos = await tx
          .select({ id: afiliaciones.id })
          .from(afiliaciones)
          .where(
            and(
              eq(afiliaciones.activo, true),
              isNull(afiliaciones.deletedAt),
              sql`${afiliaciones.roles} @> ARRAY['administrador']::text[]`
            )
          );

        if (adminsActivos.length <= 1) {
          throw new DomainException(
            ERROR_CODES.ULTIMO_ADMINISTRADOR,
            "No se puede quitar el rol de Administrador al único Administrador activo del Box.",
            HttpStatus.CONFLICT
          );
        }
      }

      const actualizadas = await tx
        .update(afiliaciones)
        .set({
          roles: rolesUnicos,
          updatedAt: new Date()
        })
        .where(eq(afiliaciones.id, afiliacionId))
        .returning();

      const fila = actualizadas[0]!;
      return {
        id: fila.id,
        boxId: fila.boxId,
        usuarioId: fila.usuarioId,
        roles: fila.roles.map((r) => RolAfiliacionSchema.parse(r)),
        activo: fila.activo
      };
    });
  }

  async eliminarAfiliacionSoftDelete(
    boxId: string,
    afiliacionId: string
  ): Promise<{ eliminada: boolean; id: string }> {
    if (!UUID_REGEX.test(afiliacionId)) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "El identificador de la Afiliación no es un UUID válido.",
        HttpStatus.BAD_REQUEST,
        { id: ["UUID inválido"] }
      );
    }

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const existentes = await tx
        .select()
        .from(afiliaciones)
        .where(
          and(
            eq(afiliaciones.id, afiliacionId),
            isNull(afiliaciones.deletedAt)
          )
        );

      const actual = existentes[0];
      if (!actual) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "No se encontró la Afiliación en el Box activo.",
          HttpStatus.BAD_REQUEST,
          { id: ["Afiliación inexistente en este Box"] }
        );
      }

      if (actual.activo && actual.roles.includes("administrador")) {
        const adminsActivos = await tx
          .select({ id: afiliaciones.id })
          .from(afiliaciones)
          .where(
            and(
              eq(afiliaciones.activo, true),
              isNull(afiliaciones.deletedAt),
              sql`${afiliaciones.roles} @> ARRAY['administrador']::text[]`
            )
          );

        if (adminsActivos.length <= 1) {
          throw new DomainException(
            ERROR_CODES.ULTIMO_ADMINISTRADOR,
            "No se puede dar de baja al único Administrador activo del Box.",
            HttpStatus.CONFLICT
          );
        }
      }

      await tx
        .update(afiliaciones)
        .set({
          activo: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(afiliaciones.id, afiliacionId));

      return { eliminada: true, id: afiliacionId };
    });
  }
}

