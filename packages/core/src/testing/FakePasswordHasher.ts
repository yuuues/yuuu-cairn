import type { PasswordHasher } from "../ports/driven/PasswordHasher.js";

/** Hash determinista de pega: "hash:" + plain. Solo para tests. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hash:${plain}`;
  }
}
