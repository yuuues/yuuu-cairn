import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { PasswordHasher } from "../../ports/driven/PasswordHasher.js";
import { AuthError } from "./errors.js";

export interface ChangeEmailCommand {
  userId: number;
  password: string;
  email: string;
}

export class ChangeEmail {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(cmd: ChangeEmailCommand): Promise<void> {
    const user = await this.users.findById(cmd.userId);
    if (!user) {
      throw new AuthError("invalid_password", "Invalid password.");
    }
    const ok = await this.hasher.verify(cmd.password, user.passwordHash);
    if (!ok) {
      throw new AuthError("invalid_password", "Invalid password.");
    }
    const email = cmd.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new AuthError("email_exists", "Email address already exists");
    }
    await this.users.save({ ...user, email });
  }
}
