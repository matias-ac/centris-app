import {
  createParamDecorator,
  type ExecutionContext
} from "@nestjs/common";
import type { RolAfiliacion } from "@centris/shared";

export interface UsuarioAutenticado {
  id: string;
  email: string;
  nombre: string;
}

export interface ContextoBoxActivo {
  boxId: string;
  afiliacionId: string;
  roles: RolAfiliacion[];
}

export interface RequestAutenticado {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | undefined>;
  usuario?: UsuarioAutenticado;
  contextoBox?: ContextoBoxActivo;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const req = ctx.switchToHttp().getRequest<RequestAutenticado>();
    if (!req.usuario) {
      throw new Error("UsuarioActual invocado en ruta sin usuario autenticado.");
    }
    return req.usuario;
  }
);

export const ContextoBox = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ContextoBoxActivo => {
    const req = ctx.switchToHttp().getRequest<RequestAutenticado>();
    if (!req.contextoBox) {
      throw new Error("ContextoBox invocado en ruta sin contexto de Box.");
    }
    return req.contextoBox;
  }
);
