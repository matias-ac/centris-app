import type * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "mint"
  | "amber"
  | "coral"
  | "zinc"
  | "volt"
  /** @deprecated Usar "mint" en nuevas pantallas v2 */
  | "emerald"
  /** @deprecated Usar "coral" en nuevas pantallas v2 */
  | "rose";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  mint: "bg-[#18FFC8]/14 text-[#18FFC8] border-[#18FFC8]/28",
  emerald: "bg-[#18FFC8]/14 text-[#18FFC8] border-[#18FFC8]/28",
  amber: "bg-[#FBBF24]/14 text-[#FBBF24] border-[#FBBF24]/28",
  coral: "bg-[#FF6D6D]/14 text-[#FF6D6D] border-[#FF6D6D]/28",
  rose: "bg-[#FF6D6D]/14 text-[#FF6D6D] border-[#FF6D6D]/28",
  zinc: "bg-[#A1A1AA]/14 text-[#A1A1AA] border-[#A1A1AA]/28",
  volt: "bg-primary text-primary-foreground border-transparent font-semibold"
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * Chip semántico en Sentence case para estados del dominio Centris.
 */
export function Badge({
  className,
  variant = "mint",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none tracking-[0.02em]",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
