import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ERROR_CODES,
  RolAfiliacionSchema,
  tieneAlgunRol,
  type RolAfiliacion
} from "@centris/shared";
import { and, eq, isNull } from "drizzle-orm";
import {
  DatabaseService,
  UUID_REGEX
} from "../../database/database.service.js";
import { afiliaciones } from "../../database/schema/index.js";
import type { RequestAutenticado } from "../decorators/contexto.decorator.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import { DomainException } from "../errors/domain.exception.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (esPublica) {
      return true;
    }

    const rolesRequeridos = this.reflector.getAllAndOverride<
      RolAfiliacion[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestAutenticado>();
    if (!req.usuario) {
      throw new DomainException(
        ERROR_CODES.NO_AUTENTICADO,
        "Usuario no autenticado.",
        HttpStatus.UNAUTHORIZED
      );
    }

    const rawBoxHeader = req.headers["x-box-id"];
    const headerBoxId = Array.isArray(rawBoxHeader)
      ? rawBoxHeader[0]
      : rawBoxHeader;
    const boxId = headerBoxId ?? req.query?.boxId;

    if (!boxId || !UUID_REGEX.test(boxId)) {
      throw new DomainException(
        ERROR_CODES.BOX_NO_SELECCIONADO,
        "Debés seleccionar un Box activo válido para ejecutar esta operación.",
        HttpStatus.BAD_REQUEST
      );
    }

    const usuarioId = req.usuario.id;
    const afiliacionActiva = await this.db.withBoxTransaction(
      boxId,
      async (tx) => {
        const filas = await tx
          .select()
          .from(afiliaciones)
          .where(
            and(
              eq(afiliaciones.boxId, boxId),
              eq(afiliaciones.usuarioId, usuarioId),
              eq(afiliaciones.activo, true),
              isNull(afiliaciones.deletedAt)
            )
          );
        return filas[0] ?? null;
      }
    );

    if (!afiliacionActiva) {
      throw new DomainException(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "No poseés una Afiliación activa en el Box seleccionado.",
        HttpStatus.FORBIDDEN
      );
    }

    const rolesValidados = afiliacionActiva.roles.map((r) =>
      RolAfiliacionSchema.parse(r)
    );

    if (!tieneAlgunRol(rolesValidados, rolesRequeridos)) {
      throw new DomainException(
        ERROR_CODES.ACCESO_DENEGADO_ROL,
        "Tu Afiliación activa en este Box no cuenta con los roles requeridos para realizar esta acción.",
        HttpStatus.FORBIDDEN
      );
    }

    req.contextoBox = {
      boxId,
      afiliacionId: afiliacionActiva.id,
      roles: rolesValidados
    };

    return true;
  }
}
