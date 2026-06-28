import { describe, it, expect } from "vitest";
import { ConfirmEmail } from "./ConfirmEmail.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakeTokenService } from "../../testing/FakeTokenService.js";

async function build() {
  const users = new InMemoryUserRepository();
  const tokens = new FakeTokenService();
  const saved = await users.save({
    id: 0,
    email: "alice@example.com",
    username: "alice",
    passwordHash: "x",
    confirmed: false,
  });
  const confirm = new ConfirmEmail(users, tokens);
  return { users, tokens, confirm, userId: saved.id };
}

describe("ConfirmEmail", () => {
  it("confirma la cuenta con un token válido", async () => {
    const { users, tokens, confirm, userId } = await build();
    const token = tokens.sign("confirm", { confirm: userId });
    await confirm.execute({ token });
    const u = await users.findById(userId);
    expect(u!.confirmed).toBe(true);
  });

  it("rechaza un token inválido", async () => {
    const { confirm } = await build();
    await expect(confirm.execute({ token: "garbage" })).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("rechaza un token de otro propósito", async () => {
    const { tokens, confirm, userId } = await build();
    const wrong = tokens.sign("reset", { reset: userId });
    await expect(confirm.execute({ token: wrong })).rejects.toMatchObject({
      code: "invalid_token",
    });
  });
});
