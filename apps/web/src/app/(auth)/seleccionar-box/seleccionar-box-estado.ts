const CIUDADES_TIMEZONE: Record<string, string> = {
  Buenos_Aires: "Buenos Aires",
  Cordoba: "Córdoba",
  Tucuman: "Tucumán",
  Rio_Gallegos: "Río Gallegos",
  Sao_Paulo: "São Paulo",
  Mexico_City: "Ciudad de México",
  Bogota: "Bogotá",
  Asuncion: "Asunción"
};

export type ResultadoSeleccionBox =
  | { ok: true }
  | { ok: false; mensaje: string };

/**
 * Convierte una zona horaria IANA (ej. "America/Argentina/Buenos_Aires") en
 * una etiqueta humana corta ("Buenos Aires") sin exponer rutas técnicas.
 */
export function formatearUbicacionTimezone(timezone: string): string {
  const limpia = timezone.trim();
  if (!limpia) {
    return "Zona horaria configurada";
  }

  const segmento = limpia.split("/").filter(Boolean).pop();
  if (!segmento) {
    return "Zona horaria configurada";
  }

  return CIUDADES_TIMEZONE[segmento] ?? segmento.replaceAll("_", " ");
}

/**
 * Ejecuta la selección de Box activo y traduce cualquier falla a un mensaje
 * humano sin exponer detalles técnicos ni códigos HTTP.
 */
export async function ejecutarSeleccionBox(
  boxId: string,
  accionSeleccionar: (id: string) => Promise<void>
): Promise<ResultadoSeleccionBox> {
  try {
    await accionSeleccionar(boxId);
    return { ok: true };
  } catch {
    return {
      ok: false,
      mensaje:
        "No pudimos abrir este Box en este momento. Intentá nuevamente."
    };
  }
}
