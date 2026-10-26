import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  type ActivarCuentaInput,
  type LoginInput,
  type SesionAuth
} from "@centris/shared";
import { and, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import { DatabaseService } from "../../database/database.service.js";
import { afiliaciones, usuarios } from "../../database/schema/index.js";
import { hashearContrasena, verificarContrasena } from "./contrasenas.js";
import { JwtTokenService } from "./jwt-token.service.js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(JwtTokenService) private readonly jwtTokenService: JwtTokenService
  ) {}

  private async emitirSesionUsuario(usuario: {
    id: string;
    email: string;
    nombre: string;
  }): Promise<SesionAuth> {
    const accessToken = await this.jwtTokenService.firmarTokenUsuario({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre
    });

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        passwordActivada: true
      }
    };
  }

  async iniciarSesion(input: LoginInput): Promise<SesionAuth> {
    const emailNormalizado = input.email.toLowerCase().trim();
    const filas = await this.db.client
      .select()
      .from(usuarios)
      .where(
        and(eq(usuarios.email, emailNormalizado), isNull(usuarios.deletedAt))
      );

    const usuario = filas[0];
    if (
      !usuario ||
      !usuario.passwordHash ||
      !(await verificarContrasena(input.password, usuario.passwordHash))
    ) {
      throw new DomainException(
        ERROR_CODES.CREDENCIALES_INVALIDAS,
        "Credenciales inválidas o cuenta pendiente de activación inicial.",
        HttpStatus.UNAUTHORIZED
      );
    }

    return this.emitirSesionUsuario(usuario);
  }

  async activarCuentaPrimerIngreso(
    input: ActivarCuentaInput
  ): Promise<SesionAuth> {
    const emailNormalizado = input.email.toLowerCase().trim();
    const filas = await this.db.client
      .select()
      .from(usuarios)
      .where(
        and(eq(usuarios.email, emailNormalizado), isNull(usuarios.deletedAt))
      );

    const usuario = filas[0];
    if (!usuario) {
      throw new DomainException(
        ERROR_CODES.CREDENCIALES_INVALIDAS,
        "No se encontró un Usuario elegible para activación con ese email.",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (usuario.passwordHash !== null) {
      throw new DomainException(
        ERROR_CODES.CUENTA_YA_ACTIVADA,
        "La cuenta ya posee una contraseña configurada.",
        HttpStatus.CONFLICT
      );
    }

    const afiliacionesActivas = await this.db.withUsuarioTransaction(
      usuario.id,
      async (tx) => {
        return tx
          .select()
          .from(afiliaciones)
          .where(
            and(
              eq(afiliaciones.usuarioId, usuario.id),
              eq(afiliaciones.activo, true),
              isNull(afiliaciones.deletedAt)
            )
          );
      }
    );

    if (afiliacionesActivas.length === 0) {
      throw new DomainException(
        ERROR_CODES.CREDENCIALES_INVALIDAS,
        "El Usuario no posee ninguna Afiliación activa para activar su cuenta.",
        HttpStatus.UNAUTHORIZED
      );
    }

    const nuevoHash = await hashearContrasena(input.password);
    const actualizadas = await this.db.client
      .update(usuarios)
      .set({
        passwordHash: nuevoHash,
        updatedAt: new Date()
      })
      .where(and(eq(usuarios.id, usuario.id), isNull(usuarios.passwordHash)))
      .returning();

    if (actualizadas.length === 0) {
      throw new DomainException(
        ERROR_CODES.CUENTA_YA_ACTIVADA,
        "La cuenta ya fue activada previamente.",
        HttpStatus.CONFLICT
      );
    }

    return this.emitirSesionUsuario(usuario);
  }
}
