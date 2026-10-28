import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  RolAfiliacionSchema,
  type ActualizarAtleta,
  type Atleta,
  type CrearAtleta,
  type FiltroAtletas
} from "@centris/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx,
  UUID_REGEX
} from "../../database/database.service.js";
import { afiliaciones, usuarios } from "../../database/schema/index.js";

function validarUuidAtleta(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      "El identificador del Atleta no es un UUID válido.",
      HttpStatus.BAD_REQUEST,
      { id: ["UUID inválido"] }
    );
  }
}

@Injectable()
export class AtletasService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  private mapearAtleta(
    afiliacion: typeof afiliaciones.$inferSelect,
    usuario: typeof usuarios.$inferSelect
  ): Atleta {
    return {
      id: afiliacion.id,
      afiliacionId: afiliacion.id,
      boxId: afiliacion.boxId,
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      roles: afiliacion.roles.map((r) => RolAfiliacionSchema.parse(r)),
      activo: afiliacion.activo,
      createdAt: afiliacion.createdAt,
      updatedAt: afiliacion.updatedAt
    };
  }

  /**
   * Da de alta a un Atleta en el Box activo.
   * - Si el email no existe, aprovisiona Usuario global con password_hash = NULL (primer ingreso).
   * - Si el email ya existe, reutiliza el Usuario sin tocar su password_hash ni revelar otros Boxes.
   * - Si ya existía una Afiliación en este Box (ej. es Coach), agrega 'atleta' sin duplicar fila.
   * - Si no existía Afiliación, crea una nueva con roles=['atleta'].
   */
  async crearAtleta(boxId: string, input: CrearAtleta): Promise<Atleta> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      // 1. Buscar o crear Usuario global
      const usuariosExistentes = await tx
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, input.email));

      let usuario = usuariosExistentes[0];

      if (!usuario) {
        const [nuevoUsuario] = await tx
          .insert(usuarios)
          .values({
            email: input.email,
            nombre: input.nombre,
            passwordHash: null
          })
          .returning();
        usuario = nuevoUsuario!;
      }

      // 2. Buscar si ya existe Afiliación en este Box (aislada por RLS con box_id)
      const afiliacionesExistentes = await tx
        .select()
        .from(afiliaciones)
        .where(eq(afiliaciones.usuarioId, usuario.id));

      let afiliacion = afiliacionesExistentes[0];

      if (afiliacion) {
        const rolesActuales = afiliacion.roles;
        const rolesCombinados = Array.from(new Set([...rolesActuales, "atleta"]));

        const [afiliacionActualizada] = await tx
          .update(afiliaciones)
          .set({
            roles: rolesCombinados,
            activo: true,
            deletedAt: null,
            updatedAt: new Date()
          })
          .where(eq(afiliaciones.id, afiliacion.id))
          .returning();

        afiliacion = afiliacionActualizada!;
      } else {
        const [nuevaAfiliacion] = await tx
          .insert(afiliaciones)
          .values({
            boxId,
            usuarioId: usuario.id,
            roles: ["atleta"],
            activo: true
          })
          .returning();

        afiliacion = nuevaAfiliacion!;
      }

      return this.mapearAtleta(afiliacion, usuario);
    });
  }

  /**
   * Lista y busca atletas afiliados al Box activo respetando RLS.
   */
  async listarAtletas(
    boxId: string,
    filtro: FiltroAtletas
  ): Promise<Atleta[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const condiciones = [
        eq(afiliaciones.boxId, boxId),
        isNull(usuarios.deletedAt),
        sql`${afiliaciones.roles} @> ARRAY['atleta']::text[]`
      ];

      if (filtro.soloActivos !== false) {
        condiciones.push(eq(afiliaciones.activo, true));
        condiciones.push(isNull(afiliaciones.deletedAt));
      }

      if (filtro.buscar) {
        const termino = `%${filtro.buscar}%`;
        condiciones.push(
          sql`(${usuarios.nombre} ILIKE ${termino} OR ${usuarios.email} ILIKE ${termino})`
        );
      }

      const filas = await tx
        .select({
          afiliacion: afiliaciones,
          usuario: usuarios
        })
        .from(afiliaciones)
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .where(and(...condiciones))
        .orderBy(asc(usuarios.nombre));

      return filas.map(({ afiliacion, usuario }) =>
        this.mapearAtleta(afiliacion, usuario)
      );
    });
  }

  private async consultarAtleta(
    tx: DrizzleTx,
    atletaId: string
  ): Promise<Atleta> {
    const filas = await tx
      .select({
        afiliacion: afiliaciones,
        usuario: usuarios
      })
      .from(afiliaciones)
      .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
      .where(
        and(
          eq(afiliaciones.id, atletaId),
          sql`${afiliaciones.roles} @> ARRAY['atleta']::text[]`
        )
      );

    const fila = filas[0];
    if (!fila) {
      throw new DomainException(
        ERROR_CODES.VALIDACION_FALLIDA,
        "No se encontró el Atleta en el Box activo.",
        HttpStatus.NOT_FOUND,
        { id: ["Atleta no encontrado en este Box"] }
      );
    }

    return this.mapearAtleta(fila.afiliacion, fila.usuario);
  }

  /**
   * Obtiene la ficha individual de un Atleta en el Box activo.
   */
  async obtenerAtletaPorId(
    boxId: string,
    atletaId: string
  ): Promise<Atleta> {
    validarUuidAtleta(atletaId);

    return this.db.withBoxTransaction(boxId, async (tx) => {
      return this.consultarAtleta(tx, atletaId);
    });
  }

  /**
   * Actualiza datos operativos del Atleta (nombre o estado activo).
   * Si la afiliación posee otros roles (ej. Coach) y se desactiva como Atleta,
   * se remueve el rol 'atleta' sin dar de baja la afiliación en su totalidad.
   */
  async actualizarAtleta(
    boxId: string,
    atletaId: string,
    input: ActualizarAtleta
  ): Promise<Atleta> {
    validarUuidAtleta(atletaId);

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const atletaExistente = await this.consultarAtleta(tx, atletaId);

      if (input.nombre && input.nombre !== atletaExistente.nombre) {
        await tx
          .update(usuarios)
          .set({
            nombre: input.nombre,
            updatedAt: new Date()
          })
          .where(eq(usuarios.id, atletaExistente.usuarioId));
      }

      if (input.activo !== undefined) {
        const [afiliacionActual] = await tx
          .select()
          .from(afiliaciones)
          .where(eq(afiliaciones.id, atletaId));

        if (afiliacionActual) {
          if (input.activo === false) {
            const otrosRoles = afiliacionActual.roles.filter(
              (r) => r !== "atleta"
            );
            if (otrosRoles.length > 0) {
              await tx
                .update(afiliaciones)
                .set({
                  roles: otrosRoles,
                  updatedAt: new Date()
                })
                .where(eq(afiliaciones.id, atletaId));
            } else {
              await tx
                .update(afiliaciones)
                .set({
                  activo: false,
                  deletedAt: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(afiliaciones.id, atletaId));
            }
          } else {
            const rolesConAtleta = Array.from(
              new Set([...afiliacionActual.roles, "atleta"])
            );
            await tx
              .update(afiliaciones)
              .set({
                roles: rolesConAtleta,
                activo: true,
                deletedAt: null,
                updatedAt: new Date()
              })
              .where(eq(afiliaciones.id, atletaId));
          }
        }
      }

      return this.consultarAtleta(tx, atletaId);
    });
  }

  /**
   * Desactiva / aplica Soft Delete a la condición de Atleta.
   * Si el usuario posee múltiples roles en el Box (ej. es Coach y Atleta),
   * preserva la Afiliación para el resto de los roles y remueve únicamente 'atleta'.
   */
  async eliminarAtletaSoftDelete(
    boxId: string,
    atletaId: string
  ): Promise<{ eliminada: boolean; id: string }> {
    validarUuidAtleta(atletaId);

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [fila] = await tx
        .select()
        .from(afiliaciones)
        .where(
          and(
            eq(afiliaciones.id, atletaId),
            sql`${afiliaciones.roles} @> ARRAY['atleta']::text[]`
          )
        );

      if (!fila) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "No se encontró el Atleta en el Box activo.",
          HttpStatus.NOT_FOUND,
          { id: ["Atleta no encontrado en este Box"] }
        );
      }

      const otrosRoles = fila.roles.filter((r) => r !== "atleta");

      if (otrosRoles.length > 0) {
        await tx
          .update(afiliaciones)
          .set({
            roles: otrosRoles,
            updatedAt: new Date()
          })
          .where(eq(afiliaciones.id, atletaId));
      } else {
        await tx
          .update(afiliaciones)
          .set({
            activo: false,
            deletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(afiliaciones.id, atletaId));
      }

      return { eliminada: true, id: atletaId };
    });
  }
}
