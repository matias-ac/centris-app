import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let archivoEnvCargado = false;

/**
 * Carga por única vez el archivo `.env` de la raíz del monorepo si existe en el entorno local.
 * `process.loadEnvFile` (nativo de Node 22) no sobrescribe variables ya definidas en `process.env`.
 */
export function cargarVariablesDeEntorno(): void {
  if (archivoEnvCargado) {
    return;
  }
  archivoEnvCargado = true;

  const rutasCandidatas = [
    path.resolve(__dirname, "../../../../../.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env")
  ];

  for (const ruta of rutasCandidatas) {
    if (fs.existsSync(ruta) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(ruta);
      break;
    }
  }
}

/**
 * Obtiene el valor de una variable de entorno obligatoria o lanza un error explícito
 * para impedir que el sistema opere con secretos o credenciales por defecto.
 */
export function exigirVariableDeEntorno(nombre: string): string {
  cargarVariablesDeEntorno();
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    throw new Error(
      `Variable de entorno obligatoria no definida: ${nombre}. Configurala en el entorno o en el archivo .env.`
    );
  }
  return valor;
}

cargarVariablesDeEntorno();
