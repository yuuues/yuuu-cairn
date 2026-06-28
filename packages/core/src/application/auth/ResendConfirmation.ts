import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { Mailer } from "../../ports/driven/Mailer.js";
import type { TokenService } from "../../ports/driven/TokenService.js";

export interface ResendConfirmationCommand {
  email: string;
}

export class ResendConfirmation {
  constructor(
    private readonly users: UserRepository,
    private readonly mailer: Mailer,
    private readonly tokens: TokenService
  ) {}

  async execute(cmd: ResendConfirmationCommand): Promise<{ sent: boolean }> {
    const user = await this.users.findByEmail(cmd.email.toLowerCase());
    if (!user) return { sent: false };

    const token = this.tokens.sign("confirm", { confirm: user.id });
    await this.mailer.send({
      to: user.email,
      subject: "Confirm Your Account",
      text: `Hi ${user.username},\n\nTo confirm your account please use this token: ${token}\n\nNote: replies to this email address are not monitored.`,
      html: `<p>Hi ${user.username},</p><p>To confirm your account please use this token: <code>${token}</code></p><p><small>Note: replies to this email address are not monitored.</small></p>`,
    });
    return { sent: true };
  }
}
