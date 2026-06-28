import { describe, it, expect } from "vitest";
import { SignedTokenService } from "./SignedTokenService.js";

describe("SignedTokenService", () => {
  const svc = new SignedTokenService("test-secret");

  it("firma y verifica un payload del mismo propósito", () => {
    const token = svc.sign("confirm", { confirm: 7 });
    const payload = svc.verify("confirm", token);
    expect(payload).toEqual({ confirm: 7 });
  });

  it("rechaza un propósito distinto", () => {
    const token = svc.sign("confirm", { confirm: 7 });
    expect(svc.verify("reset", token)).toBeNull();
  });

  it("rechaza un token manipulado", () => {
    const token = svc.sign("confirm", { confirm: 7 });
    expect(svc.verify("confirm", token + "x")).toBeNull();
  });

  it("rechaza si lo firmó otro secreto", () => {
    const other = new SignedTokenService("otro-secreto");
    const token = other.sign("confirm", { confirm: 7 });
    expect(svc.verify("confirm", token)).toBeNull();
  });

  it("rechaza un token caducado (maxAge=0)", () => {
    const token = svc.sign("confirm", { confirm: 7 });
    // maxAge 0 → cualquier token con edad >= 0 cuenta como caducado salvo el mismo instante;
    // forzamos caducidad con -1 imposible, así que probamos con un token "viejo" simulado:
    const old = new SignedTokenService("test-secret", () => Date.now() - 10_000);
    const oldToken = old.sign("confirm", { confirm: 7 });
    expect(svc.verify("confirm", oldToken, 5)).toBeNull(); // 10s > 5s maxAge
  });

  it("acepta dentro del maxAge", () => {
    const token = svc.sign("confirm", { confirm: 7 });
    expect(svc.verify("confirm", token, 3600)).toEqual({ confirm: 7 });
  });
});
