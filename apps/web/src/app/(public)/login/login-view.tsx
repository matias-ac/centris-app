"use client";

import { LayoutGrid, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClassName } from "@/components/ui/button";
import { BENTO_TITLE_CLASSES, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesionAction } from "@/lib/actions";
import {
  AlertaErrorAuth,
  AuthPublicoShell,
  CampoContrasena
} from "../auth-publico-shell";
import {
  procesarEnvioLogin,
  validarCredencialesLogin,
  type ErroresLogin
} from "./login-estado";

export interface LoginViewProps {
  erroresIniciales?: ErroresLogin;
  mostrarContrasenaInicial?: boolean;
}

const BENEFICIOS_ACCESO = [
  {
    id: "acceso-boxes",
    titulo: "Un acceso único para todos tus Boxes",
    descripcion:
      "Si entrenás o trabajás en más de un Box, después de ingresar elegís con cuál operar.",
    Icono: LayoutGrid
  },
  {
    id: "permisos-rol",
    titulo: "Permisos según tu rol",
    descripcion:
      "Ves únicamente las secciones que corresponden a tu perfil: Atleta, Coach, Recepción o Administración.",
    Icono: ShieldCheck
  }
] as const;

/**
 * Vista pública de inicio de sesión Dark Bento Cockpit con validación por campo,
 * toggle accesible de contraseña y enlace al flujo de activación inicial.
 */
export function LoginView({
  erroresIniciales = {},
  mostrarContrasenaInicial = false
}: LoginViewProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(
    mostrarContrasenaInicial
  );
  const [errores, setErrores] = useState<ErroresLogin>(erroresIniciales);
  const [isPending, startTransition] = useTransition();

  function limpiarErrorCampo(campo: "email" | "password") {
    setErrores((actual) => {
      if (!actual[campo] && !actual.general) {
        return actual;
      }
      return {
        ...actual,
        [campo]: undefined,
        general: undefined
      };
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validacion = validarCredencialesLogin(email, password);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      return;
    }

    setErrores({});

    startTransition(async () => {
      const resultado = await procesarEnvioLogin(
        validacion.datos.email,
        validacion.datos.password,
        iniciarSesionAction
      );
      if (!resultado.ok) {
        setErrores(resultado.errores);
        return;
      }
      router.push(resultado.destino);
      router.refresh();
    });
  }

  return (
    <AuthPublicoShell estadoCapsula="Acceso unificado a tus Boxes">
      <section aria-labelledby="login-title" className="min-w-0 flex">
        <Card className="flex w-full flex-col gap-5 p-6">
          <div>
            <h1
              id="login-title"
              className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground"
            >
              Iniciar sesión
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ingresá con tu correo y contraseña para reservar clases o
              administrar tu Box.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <AlertaErrorAuth mensaje={errores.general} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                aria-invalid={errores.email ? "true" : undefined}
                aria-describedby={
                  errores.email ? "error-login-email" : undefined
                }
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  limpiarErrorCampo("email");
                }}
                placeholder="nombre@correo.com"
                required
              />
              {errores.email ? (
                <p
                  id="error-login-email"
                  role="alert"
                  className="text-xs text-[#FF6D6D]"
                >
                  {errores.email}
                </p>
              ) : null}
            </div>

            <CampoContrasena
              id="login-password"
              errorId="error-login-password"
              label="Contraseña"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              mostrar={mostrarContrasena}
              error={errores.password}
              onChange={(valor) => {
                setPassword(valor);
                limpiarErrorCampo("password");
              }}
              onToggleMostrar={() => setMostrarContrasena((actual) => !actual)}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>
        </Card>
      </section>

      <aside aria-label="Información de acceso" className="min-w-0 flex">
        <Card className="flex w-full flex-col justify-between gap-4 p-6">
          <div className="flex flex-col gap-3">
            {BENEFICIOS_ACCESO.map(({ id, titulo, descripcion, Icono }) => (
              <div
                key={id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary p-4"
              >
                <div className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-foreground">
                  <span
                    aria-hidden="true"
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-border bg-card text-primary"
                  >
                    <Icono className="h-4 w-4" aria-hidden={true} />
                  </span>
                  <span>{titulo}</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {descripcion}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
            <h2 className={BENTO_TITLE_CLASSES}>
              ¿Te dieron de alta en recepción?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Si todavía no creaste tu contraseña personal, activá tu acceso por
              única vez con el correo registrado en el Box.
            </p>
            <Link
              href="/activar-cuenta"
              className={buttonClassName("secondary", "w-full")}
            >
              Activar mi cuenta
            </Link>
          </div>
        </Card>
      </aside>
    </AuthPublicoShell>
  );
}
