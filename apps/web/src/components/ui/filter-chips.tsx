"use client";

import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  testId?: string;
}

export interface FilterChipsProps<T extends string> {
  options: ReadonlyArray<FilterChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Barra táctil de cápsulas filtrantes con wrap seguro, estado aria-pressed y contraste Black-on-Volt.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className
}: FilterChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {options.map((option) => {
        const activo = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={activo}
            data-testid={option.testId}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activo
                ? "border-transparent bg-primary text-primary-foreground font-semibold"
                : "border-border bg-secondary text-muted-foreground font-medium hover:border-[#3A3C42] hover:text-foreground"
            )}
          >
            <span>{option.label}</span>
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  activo
                    ? "bg-black/15 text-black"
                    : "bg-background text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
