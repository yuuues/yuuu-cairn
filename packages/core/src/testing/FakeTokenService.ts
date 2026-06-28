import type {
  TokenService,
  TokenPurpose,
} from "../ports/driven/TokenService.js";

/** Token de pega: JSON base64 con purpose y payload. Sin caducidad real. */
export class FakeTokenService implements TokenService {
  sign(purpose: TokenPurpose, payload: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify({ purpose, payload })).toString("base64");
  }
  verify(
    purpose: TokenPurpose,
    token: string
  ): Record<string, unknown> | null {
    try {
      const decoded = JSON.parse(
        Buffer.from(token, "base64").toString("utf-8")
      ) as { purpose: TokenPurpose; payload: Record<string, unknown> };
      if (decoded.purpose !== purpose) return null;
      return decoded.payload;
    } catch {
      return null;
    }
  }
}
