import { describe, it, expect } from "vitest";
import { ResendConfirmation } from "./ResendConfirmation.js";
import { InMemoryUserRepository } from "../../testing/InMemoryUserRepository.js";
import { FakeMailer } from "../../testing/FakeMailer.js";
import { FakeTokenService } from "../../testing/FakeTokenService.js";

async function build() {
  const users = new InMemoryUserRepository();
  const mailer = new FakeMailer();
  const tokens = new FakeTokenService();
  await users.save({
    id: 0,
    email: "alice@example.com",
    username: "alice",
    passwordHash: "x",
    confirmed: false,
  });
  return { users, mailer, tokens, uc: new ResendConfirmation(users, mailer, tokens) };
}

describe("ResendConfirmation", () => {
  it("reenvía si el email existe", async () => {
    const { uc, mailer } = await build();
    const result = await uc.execute({ email: "Alice@Example.com" });
    expect(result).toEqual({ sent: true });
    expect(mailer.sent).toHaveLength(1);
  });
  it("no envía si el email no existe", async () => {
    const { uc, mailer } = await build();
    const result = await uc.execute({ email: "nobody@example.com" });
    expect(result).toEqual({ sent: false });
    expect(mailer.sent).toHaveLength(0);
  });
});
