import { z } from "zod";

/**
 * Estado de salud e integridad de aislamiento RLS en PostgreSQL.
 */
export const EstadoSaludSchema = z.object({
  estado: z.literal("ok"),
  baseDeDatos: z.literal("conectada"),
  rolConexion: z.string().min(1),
  rlsActivo: z.boolean(),
  bypassRls: z.boolean(),
  afiliacionesVisiblesEnContexto: z.number().int().min(0)
});

export type EstadoSalud = z.infer<typeof EstadoSaludSchema>;
