import { describe, it, expect } from "vitest";
import { encodeForQr, decodeFromQr, QR_MAX_BYTES } from "./qr.js";

describe("qr codec", () => {
  it("round-trip encode -> decode", () => {
    const payload = JSON.stringify({
      kind: "cairn-character",
      n: 1,
      text: "hola".repeat(20),
    });
    const encoded = encodeForQr(payload);
    expect(decodeFromQr(encoded)).toBe(payload);
  });

  it("encoded más corto que el original para textos repetitivos", () => {
    const payload = "a".repeat(2000);
    expect(encodeForQr(payload).length).toBeLessThan(2000);
  });

  it("QR_MAX_BYTES es un límite positivo", () => {
    expect(QR_MAX_BYTES).toBeGreaterThan(0);
  });
});
