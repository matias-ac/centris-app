import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatearMoneda(monto: number, moneda: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0
    }).format(monto);
  } catch {
    return `$ ${monto.toLocaleString("es-AR")}`;
  }
}

