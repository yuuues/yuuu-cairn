import { describe, it, expect } from "vitest";
import { ResetPassword } from "./ResetPassword.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../testing/FakePasswordHasher.js";
import { FakeTokenService } from "../../testing/FakeTokenService.js";

async function build() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const saved = await users.save({
    id: 0,
    email: "alice@example.com",
    username: "alice",
    passwordHash: await hasher.hash("old"),
    confirmed: true,
  });
  return { users, hasher, tokens, userId: saved.id, uc: new ResetPassword(users, hasher, tokens) };
}

describe("ResetPassword", () => {
  it("actualiza el password con un token válido", async () => {
    const { users, tokens, userId, uc } = await build();
    const token = tokens.sign("reset", { reset: userId });
    await uc.execute({ token, password: "newpass1" });
    const u = await users.findById(userId);
    expect(u!.passwordHash).toBe("hash:newpass1");
  });

  it("rechaza un token inválido", async () => {
    const { uc } = await build();
    await expect(
      uc.execute({ token: "garbage", password: "newpass1" })
    ).rejects.toMatchObject({ code: "invalid_token" });
  });
});
