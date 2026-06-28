import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import {
  ListCharacters,
  GetCharacter,
  CreateCharacter,
  UpdateCharacter,
  DeleteCharacter,
  RollCharacter,
} from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { FakeGameDataRepository } from "@kw/core/testing/FakeGameDataRepository.js";
import { SequenceDice } from "@kw/core/testing/SequenceDice.js";
import type { SessionUser } from "@kw/shared";
import { buildCharacterRoutes } from "./characterRoutes.js";

const sampleBackgrounds = {
  Aurifex: {
    background_description: "An artisan.",
    names: ["Hestia"],
    starting_gear: [{ name: "Lantern", tags: [] }],
    table1: { question: "q1", options: [{ description: "o1" }] },
    table2: { question: "q2", options: [{ description: "o2" }] },
  },
};
const sampleTraits = {
  Physique: ["Athletic"],
  Skin: ["Tanned"],
  Hair: ["Braided"],
  Face: ["Broken"],
  Speech: ["Booming"],
  Clothing: ["Antique"],
  Virtue: ["Ambitious"],
  Vice: ["Aggressive"],
};

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const gameData = new FakeGameDataRepository({
    backgrounds: sampleBackgrounds,
    bonds: [{ description: "A gem.", gold: 5 }],
    omens: ["The river runs black."],
    traits: sampleTraits,
  });
  const dice = new SequenceDice([
    1, // name
    1, 1, // table1, table2
    1, // bond
    1, // omen
    1, 1, 1, 1, 1, 1, 1, 1, // traits
    1, 1, 1, // gold
    1, 1, // age
    1, 1, 1, // str
    1, 1, 1, // dex
    1, 1, 1, // wil
    1, // hp
  ]);

  const uc = {
    list: new ListCharacters(characters),
    get: new GetCharacter(characters),
    create: new CreateCharacter(characters),
    update: new UpdateCharacter(characters),
    remove: new DeleteCharacter(characters),
    roll: new RollCharacter(gameData, dice),
  };

  const app = Fastify();
  await app.register(cookie);
  await app.register(session, {
    secret: "test-secret-test-secret-test-secret",
    cookieName: "kw_session",
    cookie: { secure: false, httpOnly: true, path: "/" },
  });
  // ruta de prueba para fijar la sesión
  app.post<{ Body: SessionUser }>("/test-login", async (req, reply) => {
    req.session.user = req.body;
    return reply.send({ ok: true });
  });
  await app.register(buildCharacterRoutes(uc), { prefix: "/api/characters" });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

const createPayload = {
  name: "Rune",
  background: "Aurifex",
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 6,
  gold: 0,
  items: [],
  containers: [{ id: 0, name: "Main", slots: 10 }],
};

describe("character routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/characters" });
    expect(res.statusCode).toBe(401);
  });

  it("crea, lista, lee, actualiza y borra un personaje", async () => {
    const cookie = await login(ctx.app, owner);

    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/characters",
      headers: { cookie },
      payload: createPayload,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().character.id as number;
    expect(id).toBeGreaterThan(0);
    expect(created.json().character.hp).toBe(6);

    const list = await ctx.app.inject({
      method: "GET",
      url: "/api/characters",
      headers: { cookie },
    });
    expect(list.json().characters).toHaveLength(1);

    const got = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}`,
      headers: { cookie },
    });
    expect(got.json().character.name).toBe("Rune");

    const patched = await ctx.app.inject({
      method: "PATCH",
      url: `/api/characters/${id}`,
      headers: { cookie },
      payload: { gold: 50 },
    });
    expect(patched.json().character.gold).toBe(50);

    const deleted = await ctx.app.inject({
      method: "DELETE",
      url: `/api/characters/${id}`,
      headers: { cookie },
    });
    expect(deleted.statusCode).toBe(200);
  });

  it("404 al leer un personaje de otro usuario", async () => {
    const cookieA = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/characters",
      headers: { cookie: cookieA },
      payload: createPayload,
    });
    const id = created.json().character.id as number;

    const other: SessionUser = { id: 2, username: "other", email: "x@e.com" };
    const cookieB = await login(ctx.app, other);
    const got = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}`,
      headers: { cookie: cookieB },
    });
    expect(got.statusCode).toBe(404);
  });

  it("roll devuelve un CreateCharacterInput sin persistir", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/roll",
      headers: { cookie },
      payload: { background: "Aurifex" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().draft.background).toBe("Aurifex");
    expect(res.json().draft.name).toBe("Hestia");
    // no se persistió nada
    const list = await ctx.app.inject({
      method: "GET",
      url: "/api/characters",
      headers: { cookie },
    });
    expect(list.json().characters).toHaveLength(0);
  });
});
