import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  AuthError,
  Register,
  ResendConfirmation,
  RequestPasswordReset,
  type Login,
  type ConfirmEmail,
  type ResetPassword,
  type ChangePassword,
  type ChangeEmail,
  type DeleteAccount,
  type UserRepository,
  type PasswordHasher,
  type Mailer,
  type EmailMessage,
  type TokenService,
  type Captcha,
  type RegisterConfig,
} from "@kw/core";
import {
  RegisterInputSchema,
  LoginInputSchema,
  ResendConfirmationInputSchema,
  RequestPasswordResetInputSchema,
  ResetPasswordInputSchema,
  ChangePasswordInputSchema,
  ChangeEmailInputSchema,
  DeleteAccountInputSchema,
  type SessionUser,
} from "@kw/shared";
import {
  buildConfirmEmail,
  buildResetEmail,
} from "../../infrastructure/i18n/emailTranslations.js";
import { parseLocale } from "@kw/shared";
import type { Locale } from "@kw/shared";

declare module "fastify" {
  interface Session {
    user?: SessionUser;
  }
}

/** Lee la cookie kw_lang del header Cookie de Fastify. */
function localeFromCookie(cookieHeader: string | undefined): Locale {
  if (!cookieHeader) return "en";
  const match = cookieHeader.match(/(?:^|;\s*)kw_lang=([^;]+)/);
  return parseLocale(match?.[1]);
}

/**
 * Wrapper de Mailer que intercepta el send de emails de auth y los
 * sobreescribe con la versión localizada según el locale dado.
 * Los demás correos pasan sin cambios.
 */
class LocalizedAuthMailer implements Mailer {
  constructor(
    private readonly inner: Mailer,
    private readonly locale: Locale,
    private readonly username: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    // Detectar por el subject (hardcoded en los casos de uso)
    let localized: Partial<EmailMessage> = {};
    if (message.subject.startsWith("Confirm Your Account")) {
      const token = this.extractToken(message.text);
      const built = buildConfirmEmail(this.locale, this.username, token);
      localized = { subject: built.subject, text: built.text, html: built.html };
    } else if (message.subject.startsWith("Reset Your Password")) {
      const token = this.extractToken(message.text);
      const built = buildResetEmail(this.locale, this.username, token);
      localized = { subject: built.subject, text: built.text, html: built.html };
    }
    await this.inner.send({ ...message, ...localized });
  }

  /** Extrae el token del body de texto (formato: 'token: <TOKEN>') */
  private extractToken(text: string): string {
    const match = text.match(/token:\s*(\S+)/i);
    return match?.[1] ?? "";
  }
}

export interface AuthUseCases {
  register: Register;
  login: Login;
  confirmEmail: ConfirmEmail;
  resendConfirmation: ResendConfirmation;
  requestPasswordReset: RequestPasswordReset;
  resetPassword: ResetPassword;
  changePassword: ChangePassword;
  changeEmail: ChangeEmail;
  deleteAccount: DeleteAccount;
  /** Dependencias raw para re-instanciar casos de uso con mailer localizado */
  mailer: Mailer;
  users: UserRepository;
  hasher: PasswordHasher;
  tokens: TokenService;
  captcha: Captcha;
  registerConfig: RegisterConfig;
}

function statusFor(code: string): number {
  switch (code) {
    case "invalid_credentials":
    case "not_confirmed":
      return 401;
    default:
      return 400;
  }
}

export function buildAuthRoutes(uc: AuthUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof AuthError) {
        return reply
          .status(statusFor(err.code))
          .send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply.status(400).send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    app.post("/signup", async (req, reply) => {
      const input = RegisterInputSchema.parse(req.body);
      const locale = localeFromCookie(req.headers.cookie);
      const localizedMailer = new LocalizedAuthMailer(uc.mailer, locale, input.username);
      const register = new Register(
        uc.users,
        uc.hasher,
        localizedMailer,
        uc.tokens,
        uc.captcha,
        uc.registerConfig
      );
      await register.execute({ ...input, ip: req.ip });
      return reply.status(201).send({ ok: true });
    });

    app.post("/login", async (req, reply) => {
      const input = LoginInputSchema.parse(req.body);
      const user = await uc.login.execute(input);
      req.session.user = user;
      return reply.send({ user });
    });

    app.post("/logout", async (req, reply) => {
      await req.session.destroy();
      return reply.send({ ok: true });
    });

    app.get("/me", async (req, reply) => {
      const user = req.session.user;
      if (!user) return reply.status(401).send({ code: "unauthenticated", message: "Not logged in" });
      return reply.send({ user });
    });

    app.post("/confirm", async (req, reply) => {
      const { token } = ResetPasswordInputSchema.pick({ token: true }).parse(req.body);
      await uc.confirmEmail.execute({ token });
      return reply.send({ ok: true });
    });

    app.post("/resend-confirmation", async (req, reply) => {
      const input = ResendConfirmationInputSchema.parse(req.body);
      const locale = localeFromCookie(req.headers.cookie);
      // Necesitamos el username para el LocalizedAuthMailer; lo obtenemos del user
      const user = await uc.users.findByEmail(input.email.toLowerCase());
      const username = user?.username ?? "";
      const localizedMailer = new LocalizedAuthMailer(uc.mailer, locale, username);
      const resendConfirmation = new ResendConfirmation(uc.users, localizedMailer, uc.tokens);
      const result = await resendConfirmation.execute(input);
      return reply.send(result);
    });

    app.post("/reset-request", async (req, reply) => {
      const input = RequestPasswordResetInputSchema.parse(req.body);
      const locale = localeFromCookie(req.headers.cookie);
      // Necesitamos el username para el LocalizedAuthMailer; lo obtenemos del user
      const user = await uc.users.findByEmail(input.email.toLowerCase());
      const username = user?.username ?? "";
      const localizedMailer = new LocalizedAuthMailer(uc.mailer, locale, username);
      const requestPasswordReset = new RequestPasswordReset(uc.users, localizedMailer, uc.tokens);
      const result = await requestPasswordReset.execute(input);
      return reply.send(result);
    });

    app.post("/reset", async (req, reply) => {
      const input = ResetPasswordInputSchema.parse(req.body);
      await uc.resetPassword.execute(input);
      return reply.send({ ok: true });
    });

    app.post("/change-password", async (req, reply) => {
      const user = req.session.user;
      if (!user) return reply.status(401).send({ code: "unauthenticated", message: "Not logged in" });
      const input = ChangePasswordInputSchema.parse(req.body);
      await uc.changePassword.execute({ userId: user.id, ...input });
      return reply.send({ ok: true });
    });

    app.post("/change-email", async (req, reply) => {
      const user = req.session.user;
      if (!user) return reply.status(401).send({ code: "unauthenticated", message: "Not logged in" });
      const input = ChangeEmailInputSchema.parse(req.body);
      await uc.changeEmail.execute({ userId: user.id, ...input });
      // refrescar email en la sesión
      req.session.user = { ...user, email: input.email.toLowerCase() };
      return reply.send({ ok: true });
    });

    app.post("/delete-account", async (req, reply) => {
      const user = req.session.user;
      if (!user) return reply.status(401).send({ code: "unauthenticated", message: "Not logged in" });
      const input = DeleteAccountInputSchema.parse(req.body);
      await uc.deleteAccount.execute({ userId: user.id, ...input });
      await req.session.destroy();
      return reply.send({ ok: true });
    });
  };
  return plugin;
}
