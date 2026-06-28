import { createHmac, timingSafeEqual } from "node:crypto";
import type { TokenService, TokenPurpose } from "@kw/core";

interface TokenBody {
  purpose: TokenPurpose;
  payload: Record<string, unknown>;
  ts: number; // epoch ms de emisión
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export class SignedTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly now: () => number = () => Date.now()
  ) {}

  private hmac(data: string): Buffer {
    return createHmac("sha256", this.secret).update(data).digest();
  }

  sign(purpose: TokenPurpose, payload: Record<string, unknown>): string {
    const body: TokenBody = { purpose, payload, ts: this.now() };
    const data = b64url(Buffer.from(JSON.stringify(body), "utf-8"));
    const sig = b64url(this.hmac(data));
    return `${data}.${sig}`;
  }

  verify(
    purpose: TokenPurpose,
    token: string,
    maxAgeSeconds?: number
  ): Record<string, unknown> | null {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expected = b64url(this.hmac(data));
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let body: TokenBody;
    try {
      body = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as TokenBody;
    } catch {
      return null;
    }
    if (body.purpose !== purpose) return null;
    if (maxAgeSeconds !== undefined) {
      const ageMs = this.now() - body.ts;
      if (ageMs > maxAgeSeconds * 1000) return null;
    }
    return body.payload;
  }
}
