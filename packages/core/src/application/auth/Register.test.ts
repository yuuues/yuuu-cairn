import { describe, it, expect, beforeEach } from "vitest";
import { Register } from "./Register.js";
import { AuthError } from "./errors.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../testing/FakePasswordHasher.js";
import { FakeMailer } from "../../testing/FakeMailer.js";
import { FakeTokenService } from "../../testing/FakeTokenService.js";
import { FakeCaptcha } from "../../testing/FakeCaptcha.js";

function build(overrides: Partial<{ requireSignupCode: boolean; signupCode: string; captcha: FakeCaptcha }> = {}) {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const mailer = new FakeMailer();
  const tokens = new FakeTokenService();
  const captcha = overrides.captcha ?? new FakeCaptcha(true);
  const register = new Register(users, hasher, mailer, tokens, captcha, {
    requireSignupCode: overrides.requireSignupCode ?? false,
    signupCode: overrides.signupCode ?? "default",
  });
  return { users, hasher, mailer, tokens, captcha, register };
}

const valid = {
  email: "Alice@Example.com",
  username: "alice",
  password: "password1",
};

describe("Register", () => {
  it("crea un usuario sin confirmar y envía email de confirmación", async () => {
    const { register, users, mailer } = build();
    await register.execute(valid);
    const saved = await users.findByEmail("alice@example.com");
    expect(saved).not.toBeNull();
    expect(saved!.confirmed).toBe(false);
    expect(saved!.email).toBe("alice@example.com"); // minúsculas
    expect(saved!.passwordHash).toBe("hash:password1");
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toBe("alice@example.com");
  });

  it("rechaza usernames restringidos", async () => {
    const { register } = build();
    await expect(
      register.execute({ ...valid, username: "Admin" })
    ).rejects.toMatchObject({ code: "username_restricted" });
  });

  it("rechaza email duplicado (insensible a mayúsculas)", async () => {
    const { register } = build();
    await register.execute(valid);
    await expect(
      register.execute({ ...valid, username: "bob", email: "alice@example.com" })
    ).rejects.toMatchObject({ code: "email_exists" });
  });

  it("rechaza username duplicado", async () => {
    const { register } = build();
    await register.execute(valid);
    await expect(
      register.execute({ ...valid, email: "bob@example.com" })
    ).rejects.toMatchObject({ code: "username_exists" });
  });

  it("exige código de signup correcto cuando está activado", async () => {
    const { register } = build({ requireSignupCode: true, signupCode: "secret" });
    await expect(
      register.execute({ ...valid, signupCode: "wrong" })
    ).rejects.toMatchObject({ code: "invalid_signup_code" });
    await expect(
      register.execute({ ...valid, signupCode: "secret" })
    ).resolves.toBeUndefined();
  });

  it("falla si el captcha rechaza", async () => {
    const { register } = build({ captcha: new FakeCaptcha(false) });
    await expect(register.execute(valid)).rejects.toMatchObject({
      code: "captcha_failed",
    });
  });
});
