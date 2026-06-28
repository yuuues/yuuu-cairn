import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { PasswordHasher } from "../../ports/driven/PasswordHasher.js";
import type { TokenService } from "../../ports/driven/TokenService.js";
import { AuthError } from "./errors.js";

/** Caducidad del token de reset: 24 h (el origen no fija max_age; valor de seguridad razonable). */
const RESET_MAX_AGE_SECONDS = 60 * 60 * 24;

export interface ResetPasswordCommand {
  token: string;
  password: string;
}

export class ResetPassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async execute(cmd: ResetPasswordCommand): Promise<void> {
    const payload = this.tokens.verify("reset", cmd.token, RESET_MAX_AGE_SECONDS);
    const id = payload?.reset;
    if (typeof id !== "number") {
      throw new AuthError("invalid_token", "The reset link is invalid or has expired.");
    }
    const user = await this.users.findById(id);
    if (!user) {
      throw new AuthError("invalid_token", "The reset link is invalid or has expired.");
    }
    const passwordHash = await this.hasher.hash(cmd.password);
    await this.users.save({ ...user, passwordHash });
  }
}
