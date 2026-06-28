import { randomBytes } from "node:crypto";
import type { IdGenerator } from "@kw/core";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class CryptoIdGenerator implements IdGenerator {
  joinCode(): string {
    const bytes = randomBytes(8);
    return [...bytes].map((b) => ALPHABET[b! % ALPHABET.length]!).join("");
  }
}
