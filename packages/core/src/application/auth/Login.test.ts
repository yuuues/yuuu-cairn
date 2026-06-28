import { describe, it, expect } from "vitest";
import { Login } from "./Login.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../testing/FakePasswordHasher.js";

async function seed(confirmed: boolean) {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  await users.save({
    id: 0,
    email: "alice@example.com",
    username: "alice",
    passwordHash: await hasher.hash("password1"),
    confirmed,
  });
  const login = new Login(users, hasher);
  return { users, login };
}

describe("Login", () => {
  it("autentica un usuario confirmado y devuelve SessionUser", async () => {
    const { login } = await seed(true);
    const result = await login.execute({ email: "Alice@Example.com", password: "password1" });
    expect(result).toMatchObject({ username: "alice", email: "alice@example.com" });
    expect(typeof result.id).toBe("number");
  });

  it("rechaza con not_confirmed si la cuenta no está confirmada", async () => {
    const { login } = await seed(false);
    await expect(
      login.execute({ email: "alice@example.com", password: "password1" })
    ).rejects.toMatchObject({ code: "not_confirmed" });
  });

  it("rechaza con invalid_credentials si el password no casa", async () => {
    const { login } = await seed(true);
    await expect(
      login.execute({ email: "alice@example.com", password: "wrong" })
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("rechaza con invalid_credentials si el email no existe", async () => {
    const { login } = await seed(true);
    await expect(
      login.execute({ email: "nobody@example.com", password: "password1" })
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });
});
