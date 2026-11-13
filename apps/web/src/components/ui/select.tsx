import type * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Selector nativo estilizado Dark Bento con altura mínima 44px y fuente mínima de 16px.
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "flex min-h-11 w-full cursor-pointer rounded-xl border border-border bg-background px-3.5 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#FF6D6D]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
