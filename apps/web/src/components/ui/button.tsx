import type * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "secondary" | "destructive" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-volt-500 border border-transparent",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-muted border border-border",
  destructive:
    "bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-[0.9375rem] font-semibold leading-none tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
