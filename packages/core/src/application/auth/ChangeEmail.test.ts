import { describe, it, expect } from "vitest";
import { ChangeEmail } from "./ChangeEmail.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../testing/FakePasswordHasher.js";

async function build() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const saved = await users.save({
    id: 0,
    email: "alice@example.com",
    username: "alice",
    passwordHash: await hasher.hash("secret"),
    confirmed: true,
  });
  return { users, userId: saved.id, uc: new ChangeEmail(users, hasher) };
}

describe("ChangeEmail", () => {
  it("cambia el email si el password es correcto", async () => {
    const { users, userId, uc } = await build();
    await uc.execute({ userId, password: "secret", email: "New@Example.com" });
    const u = await users.findById(userId);
    expect(u!.email).toBe("new@example.com");
  });

  it("rechaza si el password es incorrecto", async () => {
    const { userId, uc } = await build();
    await expect(
      uc.execute({ userId, password: "wrong", email: "new@example.com" })
    ).rejects.toMatchObject({ code: "invalid_password" });
  });

  it("rechaza si el nuevo email ya está en uso", async () => {
    const { users, userId, uc } = await build();
    await users.save({
      id: 0,
      email: "taken@example.com",
      username: "bob",
      passwordHash: "x",
      confirmed: true,
    });
    await expect(
      uc.execute({ userId, password: "secret", email: "taken@example.com" })
    ).rejects.toMatchObject({ code: "email_exists" });
  });
});
