import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashearContrasena(
  password: string,
  saltPersonalizado?: string
): Promise<string> {
  const salt = saltPersonalizado ?? randomBytes(16).toString("hex");
  const derivado = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivado.toString("hex")}`;
}

export async function verificarContrasena(
  password: string,
  passwordHash: string | null
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }
  const partes = passwordHash.split(":");
  if (partes.length !== 3 || partes[0] !== "scrypt") {
    return false;
  }
  const [, salt, hashHex] = partes;
  if (!salt || !hashHex) {
    return false;
  }
  const esperado = Buffer.from(hashHex, "hex");
  const derivado = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  if (esperado.length !== derivado.length) {
    return false;
  }
  return timingSafeEqual(esperado, derivado);
}
