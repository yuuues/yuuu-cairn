import { describe, it, expect } from "vitest";
import { ScryptHasher } from "./ScryptHasher.js";

describe("ScryptHasher", () => {
  const hasher = new ScryptHasher();

  it("hash y verify de la misma contraseña casan", async () => {
    const hash = await hasher.hash("password1");
    expect(hash).not.toBe("password1");
    expect(await hasher.verify("password1", hash)).toBe(true);
  });

  it("verify falla con contraseña incorrecta", async () => {
    const hash = await hasher.hash("password1");
    expect(await hasher.verify("wrong", hash)).toBe(false);
  });

  it("dos hashes de la misma contraseña difieren (salt aleatorio)", async () => {
    const a = await hasher.hash("password1");
    const b = await hasher.hash("password1");
    expect(a).not.toBe(b);
  });

  it("verify devuelve false ante un hash con formato inválido", async () => {
    expect(await hasher.verify("password1", "no-tiene-formato")).toBe(false);
  });
});
