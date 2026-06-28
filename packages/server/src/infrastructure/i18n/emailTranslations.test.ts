import { describe, it, expect } from "vitest";
import { buildConfirmEmail, buildResetEmail, buildChangeEmailEmail } from "./emailTranslations.js";

describe("buildConfirmEmail", () => {
  it("genera el email de confirmación en inglés", () => {
    const msg = buildConfirmEmail("en", "alice", "TOKEN123");
    expect(msg.subject).toBe("Confirm Your Account");
    expect(msg.text).toContain("alice");
    expect(msg.text).toContain("TOKEN123");
    expect(msg.html).toContain("<code>TOKEN123</code>");
  });

  it("genera el email de confirmación en español", () => {
    const msg = buildConfirmEmail("es", "alice", "TOKEN123");
    expect(msg.subject).toBe("Confirma tu cuenta");
    expect(msg.text).toContain("Hola alice");
  });

  it("cae a inglés para locale desconocido", () => {
    const msg = buildConfirmEmail("xx" as "en", "bob", "TK");
    expect(msg.subject).toBe("Confirm Your Account");
  });
});

describe("buildResetEmail", () => {
  it("genera el email de reset en alemán", () => {
    const msg = buildResetEmail("de", "hans", "RESET99");
    expect(msg.subject).toBe("Passwort zurücksetzen");
    expect(msg.text).toContain("hans");
    expect(msg.text).toContain("RESET99");
  });
});

describe("buildChangeEmailEmail", () => {
  it("genera el email de cambio de email en pt_BR", () => {
    const msg = buildChangeEmailEmail("pt_BR", "maria", "CHANGE42");
    expect(msg.subject).toBe("Confirme seu novo endereço de e-mail");
    expect(msg.html).toContain("<code>CHANGE42</code>");
  });
});
