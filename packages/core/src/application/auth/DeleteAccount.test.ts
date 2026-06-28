import { describe, it, expect } from "vitest";
import { DeleteAccount } from "./DeleteAccount.js";
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
  return { users, userId: saved.id, uc: new DeleteAccount(users, hasher) };
}

describe("DeleteAccount", () => {
  it("borra la cuenta si el password es correcto", async () => {
    const { users, userId, uc } = await build();
    await uc.execute({ userId, password: "secret" });
    expect(await users.findById(userId)).toBeNull();
  });

  it("rechaza si el password es incorrecto", async () => {
    const { users, userId, uc } = await build();
    await expect(
      uc.execute({ userId, password: "wrong" })
    ).rejects.toMatchObject({ code: "invalid_password" });
    expect(await users.findById(userId)).not.toBeNull();
  });
});
