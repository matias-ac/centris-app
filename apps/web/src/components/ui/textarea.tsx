import type * as React from "react";
import { cn } from "@/lib/utils";
import { CONTROL_BASE_CLASSES } from "./input";

export type TextareaProps = React.ComponentProps<"textarea">;

/**
 * Área de texto Dark Bento con radio 12px y fuente mínima de 16px.
 */
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        CONTROL_BASE_CLASSES,
        "min-h-[88px] py-2.5 placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
