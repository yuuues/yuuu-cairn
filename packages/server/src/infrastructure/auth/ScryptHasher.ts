import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasher } from "@kw/core";

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

/** Hasher con scrypt nativo de Node. Formato: "scrypt$<saltHex>$<hashHex>". */
export class ScryptHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = (await scryptAsync(plain, salt, KEYLEN)) as Buffer;
    return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const salt = Buffer.from(parts[1]!, "hex");
    const expected = Buffer.from(parts[2]!, "hex");
    if (expected.length !== KEYLEN) return false;
    const derived = (await scryptAsync(plain, salt, KEYLEN)) as Buffer;
    return timingSafeEqual(derived, expected);
  }
}
