import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { PasswordHasher } from "../../ports/driven/PasswordHasher.js";
import { AuthError } from "./errors.js";

export interface DeleteAccountCommand {
  userId: number;
  password: string;
}

export class DeleteAccount {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(cmd: DeleteAccountCommand): Promise<void> {
    const user = await this.users.findById(cmd.userId);
    if (!user) {
      throw new AuthError("invalid_password", "Invalid password. Account deletion cancelled.");
    }
    const ok = await this.hasher.verify(cmd.password, user.passwordHash);
    if (!ok) {
      throw new AuthError("invalid_password", "Invalid password. Account deletion cancelled.");
    }
    await this.users.delete(user.id);
  }
}
