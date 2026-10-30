import { Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import { exigirVariableDeEntorno } from "../../common/config/env.js";
import type { UsuarioAutenticado } from "../../common/decorators/contexto.decorator.js";

@Injectable()
export class JwtTokenService {
  private obtenerClaveSecreta(): Uint8Array {
    const secreto = exigirVariableDeEntorno("AUTH_SECRET");
    return new TextEncoder().encode(secreto);
  }

  async firmarTokenUsuario(usuario: UsuarioAutenticado): Promise<string> {
    return new SignJWT({
      email: usuario.email,
      nombre: usuario.nombre
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(usuario.id)
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(this.obtenerClaveSecreta());
  }

  async verificarTokenUsuario(token: string): Promise<UsuarioAutenticado> {
    const { payload } = await jwtVerify(token, this.obtenerClaveSecreta(), {
      algorithms: ["HS256"]
    });
    const id = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    const nombre = typeof payload.nombre === "string" ? payload.nombre : "";
    if (!id || !email) {
      throw new Error("Token JWT sin identidad de usuario válida.");
    }
    return { id, email, nombre };
  }
}
