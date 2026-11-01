import { z } from "zod";

export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const NOMBRES_DIAS_SEMANA: Record<DiaSemana, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo"
} as const;

export const HORA_LOCAL_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const HoraLocalSchema = z
  .string()
  .trim()
  .regex(
    HORA_LOCAL_REGEX,
    "Formato de hora local inválido (debe ser HH:mm de 00:00 a 23:59)"
  );

export const HorarioSchema = z.object({
  id: z.string().uuid(),
  boxId: z.string().uuid(),
  tipoClaseId: z.string().uuid(),
  coachAfiliacionId: z.string().uuid(),
  diaSemana: z.number().int().min(1).max(7),
  horaInicio: HoraLocalSchema,
  duracionMinutos: z.number().int().min(1, "La duración mínima es de 1 minuto"),
  cuposDefault: z
    .number()
    .int()
    .min(1, "Los cupos por defecto deben ser al menos 1"),
  activo: z.boolean(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable().optional(),
  tipoClaseNombre: z.string().optional(),
  coachNombre: z.string().optional()
});

export type Horario = z.infer<typeof HorarioSchema>;

export const CrearHorarioSchema = z.object({
  tipoClaseId: z.string().uuid("El tipo de clase debe ser un UUID válido"),
  coachAfiliacionId: z
    .string()
    .uuid("La afiliación del coach debe ser un UUID válido"),
  diaSemana: z.coerce
    .number()
    .int("El día de la semana debe ser un entero")
    .min(1, "El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)")
    .max(7, "El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)"),
  horaInicio: HoraLocalSchema,
  duracionMinutos: z.coerce
    .number()
    .int("La duración debe ser un número entero de minutos")
    .min(1, "La duración mínima es de 1 minuto"),
  cuposDefault: z.coerce
    .number()
    .int("Los cupos por defecto deben ser un número entero")
    .min(1, "Los cupos por defecto deben ser al menos 1")
});

export type CrearHorario = z.infer<typeof CrearHorarioSchema>;

export const ActualizarHorarioSchema = z.object({
  tipoClaseId: z
    .string()
    .uuid("El tipo de clase debe ser un UUID válido")
    .optional(),
  coachAfiliacionId: z
    .string()
    .uuid("La afiliación del coach debe ser un UUID válido")
    .optional(),
  diaSemana: z.coerce
    .number()
    .int("El día de la semana debe ser un entero")
    .min(1, "El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)")
    .max(7, "El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)")
    .optional(),
  horaInicio: HoraLocalSchema.optional(),
  duracionMinutos: z.coerce
    .number()
    .int("La duración debe ser un número entero de minutos")
    .min(1, "La duración mínima es de 1 minuto")
    .optional(),
  cuposDefault: z.coerce
    .number()
    .int("Los cupos por defecto deben ser un número entero")
    .min(1, "Los cupos por defecto deben ser al menos 1")
    .optional(),
  activo: z.boolean().optional()
});

export type ActualizarHorario = z.infer<typeof ActualizarHorarioSchema>;
