import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  AuthError,
  type Register,
  type Login,
  type ConfirmEmail,
  type ResendConfirmation,
  type RequestPasswordReset,
  type ResetPassword,
  type ChangePassword,
  type ChangeEmail,
  type DeleteAccount,
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

declare module "fastify" {
  interface Session {
    user?: SessionUser;
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
      await uc.register.execute({ ...input, ip: req.ip });
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
      const result = await uc.resendConfirmation.execute(input);
      return reply.send(result);
    });

    app.post("/reset-request", async (req, reply) => {
      const input = RequestPasswordResetInputSchema.parse(req.body);
      const result = await uc.requestPasswordReset.execute(input);
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
