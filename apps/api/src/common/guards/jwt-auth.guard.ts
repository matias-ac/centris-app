import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ERROR_CODES } from "@centris/shared";
import type { RequestAutenticado } from "../decorators/contexto.decorator.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { DomainException } from "../errors/domain.exception.js";
import { JwtTokenService } from "../../modules/auth/jwt-token.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtTokenService) private readonly jwtTokenService: JwtTokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (esPublica) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestAutenticado>();
    const headerAuth = req.headers.authorization;
    const valorHeader = Array.isArray(headerAuth) ? headerAuth[0] : headerAuth;

    if (!valorHeader || !valorHeader.startsWith("Bearer ")) {
      throw new DomainException(
        ERROR_CODES.NO_AUTENTICADO,
        "Se requiere un token Bearer válido para acceder a este recurso.",
        HttpStatus.UNAUTHORIZED
      );
    }

    const token = valorHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new DomainException(
        ERROR_CODES.NO_AUTENTICADO,
        "El token de autenticación está vacío.",
        HttpStatus.UNAUTHORIZED
      );
    }

    try {
      req.usuario = await this.jwtTokenService.verificarTokenUsuario(token);
      return true;
    } catch {
      throw new DomainException(
        ERROR_CODES.NO_AUTENTICADO,
        "El token de autenticación es inválido o ha expirado.",
        HttpStatus.UNAUTHORIZED
      );
    }
  }
}
