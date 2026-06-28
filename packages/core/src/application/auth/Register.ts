import type { UserRepository } from "../../ports/driven/UserRepository.js";
import type { PasswordHasher } from "../../ports/driven/PasswordHasher.js";
import type { Mailer } from "../../ports/driven/Mailer.js";
import type { TokenService } from "../../ports/driven/TokenService.js";
import type { Captcha } from "../../ports/driven/Captcha.js";
import { AuthError } from "./errors.js";

export interface RegisterConfig {
  requireSignupCode: boolean;
  signupCode: string;
}

export interface RegisterCommand {
  email: string;
  username: string;
  password: string;
  signupCode?: string;
  captchaToken?: string;
  ip?: string;
}

const RESTRICTED = ["admin", "administrator", "guest"];

export class Register {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly mailer: Mailer,
    private readonly tokens: TokenService,
    private readonly captcha: Captcha,
    private readonly config: RegisterConfig
  ) {}

  async execute(cmd: RegisterCommand): Promise<void> {
    const email = cmd.email.toLowerCase();

    if (RESTRICTED.includes(cmd.username.toLowerCase())) {
      throw new AuthError(
        "username_restricted",
        "This username is restricted. Please choose a different username."
      );
    }

    if (this.config.requireSignupCode && cmd.signupCode !== this.config.signupCode) {
      throw new AuthError("invalid_signup_code", "Invalid signup code");
    }

    if (await this.users.findByEmail(email)) {
      throw new AuthError("email_exists", "Email address already exists");
    }
    if (await this.users.findByUsername(cmd.username)) {
      throw new AuthError("username_exists", "An account with this name already exists");
    }

    const ok = await this.captcha.verify(cmd.captchaToken, "signup", cmd.ip);
    if (!ok) {
      throw new AuthError(
        "captcha_failed",
        "Signup try marked as risky by recaptcha. If this is a real signup, please contact administrator."
      );
    }

    const passwordHash = await this.hasher.hash(cmd.password);
    const saved = await this.users.save({
      id: 0,
      email,
      username: cmd.username,
      passwordHash,
      confirmed: false,
    });

    const token = this.tokens.sign("confirm", { confirm: saved.id });
    await this.sendConfirmation(saved.email, saved.username, token);
  }

  private async sendConfirmation(email: string, username: string, token: string): Promise<void> {
    await this.mailer.send({
      to: email,
      subject: "Confirm Your Account",
      text: `Hi ${username},\n\nTo confirm your account please use this token: ${token}\n\nNote: replies to this email address are not monitored.`,
      html: `<p>Hi ${username},</p><p>To confirm your account please use this token: <code>${token}</code></p><p><small>Note: replies to this email address are not monitored.</small></p>`,
    });
  }
}
