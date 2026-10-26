"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoginSchema } from "@centris/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesionAction } from "@/lib/actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const validado = LoginSchema.safeParse({ email, password });
    if (!validado.success) {
      setErrorMsg(
        validado.error.issues[0]?.message ?? "Verificá tus credenciales."
      );
      return;
    }

    startTransition(async () => {
      const res = await iniciarSesionAction(
        validado.data.email,
        validado.data.password
      );
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      router.push(res.destino ?? "/inicio");
      router.refresh();
    });
  }

  const hayError = Boolean(errorMsg);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          Centris — Identidad Global
        </h1>
        <p className="text-sm text-muted-foreground">
          Iniciá sesión con tu cuenta única para operar en tus Boxes afiliados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingreso a la plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errorMsg ? (
              <div
                role="alert"
                data-testid="alerta-error-auth"
                className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-400"
              >
                <AlertCircle
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                aria-invalid={hayError}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@centris.dev"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={hayError}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Ingresando..." : "Iniciar sesión"}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              ¿Te dieron de alta en recepción por primera vez?{" "}
              <Link
                href="/activar-cuenta"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Activá tu cuenta aquí
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
