"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { BENTO_DESCRIPTION_CLASSES, BENTO_TITLE_CLASSES } from "./card";

export function manejarTeclaDrawer(key: string, onClose: () => void): void {
  if (key === "Escape") {
    onClose();
  }
}

export interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
  closeTestId?: string;
  testId?: string;
  className?: string;
}

/**
 * Panel lateral accesible (drawer derecho en desktop, sheet adaptable en móvil)
 * con cierre por Escape, click en backdrop y restauración de foco.
 */
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Cerrar panel",
  closeTestId,
  testId,
  className
}: SideDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActive =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      manejarTeclaDrawer(event.key, () => onCloseRef.current());
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end lg:items-stretch">
      <div
        aria-hidden="true"
        data-testid="drawer-backdrop"
        onClick={() => onCloseRef.current()}
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-testid={testId}
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-border bg-card text-card-foreground lg:h-full lg:max-h-none lg:max-w-lg lg:rounded-none lg:rounded-l-3xl",
          className
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className={BENTO_TITLE_CLASSES}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className={BENTO_DESCRIPTION_CLASSES}>
                {description}
              </p>
            ) : null}
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="iconCircle"
            aria-label={closeLabel}
            data-testid={closeTestId}
            onClick={() => onCloseRef.current()}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
