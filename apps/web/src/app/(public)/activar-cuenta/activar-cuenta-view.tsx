"use client";

import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { BENTO_TITLE_CLASSES, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activarCuentaAction } from "@/lib/actions";
import {
  evaluarReglaContrasena,
  procesarEnvioActivacion,
  type ErroresActivacion
} from "./activar-cuenta-estado";

export interface ActivarCuentaViewProps {
  erroresIniciales?: ErroresActivacion;
  passwordInicial?: string;
  mostrarContrasenaInicial?: boolean;
}

const PASOS_ACTIVACION = [
  {
    numero: 1,
    texto:
      "Confirmá el correo electrónico con el que te dieron de alta en el Box."
  },
  {
    numero: 2,
    texto:
      "Elegí tu contraseña de al menos 8 caracteres para proteger tu acceso."
  },
  {
    numero: 3,
    texto:
      "Ingresás directo a tus reservas, créditos disponibles y horarios del Box."
  }
] as const;

/**
 * Vista pública de activación inicial en Dark Bento Cockpit para personas
 * dadas de alta en recepción sin contraseña configurada.
 */
export function ActivarCuentaView({
  erroresIniciales = {},
  passwordInicial = "",
  mostrarContrasenaInicial = false
}: ActivarCuentaViewProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(passwordInicial);
  const [mostrarContrasena, setMostrarContrasena] = useState(
    mostrarContrasenaInicial
  );
  const [errores, setErrores] = useState<ErroresActivacion>(erroresIniciales);
  const [isPending, startTransition] = useTransition();

  const reglaContrasena = evaluarReglaContrasena(password);

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

    startTransition(async () => {
      const resultado = await procesarEnvioActivacion(
        email,
        password,
        activarCuentaAction
      );
      if (!resultado.ok) {
        setErrores(resultado.errores);
        return;
      }
      setErrores({});
      router.push(resultado.destino);
      router.refresh();
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-[1.0625rem] font-semibold text-primary-foreground"
          >
            C
          </span>
          <span>Centris</span>
        </Link>

        <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium tracking-[0.02em] text-muted-foreground">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[#18FFC8]"
          />
          <span>Primer ingreso al Box</span>
        </span>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-5 min-[860px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section aria-labelledby="activate-title" className="min-w-0 flex">
          <Card className="flex w-full flex-col gap-5 p-6">
            <div>
              <h1
                id="activate-title"
                className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground"
              >
                Activá tu cuenta
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Si te registraron en recepción, ingresá con el mismo correo y
                creá tu contraseña personal por única vez.
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
                  className="flex items-start gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-3 text-sm text-[#FF6D6D]"
                >
                  <AlertCircle
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FF6D6D]"
                    aria-hidden={true}
                  />
                  <span>{errores.general}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="activar-email">Correo electrónico</Label>
                <Input
                  id="activar-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errores.email ? "true" : undefined}
                  aria-describedby={
                    errores.email
                      ? "error-activar-email hint-activar-email"
                      : "hint-activar-email"
                  }
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    limpiarErrorCampo("email");
                  }}
                  placeholder="nombre@correo.com"
                  required
                />
                <p
                  id="hint-activar-email"
                  className="text-xs text-muted-foreground"
                >
                  Usá el mismo correo electrónico con el que te registraron en el
                  Box.
                </p>
                {errores.email ? (
                  <p
                    id="error-activar-email"
                    role="alert"
                    className="text-xs text-[#FF6D6D]"
                  >
                    {errores.email}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="activar-password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="activar-password"
                    type={mostrarContrasena ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={errores.password ? "true" : undefined}
                    aria-describedby={
                      errores.password
                        ? "error-activar-password regla-activar-password"
                        : "regla-activar-password"
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      limpiarErrorCampo("password");
                    }}
                    placeholder="Elegí una clave segura"
                    className="pr-13"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena((actual) => !actual)}
                    aria-controls="activar-password"
                    aria-label={
                      mostrarContrasena ? "Ocultar clave" : "Mostrar clave"
                    }
                    aria-pressed={mostrarContrasena}
                    className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {mostrarContrasena ? (
                      <EyeOff className="h-[18px] w-[18px]" aria-hidden={true} />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" aria-hidden={true} />
                    )}
                  </button>
                </div>

                <div
                  id="regla-activar-password"
                  className="mt-0.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <Badge
                    variant={reglaContrasena.cumpleMinimo ? "mint" : "zinc"}
                    data-testid="badge-minimo-contrasena"
                  >
                    {reglaContrasena.cumpleMinimo ? (
                      <Check className="h-3.5 w-3.5" aria-hidden={true} />
                    ) : null}
                    <span>{reglaContrasena.etiqueta}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {reglaContrasena.contador}
                  </span>
                </div>

                {errores.password ? (
                  <p
                    id="error-activar-password"
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
                className="w-full"
                disabled={isPending}
              >
                {isPending ? "Activando..." : "Activar mi cuenta"}
              </Button>
            </form>
          </Card>
        </section>

        <aside
          aria-label="Cómo funciona la activación"
          className="min-w-0 flex"
        >
          <Card className="flex w-full flex-col justify-between gap-4 p-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary p-4">
              <h2 className={BENTO_TITLE_CLASSES}>Cómo funciona</h2>
              <ol className="flex flex-col gap-3">
                {PASOS_ACTIVACION.map(({ numero, texto }) => (
                  <li
                    key={numero}
                    className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-semibold text-primary tabular-nums">
                      {numero}
                    </span>
                    <span>{texto}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
              <h2 className={BENTO_TITLE_CLASSES}>
                ¿Ya creaste tu contraseña antes?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Si ya activaste tu cuenta previamente, iniciá sesión de forma
                directa con tu correo y clave.
              </p>
              <Link
                href="/login"
                className={buttonClassName("secondary", "w-full")}
              >
                Volver a iniciar sesión
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
