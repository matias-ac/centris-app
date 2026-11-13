import type * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Campo de entrada Dark Bento con radio 12px, altura mínima 44px y fuente mínima de 16px.
 */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex min-h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#FF6D6D]",
        className
      )}
      {...props}
    />
  );
}
