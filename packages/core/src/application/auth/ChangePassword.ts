import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { PasswordHasher } from "../../ports/driven/PasswordHasher.js";
import { AuthError } from "./errors.js";

export interface ChangePasswordCommand {
  userId: number;
  oldPassword: string;
  password: string;
}

export class ChangePassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(cmd: ChangePasswordCommand): Promise<void> {
    const user = await this.users.findById(cmd.userId);
    if (!user) {
      throw new AuthError("invalid_password", "Invalid password.");
    }
    const ok = await this.hasher.verify(cmd.oldPassword, user.passwordHash);
    if (!ok) {
      throw new AuthError("invalid_password", "Invalid password.");
    }
    const passwordHash = await this.hasher.hash(cmd.password);
    await this.users.save({ ...user, passwordHash });
  }
}
