"use client";

import { Check } from "lucide-react";
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
  AlertaErrorAuth,
  AuthPublicoShell,
  CampoContrasena
} from "../auth-publico-shell";
import {
  evaluarReglaContrasena,
  procesarEnvioActivacion,
  validarActivacionCuenta,
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

    const validacion = validarActivacionCuenta(email, password);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      return;
    }

    setErrores({});

    startTransition(async () => {
      const resultado = await procesarEnvioActivacion(
        validacion.datos.email,
        validacion.datos.password,
        activarCuentaAction
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
    <AuthPublicoShell estadoCapsula="Primer ingreso al Box">
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
              Si te registraron en recepción, ingresá con el mismo correo y creá
              tu contraseña personal por única vez.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <AlertaErrorAuth mensaje={errores.general} />

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

            <CampoContrasena
              id="activar-password"
              errorId="error-activar-password"
              label="Nueva contraseña"
              autoComplete="new-password"
              placeholder="Elegí una clave segura"
              value={password}
              mostrar={mostrarContrasena}
              error={errores.password}
              extraDescribedBy="regla-activar-password"
              onChange={(valor) => {
                setPassword(valor);
                limpiarErrorCampo("password");
              }}
              onToggleMostrar={() => setMostrarContrasena((actual) => !actual)}
            >
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
            </CampoContrasena>

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
    </AuthPublicoShell>
  );
}
