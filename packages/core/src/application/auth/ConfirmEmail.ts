import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { TokenService } from "../../ports/driven/TokenService.js";
import { AuthError } from "./errors.js";

/** Caducidad del token de confirmación: 1 hora (paridad: max_age=3600). */
const CONFIRM_MAX_AGE_SECONDS = 3600;

export interface ConfirmEmailCommand {
  token: string;
}

export class ConfirmEmail {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService
  ) {}

  async execute(cmd: ConfirmEmailCommand): Promise<void> {
    const payload = this.tokens.verify("confirm", cmd.token, CONFIRM_MAX_AGE_SECONDS);
    const id = payload?.confirm;
    if (typeof id !== "number") {
      throw new AuthError(
        "invalid_token",
        "The confirmation link is invalid or has expired."
      );
    }
    const user = await this.users.findById(id);
    if (!user) {
      throw new AuthError(
        "invalid_token",
        "The confirmation link is invalid or has expired."
      );
    }
    await this.users.save({ ...user, confirmed: true });
  }
}
