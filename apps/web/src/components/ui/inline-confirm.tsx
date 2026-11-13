"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonVariant } from "./button";

export function manejarTeclaInlineConfirm(
  key: string,
  pendiente: boolean,
  onCancel: () => void
): void {
  if (key === "Escape" && !pendiente) {
    onCancel();
  }
}

export async function ejecutarConfirmacionInline(
  onConfirm: () => void | Promise<void>
): Promise<boolean> {
  await onConfirm();
  return true;
}

export interface InlineConfirmProps {
  triggerLabel: string;
  confirmMessage: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  triggerVariant?: ButtonVariant;
  confirmVariant?: "destructive" | "primary" | "secondary";
  pending?: boolean;
  disabled?: boolean;
  defaultOpen?: boolean;
  testIdPrefix?: string;
  className?: string;
}

/**
 * Confirmación en línea accesible que reemplaza los diálogos nativos confirm()/alert().
 */
export function InlineConfirm({
  triggerLabel,
  confirmMessage,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  triggerVariant = "destructive",
  confirmVariant = "destructive",
  pending = false,
  disabled = false,
  defaultOpen = false,
  testIdPrefix,
  className
}: InlineConfirmProps) {
  const [confirmando, setConfirmando] = useState(defaultOpen);
  const [ejecutando, setEjecutando] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const bloqueado = pending || ejecutando;

  useEffect(() => {
    if (confirmando && !defaultOpen) {
      cancelRef.current?.focus();
    }
  }, [confirmando, defaultOpen]);

  function cancelar() {
    if (bloqueado) {
      return;
    }
    setConfirmando(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  async function confirmar() {
    if (bloqueado) {
      return;
    }
    setEjecutando(true);
    try {
      await ejecutarConfirmacionInline(onConfirm);
      setConfirmando(false);
    } finally {
      setEjecutando(false);
    }
  }

  if (!confirmando) {
    return (
      <Button
        ref={triggerRef}
        type="button"
        variant={triggerVariant}
        disabled={disabled || bloqueado}
        data-testid={testIdPrefix ? `${testIdPrefix}-trigger` : undefined}
        className={className}
        onClick={() => setConfirmando(true)}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={confirmMessage}
      data-testid={testIdPrefix ? `${testIdPrefix}-panel` : undefined}
      onKeyDown={(e) => manejarTeclaInlineConfirm(e.key, bloqueado, cancelar)}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-secondary px-3 py-2",
        className
      )}
    >
      <span className="text-xs font-medium text-foreground">
        {confirmMessage}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={confirmVariant}
          disabled={bloqueado}
          data-testid={testIdPrefix ? `${testIdPrefix}-confirm` : undefined}
          onClick={confirmar}
        >
          {bloqueado ? "Procesando..." : confirmLabel}
        </Button>
        <Button
          ref={cancelRef}
          type="button"
          variant="secondary"
          disabled={bloqueado}
          data-testid={testIdPrefix ? `${testIdPrefix}-cancel` : undefined}
          onClick={cancelar}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
