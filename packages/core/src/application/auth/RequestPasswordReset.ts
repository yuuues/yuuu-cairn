import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { Mailer } from "../../ports/driven/Mailer.js";
import type { TokenService } from "../../ports/driven/TokenService.js";

export interface RequestPasswordResetCommand {
  email: string;
}

export class RequestPasswordReset {
  constructor(
    private readonly users: UserRepository,
    private readonly mailer: Mailer,
    private readonly tokens: TokenService
  ) {}

  async execute(cmd: RequestPasswordResetCommand): Promise<{ sent: boolean }> {
    const user = await this.users.findByEmail(cmd.email.toLowerCase());
    if (!user) return { sent: false };

    const token = this.tokens.sign("reset", { reset: user.id });
    await this.mailer.send({
      to: user.email,
      subject: "Reset Your Password",
      text: `Hi ${user.username},\n\nTo reset your password use this token: ${token}\n\nIf you have not requested a password reset simply ignore this message.\n\nNote: replies to this email address are not monitored.`,
      html: `<p>Hi ${user.username},</p><p>To reset your password use this token: <code>${token}</code></p><p>If you have not requested a password reset simply ignore this message.</p><p><small>Note: replies to this email address are not monitored.</small></p>`,
    });
    return { sent: true };
  }
}
