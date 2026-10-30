import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  LoginSchema,
  SesionAuthSchema,
  type SesionAuth
} from "@centris/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const DURACION_SESION_SEGUNDOS = 12 * 60 * 60;

function exigirAuthSecret(): string {
  const secreto = process.env.AUTH_SECRET?.trim();
  if (!secreto) {
    throw new Error(
      "Variable de entorno obligatoria no definida: AUTH_SECRET. Configurala en el entorno o en el archivo .env."
    );
  }
  return secreto;
}

export function esTokenJwtVigente(token: string): boolean {
  try {
    const partes = token.split(".");
    if (partes.length !== 3 || !partes[1]) {
      return false;
    }
    const payloadJson = Buffer.from(partes[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== "number") {
      return false;
    }
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export interface SesionUsuarioWeb {
  usuarioId: string;
  email: string;
  nombre: string;
  accessToken: string;
}

const nextAuth = NextAuth({
  secret: exigirAuthSecret(),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: DURACION_SESION_SEGUNDOS
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      name: "Credenciales Centris",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        sesionJson: { label: "Sesión", type: "text" }
      },
      async authorize(credentials) {
        if (typeof credentials?.sesionJson === "string") {
          const parsedSesion = SesionAuthSchema.safeParse(
            JSON.parse(credentials.sesionJson)
          );
          if (parsedSesion.success) {
            return {
              id: parsedSesion.data.usuario.id,
              email: parsedSesion.data.usuario.email,
              name: parsedSesion.data.usuario.nombre,
              accessToken: parsedSesion.data.accessToken
            };
          }
        }

        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          cache: "no-store"
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const sesion = SesionAuthSchema.parse(data);
        return {
          id: sesion.usuario.id,
          email: sesion.usuario.email,
          name: sesion.usuario.nombre,
          accessToken: sesion.accessToken
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          email: string;
          name: string;
          accessToken: string;
        };
        token.usuarioId = u.id;
        token.email = u.email;
        token.name = u.name;
        token.accessToken = u.accessToken;
      }
      return token;
    },
    session({ session, token }) {
      const extendida = session as unknown as {
        usuarioId?: string;
        accessToken?: string;
      };
      extendida.usuarioId =
        typeof token.usuarioId === "string" ? token.usuarioId : "";
      extendida.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : "";
      return session;
    }
  }
});

export const handlers = nextAuth.handlers;

export async function autenticarConSesion(sesion: SesionAuth): Promise<void> {
  await nextAuth.signIn("credentials", {
    sesionJson: JSON.stringify(sesion),
    redirect: false
  });
}

export async function cerrarSesionNextAuth(): Promise<void> {
  await nextAuth.signOut({ redirectTo: "/login" });
}

export async function obtenerSesionWeb(): Promise<SesionUsuarioWeb | null> {
  const session = await nextAuth.auth();
  if (!session?.user?.email) {
    return null;
  }
  const extendida = session as unknown as {
    usuarioId?: string;
    accessToken?: string;
  };
  if (
    !extendida.usuarioId ||
    !extendida.accessToken ||
    !esTokenJwtVigente(extendida.accessToken)
  ) {
    return null;
  }
  return {
    usuarioId: extendida.usuarioId,
    email: session.user.email,
    nombre: session.user.name ?? session.user.email,
    accessToken: extendida.accessToken
  };
}
