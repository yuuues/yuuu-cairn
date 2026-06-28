import Fastify from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import fastifyIO from "fastify-socket.io";
import { MemoryStore } from "@fastify/session";
import { SocketEventPublisher } from "./infrastructure/realtime/socketio/SocketEventPublisher.js";
import { registerSocketHandlers } from "./interfaces/socket/socketGateway.js";
import { resolveSessionUser } from "./interfaces/socket/sessionFromHandshake.js";
import { loadEnv } from "./infrastructure/config/env.js";
import { getPrismaClient } from "./infrastructure/persistence/prisma/prismaClient.js";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma/PrismaUserRepository.js";
import { ScryptHasher } from "./infrastructure/auth/ScryptHasher.js";
import { SignedTokenService } from "./infrastructure/auth/SignedTokenService.js";
import { NodemailerMailer } from "./infrastructure/mail/nodemailer/NodemailerMailer.js";
import {
  NoopCaptcha,
  RecaptchaEnterprise,
} from "./infrastructure/captcha/RecaptchaEnterprise.js";
import { buildAuthRoutes } from "./interfaces/http/authRoutes.js";
import { PrismaCharacterRepository } from "./infrastructure/persistence/prisma/PrismaCharacterRepository.js";
import { FileGameDataRepository } from "./infrastructure/gamedata/FileGameDataRepository.js";
import { CryptoDice } from "./infrastructure/rng/CryptoDice.js";
import { buildCharacterRoutes } from "./interfaces/http/characterRoutes.js";
import { buildDataRoutes } from "./interfaces/http/dataRoutes.js";
import { FileMarketRepository } from "./infrastructure/marketplace/FileMarketRepository.js";
import { buildInventoryRoutes } from "./interfaces/http/inventoryRoutes.js";
import { buildMarketplaceRoutes } from "./interfaces/http/marketplaceRoutes.js";
import { PrismaPartyRepository } from "./infrastructure/persistence/prisma/PrismaPartyRepository.js";
import { CryptoIdGenerator } from "./infrastructure/rng/CryptoIdGenerator.js";
import { buildPartyRoutes } from "./interfaces/http/partyRoutes.js";
import { FileGeneratorRepository } from "./infrastructure/generators/FileGeneratorRepository.js";
import { buildGeneratorRoutes } from "./interfaces/http/generatorRoutes.js";
import { buildCharacterIoRoutes } from "./interfaces/http/characterIoRoutes.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  type Captcha,
  ListCharacters,
  GetCharacter,
  CreateCharacter,
  UpdateCharacter,
  DeleteCharacter,
  RollCharacter,
  UpdateInventory,
  TransferItem,
  BuyItems,
  CreateParty,
  GetParty,
  ListParties,
  UpdateParty,
  DeleteParty,
  JoinParty,
  LeaveParty,
  UpdatePartyInventory,
  RollDice,
  GenerateNpc,
  RollTable,
} from "@kw/core";

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  // ---- adaptadores driven ----
  const prisma = getPrismaClient();
  const users = new PrismaUserRepository(prisma);
  const hasher = new ScryptHasher();
  const tokens = new SignedTokenService(env.SECRET_KEY);
  const mailer = new NodemailerMailer({
    host: env.MAIL_SERVER,
    port: env.MAIL_PORT,
    secure: env.MAIL_USE_TLS,
    user: env.MAIL_USERNAME,
    pass: env.MAIL_PASSWORD,
  });
  const captcha: Captcha =
    env.USE_CAPTCHA && env.CAPTCHA_PROJECT_ID && env.CAPTCHA_KEY && env.CAPTCHA_API_KEY
      ? new RecaptchaEnterprise({
          projectId: env.CAPTCHA_PROJECT_ID,
          siteKey: env.CAPTCHA_KEY,
          apiKey: env.CAPTCHA_API_KEY,
          block: env.CAPTCHA_BLOCK,
        })
      : new NoopCaptcha();

  // ---- adaptadores de personajes/datos de juego ----
  const characters = new PrismaCharacterRepository(prisma);
  const here = resolve(fileURLToPath(import.meta.url), "..");
  const dataDir = resolve(here, env.DATA_DIR);
  const gameData = new FileGameDataRepository(dataDir);
  const dice = new CryptoDice();

  const characterUseCases = {
    list: new ListCharacters(characters),
    get: new GetCharacter(characters),
    create: new CreateCharacter(characters),
    update: new UpdateCharacter(characters),
    remove: new DeleteCharacter(characters),
    roll: new RollCharacter(gameData, dice),
  };

  // ---- adaptador y casos de uso de partidas ----
  const parties = new PrismaPartyRepository(prisma);
  const idGenerator = new CryptoIdGenerator();

  const partyUseCases = {
    list: new ListParties(parties),
    create: new CreateParty(parties, idGenerator),
    get: new GetParty(parties),
    update: new UpdateParty(parties),
    remove: new DeleteParty(parties),
    join: new JoinParty(parties, characters),
    leave: new LeaveParty(parties, characters),
    updateInventory: new UpdatePartyInventory(parties),
  };

  // ---- adaptador de generadores ----
  const generators = new FileGeneratorRepository(dataDir);
  const generatorUseCases = {
    rollTable: new RollTable(generators, dice),
    generateNpc: new GenerateNpc(generators, dice),
    tables: generators,
  };

  // ---- adaptador y casos de uso de inventario/marketplace ----
  const market = new FileMarketRepository(dataDir);

  const inventoryUseCases = {
    updateInventory: new UpdateInventory(characters),
    transferItem: new TransferItem(characters),
  };
  const marketplaceUseCases = {
    buyItems: new BuyItems(characters, market),
  };

  // ---- casos de uso (inyección por constructor) ----
  const registerConfig = {
    requireSignupCode: env.REQUIRE_SIGNUP_CODE,
    signupCode: env.SIGNUP_CODE,
  };
  const authUseCases = {
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

  // ---- sesión por cookie httpOnly (store explícito, compartido con Socket.IO) ----
  const sessionStore = new MemoryStore();
  await app.register(cookie);
  await app.register(session, {
    secret: env.SECRET_KEY,
    cookieName: "kw_session",
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      maxAge: 60 * 60 * 24, // 24 h (paridad: PERMANENT_SESSION_LIFETIME)
      path: "/",
    },
  });

  // ---- Socket.IO montado sobre el servidor HTTP de Fastify ----
  await app.register(fastifyIO, {
    cors: { origin: env.BASE_URL, credentials: true },
  });

  // ---- rutas ----
  app.get("/api/health", async () => ({ status: "ok" }));
  await app.register(buildAuthRoutes(authUseCases), { prefix: "/api/auth" });
  await app.register(buildCharacterRoutes(characterUseCases), {
    prefix: "/api/characters",
  });
  await app.register(buildDataRoutes(gameData), { prefix: "/api/data" });
  await app.register(buildInventoryRoutes(inventoryUseCases), {
    prefix: "/api/characters",
  });
  await app.register(buildMarketplaceRoutes(market, marketplaceUseCases), {
    prefix: "/api/marketplace",
  });
  await app.register(buildPartyRoutes(partyUseCases), { prefix: "/api/parties" });
  await app.register(buildGeneratorRoutes(generatorUseCases), { prefix: "/api/generators" });
  await app.register(
    buildCharacterIoRoutes({ create: characterUseCases.create, get: characterUseCases.get }),
    { prefix: "/api/characters" }
  );

  // ---- tiempo real: publisher + caso de uso + gateway ----
  await app.ready(); // garantiza que app.io está disponible
  const eventPublisher = new SocketEventPublisher(app.io);
  const rollDice = new RollDice(characters, parties, eventPublisher);

  registerSocketHandlers(app.io, {
    rollDice,
    parties,
    resolveUser: (socket) =>
      resolveSessionUser(
        socket.handshake.headers.cookie,
        env.SECRET_KEY,
        "kw_session",
        sessionStore
      ),
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
