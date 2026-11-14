"use client";

import type { ReactNode, RefObject } from "react";
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

export interface UseInlineConfirmOptions {
  defaultOpen?: boolean;
  pending?: boolean;
  onConfirm?: () => void | Promise<void>;
}

/**
 * Estado, teclado (Escape) y gestión de foco compartidos para confirmaciones en línea.
 */
export function useInlineConfirm({
  defaultOpen = false,
  pending = false,
  onConfirm
}: UseInlineConfirmOptions = {}) {
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

  function abrir() {
    if (bloqueado) {
      return;
    }
    setConfirmando(true);
  }

  function cerrar(opciones?: { restaurarFoco?: boolean }) {
    setConfirmando(false);
    if (opciones?.restaurarFoco !== false) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }

  function cancelar() {
    if (bloqueado) {
      return;
    }
    cerrar({ restaurarFoco: true });
  }

  async function confirmar() {
    if (bloqueado || !onConfirm) {
      return;
    }
    setEjecutando(true);
    try {
      await onConfirm();
      setConfirmando(false);
    } finally {
      setEjecutando(false);
    }
  }

  return {
    confirmando,
    bloqueado,
    triggerRef,
    cancelRef,
    abrir,
    cerrar,
    cancelar,
    confirmar
  };
}

export interface InlineConfirmPanelProps {
  ariaLabel: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "destructive" | "primary" | "secondary";
  bloqueado: boolean;
  cancelRef: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
  testIdPrefix?: string;
  className?: string;
  messageClassName?: string;
}

/**
 * Franja/panel reutilizable de confirmación en línea con foco inicial seguro y cierre por Escape.
 */
export function InlineConfirmPanel({
  ariaLabel,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "destructive",
  bloqueado,
  cancelRef,
  onConfirm,
  onCancel,
  testIdPrefix,
  className,
  messageClassName
}: InlineConfirmPanelProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid={testIdPrefix ? `${testIdPrefix}-panel` : undefined}
      onKeyDown={(e) => manejarTeclaInlineConfirm(e.key, bloqueado, onCancel)}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border bg-secondary px-3.5 py-2.5",
        className
      )}
    >
      <div className={cn("text-xs font-medium text-foreground", messageClassName)}>
        {message}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={confirmVariant}
          disabled={bloqueado}
          data-testid={testIdPrefix ? `${testIdPrefix}-confirm` : undefined}
          onClick={onConfirm}
        >
          {bloqueado ? "Procesando..." : confirmLabel}
        </Button>
        <Button
          ref={cancelRef}
          type="button"
          variant="secondary"
          disabled={bloqueado}
          data-testid={testIdPrefix ? `${testIdPrefix}-cancel` : undefined}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
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
  const {
    confirmando,
    bloqueado,
    triggerRef,
    cancelRef,
    abrir,
    cancelar,
    confirmar
  } = useInlineConfirm({
    defaultOpen,
    pending,
    onConfirm
  });

  if (!confirmando) {
    return (
      <Button
        ref={triggerRef}
        type="button"
        variant={triggerVariant}
        disabled={disabled || bloqueado}
        data-testid={testIdPrefix ? `${testIdPrefix}-trigger` : undefined}
        className={className}
        onClick={abrir}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <InlineConfirmPanel
      ariaLabel={confirmMessage}
      message={confirmMessage}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmVariant={confirmVariant}
      bloqueado={bloqueado}
      cancelRef={cancelRef}
      onConfirm={() => {
        void confirmar();
      }}
      onCancel={cancelar}
      testIdPrefix={testIdPrefix}
      className={className}
    />
  );
}
