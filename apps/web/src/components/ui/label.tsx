import type * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/**
 * Etiqueta de formulario en Sentence case.
 */
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-snug text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}
