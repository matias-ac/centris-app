import { HttpStatus } from "@nestjs/common";
import { ERROR_CODES } from "@centris/shared";
import type { ZodTypeAny, z } from "zod";
import { DomainException } from "../errors/domain.exception.js";

export function validarConZod<S extends ZodTypeAny>(
  schema: S,
  payload: unknown
): z.infer<S> {
  const resultado = schema.safeParse(payload);
  if (!resultado.success) {
    const details: Record<string, string[]> = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path.join(".") || "_root";
      details[campo] = [...(details[campo] ?? []), issue.message];
    }
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      "Los datos enviados no cumplen con el esquema requerido.",
      HttpStatus.BAD_REQUEST,
      details
    );
  }
  return resultado.data;
}
