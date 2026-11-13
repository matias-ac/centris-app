import type * as React from "react";
import { cn } from "@/lib/utils";
import { CONTROL_BASE_CLASSES } from "./input";

export type SelectProps = React.ComponentProps<"select">;

/**
 * Selector nativo estilizado Dark Bento con altura mínima 44px y fuente mínima de 16px.
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(CONTROL_BASE_CLASSES, "cursor-pointer", className)}
      {...props}
    >
      {children}
    </select>
  );
}
