import type * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "default"
  | "secondary"
  | "destructive"
  | "ghost"
  | "iconCircle";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "px-[18px] py-2.5 bg-primary text-primary-foreground hover:bg-volt-hover active:bg-volt-hover border border-transparent",
  default:
    "px-[18px] py-2.5 bg-primary text-primary-foreground hover:bg-volt-hover active:bg-volt-hover border border-transparent",
  secondary:
    "px-[18px] py-2.5 bg-secondary text-secondary-foreground border border-border hover:bg-[#222328] hover:border-[#3A3C42]",
  destructive:
    "px-[18px] py-2.5 bg-[#FF6D6D]/14 text-[#FF6D6D] border border-[#FF6D6D]/28 hover:bg-[#FF6D6D]/22",
  ghost:
    "px-4 py-2.5 bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent",
  iconCircle:
    "h-11 w-11 min-w-11 shrink-0 p-0 bg-secondary text-foreground border border-border hover:bg-[#222328] hover:border-[#3A3C42]"
};

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
}

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string
): string {
  return cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    className
  );
}

/**
 * Botón táctil Dark Bento Cockpit con altura mínima de 44px y forma cápsula.
 */
export function Button({
  className,
  variant = "primary",
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}
