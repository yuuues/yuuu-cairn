import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import {
  Register,
  Login,
  ConfirmEmail,
  ResendConfirmation,
  RequestPasswordReset,
  ResetPassword,
  ChangePassword,
  ChangeEmail,
  DeleteAccount,
} from "@kw/core";
import { InMemoryUserRepository } from "@kw/core/testing/InMemoryUserRepository.js";
import { FakePasswordHasher } from "@kw/core/testing/FakePasswordHasher.js";
import { FakeMailer } from "@kw/core/testing/FakeMailer.js";
import { FakeTokenService } from "@kw/core/testing/FakeTokenService.js";
import { FakeCaptcha } from "@kw/core/testing/FakeCaptcha.js";
import { buildAuthRoutes } from "./authRoutes.js";

async function buildApp(): Promise<{
  app: FastifyInstance;
  users: InMemoryUserRepository;
  mailer: FakeMailer;
  tokens: FakeTokenService;
}> {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const mailer = new FakeMailer();
  const tokens = new FakeTokenService();
  const captcha = new FakeCaptcha(true);
  const registerConfig = { requireSignupCode: false, signupCode: "default" };

  const uc = {
    register: new Register(users, hasher, mailer, tokens, captcha, registerConfig),
    login: new Login(users, hasher),
    confirmEmail: new ConfirmEmail(users, tokens),
    resendConfirmation: new ResendConfirmation(users, mailer, tokens),
    requestPasswordReset: new RequestPasswordReset(users, mailer, tokens),
    resetPassword: new ResetPassword(users, hasher, tokens),
    changePassword: new ChangePassword(users, hasher),
    changeEmail: new ChangeEmail(users, hasher),
    deleteAccount: new DeleteAccount(users, hasher),
    // Dependencias raw para localización de emails en las rutas HTTP
    mailer,
    users,
    hasher,
    tokens,
    captcha,
    registerConfig,
  };

  const app = Fastify();
  await app.register(cookie);
  await app.register(session, {
    secret: "test-secret-test-secret-test-secret",
    cookieName: "kw_session",
    cookie: { secure: false, httpOnly: true, path: "/" },
  });
  await app.register(buildAuthRoutes(uc), { prefix: "/api/auth" });
  await app.ready();
  return { app, users, mailer, tokens };
}

describe("auth routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("signup crea usuario y devuelve 201", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "alice@example.com", username: "alice", password: "password1" },
    });
    expect(res.statusCode).toBe(201);
    expect(ctx.mailer.sent).toHaveLength(1);
  });

  it("signup con username restringido devuelve 400 con código", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "a@example.com", username: "admin", password: "password1" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("username_restricted");
  });

  it("login sin confirmar devuelve 401 not_confirmed", async () => {
    await ctx.app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "alice@example.com", username: "alice", password: "password1" },
    });
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "alice@example.com", password: "password1" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("not_confirmed");
  });

  it("flujo completo: signup -> confirm -> login -> me -> logout", async () => {
    const { app, users, tokens } = ctx;
    await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "alice@example.com", username: "alice", password: "password1" },
    });
    const user = await users.findByEmail("alice@example.com");
    const confirmToken = tokens.sign("confirm", { confirm: user!.id });

    const confirmed = await app.inject({
      method: "POST",
      url: "/api/auth/confirm",
      payload: { token: confirmToken },
    });
    expect(confirmed.statusCode).toBe(200);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "alice@example.com", password: "password1" },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookieHeader },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.username).toBe("alice");

    const meAnon = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(meAnon.statusCode).toBe(401);
  });

  it("login con credenciales inválidas devuelve 401 invalid_credentials", async () => {
    await ctx.app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "alice@example.com", username: "alice", password: "password1" },
    });
    const user = await ctx.users.findByEmail("alice@example.com");
    await ctx.users.save({ ...user!, confirmed: true });
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "alice@example.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("invalid_credentials");
  });

  it("change-password sin sesión devuelve 401", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      payload: { oldPassword: "x", password: "y" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("signup con kw_lang=es envía email de confirmación en español", async () => {
    const { app, mailer } = ctx;
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      headers: { cookie: "kw_lang=es" },
      payload: {
        email: "test-es@example.com",
        username: "testies",
        password: "password123",
      },
    });
    expect(res.statusCode).toBe(201);
    const sent = mailer.sent.at(-1);
    expect(sent?.subject).toBe("Confirma tu cuenta");
  });
});
