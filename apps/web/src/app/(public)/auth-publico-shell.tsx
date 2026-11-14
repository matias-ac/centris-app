"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AuthPublicoShellProps {
  estadoCapsula: string;
  children: React.ReactNode;
}

/**
 * Marco común Dark Bento Cockpit para rutas públicas de autenticación (/login, /activar-cuenta).
 */
export function AuthPublicoShell({
  estadoCapsula,
  children
}: AuthPublicoShellProps) {
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
          <span>{estadoCapsula}</span>
        </span>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-5 min-[860px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {children}
      </div>
    </main>
  );
}

/**
 * Alerta accesible para errores generales de autenticación sin códigos técnicos.
 */
export function AlertaErrorAuth({ mensaje }: { mensaje?: string }) {
  if (!mensaje) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="alerta-error-auth"
      className="flex items-start gap-2.5 rounded-2xl border border-[#FF6D6D]/28 bg-[#FF6D6D]/14 px-3.5 py-3 text-sm text-[#FF6D6D]"
    >
      <AlertCircle
        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FF6D6D]"
        aria-hidden={true}
      />
      <span>{mensaje}</span>
    </div>
  );
}

export interface CampoContrasenaProps {
  id: string;
  errorId: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  value: string;
  mostrar: boolean;
  error?: string;
  extraDescribedBy?: string;
  onChange: (valor: string) => void;
  onToggleMostrar: () => void;
  children?: React.ReactNode;
}

/**
 * Campo de contraseña con toggle táctil accesible (44x44px) y estado de error individual.
 */
export function CampoContrasena({
  id,
  errorId,
  label,
  autoComplete,
  placeholder,
  value,
  mostrar,
  error,
  extraDescribedBy,
  onChange,
  onToggleMostrar,
  children
}: CampoContrasenaProps) {
  const describedByParts = [
    error ? errorId : undefined,
    extraDescribedBy
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={mostrar ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            describedByParts.length > 0 ? describedByParts.join(" ") : undefined
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-13"
          required
        />
        <button
          type="button"
          onClick={onToggleMostrar}
          aria-controls={id}
          aria-label={mostrar ? "Ocultar clave" : "Mostrar clave"}
          aria-pressed={mostrar}
          className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mostrar ? (
            <EyeOff className="h-[18px] w-[18px]" aria-hidden={true} />
          ) : (
            <Eye className="h-[18px] w-[18px]" aria-hidden={true} />
          )}
        </button>
      </div>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-[#FF6D6D]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
