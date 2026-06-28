import { describe, it, expect } from "vitest";
import { ChangePassword } from "./ChangePassword.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../testing/FakePasswordHasher.js";

async function build() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const saved = await users.save({
    id: 0,
    email: "alice@example.com",
    username: "alice",
    passwordHash: await hasher.hash("oldpass"),
    confirmed: true,
  });
  return { users, userId: saved.id, uc: new ChangePassword(users, hasher) };
}

describe("ChangePassword", () => {
  it("cambia el password si el actual es correcto", async () => {
    const { users, userId, uc } = await build();
    await uc.execute({ userId, oldPassword: "oldpass", password: "newpass1" });
    const u = await users.findById(userId);
    expect(u!.passwordHash).toBe("hash:newpass1");
  });

  it("rechaza si el password actual es incorrecto", async () => {
    const { userId, uc } = await build();
    await expect(
      uc.execute({ userId, oldPassword: "wrong", password: "newpass1" })
    ).rejects.toMatchObject({ code: "invalid_password" });
  });
});
