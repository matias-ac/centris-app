"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActivarCuentaSchema } from "@centris/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activarCuentaAction } from "@/lib/actions";

export default function ActivarCuentaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const validado = ActivarCuentaSchema.safeParse({ email, password });
    if (!validado.success) {
      setErrorMsg(
        validado.error.issues[0]?.message ??
          "Ingresá un email válido y una contraseña de al menos 8 caracteres."
      );
      return;
    }

    startTransition(async () => {
      const res = await activarCuentaAction(
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
          Activación de Primer Ingreso
        </h1>
        <p className="text-sm text-muted-foreground">
          Definí tu contraseña global por única vez si fuiste dado de alta en
          mostrador.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurá tu contraseña</CardTitle>
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
              <Label htmlFor="activar-email">Correo electrónico</Label>
              <Input
                id="activar-email"
                type="email"
                autoComplete="email"
                aria-invalid={hayError}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="atleta.nuevo@centris.dev"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activar-password">Nueva contraseña</Label>
              <Input
                id="activar-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={hayError}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Activando..." : "Activar mi cuenta"}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              ¿Ya tenés contraseña configurada?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
