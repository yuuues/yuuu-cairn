import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { PasswordHasher } from "../../ports/driven/PasswordHasher.js";
import type { SessionUser } from "@kw/shared";
import { AuthError } from "./errors.js";

export interface LoginCommand {
  email: string;
  password: string;
}

export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(cmd: LoginCommand): Promise<SessionUser> {
    const email = cmd.email.toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new AuthError("invalid_credentials", "Invalid email or password.");
    }
    if (!user.confirmed) {
      throw new AuthError(
        "not_confirmed",
        "Please confirm your account before logging in."
      );
    }
    const ok = await this.hasher.verify(cmd.password, user.passwordHash);
    if (!ok) {
      throw new AuthError("invalid_credentials", "Invalid email or password.");
    }

    return { id: user.id, username: user.username, email: user.email };
  }
}
