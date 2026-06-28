import { deflate, inflate } from "pako";

/** Capacidad práctica de un QR v40 con ECC bajo (~2.9KB binarios). Margen de seguridad. */
export const QR_MAX_BYTES = 2800;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** payload JSON -> deflate -> base64 (prefijo "C1:" marca formato). */
export function encodeForQr(payload: string): string {
  const compressed = deflate(new TextEncoder().encode(payload));
  return "C1:" + bytesToBase64(compressed);
}

export function decodeFromQr(encoded: string): string {
  if (!encoded.startsWith("C1:")) throw new Error("Formato QR no reconocido");
  const bytes = base64ToBytes(encoded.slice(3));
  return new TextDecoder().decode(inflate(bytes));
}

export function fitsInQr(encoded: string): boolean {
  return encoded.length <= QR_MAX_BYTES;
}
