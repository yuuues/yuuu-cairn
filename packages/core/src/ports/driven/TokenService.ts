export type TokenPurpose = "confirm" | "reset" | "changeEmail";

export interface TokenService {
  /** Firma un payload para un propósito concreto. */
  sign(purpose: TokenPurpose, payload: Record<string, unknown>): string;
  /**
   * Verifica un token. Devuelve el payload si es válido y no ha caducado,
   * o `null` si la firma es inválida, el propósito no coincide o expiró.
   * `maxAgeSeconds` undefined = sin caducidad.
   */
  verify(
    purpose: TokenPurpose,
    token: string,
    maxAgeSeconds?: number
  ): Record<string, unknown> | null;
}
