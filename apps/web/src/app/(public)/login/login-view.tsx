"use client";

import {
  AlertCircle,
  Eye,
  EyeOff,
  LayoutGrid,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesionAction } from "@/lib/actions";
import {
  traducirErrorAutenticacion,
  validarCredencialesLogin,
  type ErroresLogin
} from "./login-estado";

export interface LoginViewProps {
  erroresIniciales?: ErroresLogin;
  mostrarContrasenaInicial?: boolean;
}

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
      try {
        const res = await iniciarSesionAction(
          validacion.datos.email,
          validacion.datos.password
        );
        if (!res.ok) {
          setErrores({
            general: traducirErrorAutenticacion(res.errorCode, res.message)
          });
          return;
        }
        router.push(res.destino ?? "/inicio");
        router.refresh();
      } catch {
        setErrores({
          general: traducirErrorAutenticacion()
        });
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[980px] flex-col justify-center gap-6 px-4 py-7 sm:px-5 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-xl text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[1.0625rem] font-semibold text-primary-foreground"
          >
            C
          </span>
          <span>Centris</span>
        </Link>

        <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[#18FFC8]"
          />
          <span>Acceso unificado a tus Boxes</span>
        </span>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-5 min-[860px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section aria-labelledby="login-title" className="min-w-0 flex">
          <Card className="flex w-full flex-col gap-5 p-6 sm:p-[30px]">
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
              {errores.general ? (
                <div
                  role="alert"
                  data-testid="alerta-error-auth"
                  className="flex items-start gap-2.5 rounded-[14px] border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-3 text-sm text-[#FECACA]"
                >
                  <AlertCircle
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FF6D6D]"
                    aria-hidden={true}
                  />
                  <span>{errores.general}</span>
                </div>
              ) : null}

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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={mostrarContrasena ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={errores.password ? "true" : undefined}
                    aria-describedby={
                      errores.password ? "error-login-password" : undefined
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      limpiarErrorCampo("password");
                    }}
                    placeholder="Tu contraseña"
                    className="pr-13"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena((actual) => !actual)}
                    aria-controls="login-password"
                    aria-label={
                      mostrarContrasena ? "Ocultar clave" : "Mostrar clave"
                    }
                    aria-pressed={mostrarContrasena}
                    className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {mostrarContrasena ? (
                      <EyeOff className="h-[18px] w-[18px]" aria-hidden={true} />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" aria-hidden={true} />
                    )}
                  </button>
                </div>
                {errores.password ? (
                  <p
                    id="error-login-password"
                    role="alert"
                    className="text-xs text-[#FF6D6D]"
                  >
                    {errores.password}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="min-h-[46px] w-full"
                disabled={isPending}
              >
                {isPending ? "Ingresando..." : "Iniciar sesión"}
              </Button>
            </form>
          </Card>
        </section>

        <aside aria-label="Información de acceso" className="min-w-0 flex">
          <Card className="flex w-full flex-col justify-between gap-4 p-6 sm:p-[30px]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary p-[18px]">
                <div className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-foreground">
                  <span
                    aria-hidden="true"
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-border bg-card text-primary"
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden={true} />
                  </span>
                  <span>Una cuenta para todos tus Boxes</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Si entrenás o trabajás en más de un Box, después de ingresar
                  elegís con cuál operar.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary p-[18px]">
                <div className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-foreground">
                  <span
                    aria-hidden="true"
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-border bg-card text-primary"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden={true} />
                  </span>
                  <span>Permisos según tu rol</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ves únicamente las secciones que corresponden a tu perfil:
                  Atleta, Coach, Recepción o Administración.
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-border bg-secondary p-[18px]">
              <h2 className="text-[0.9375rem] font-medium text-foreground">
                ¿Te dieron de alta en recepción?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Si todavía no creaste tu contraseña personal, activá tu cuenta
                por única vez con el correo registrado en el Box.
              </p>
              <Link
                href="/activar-cuenta"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-card px-[18px] py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-[#3A3C42] hover:bg-[#222328] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Activar mi cuenta
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
