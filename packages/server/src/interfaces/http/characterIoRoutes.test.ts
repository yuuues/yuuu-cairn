import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { CreateCharacter, GetCharacter, ListCharacters } from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import type { SessionUser } from "@kw/shared";
import { buildCharacterIoRoutes } from "./characterIoRoutes.js";

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const uc = {
    create: new CreateCharacter(characters),
    get: new GetCharacter(characters),
    list: new ListCharacters(characters),
  };

  const app = Fastify();
  await app.register(cookie);
  await app.register(session, {
    secret: "test-secret-test-secret-test-secret",
    cookieName: "kw_session",
    cookie: { secure: false, httpOnly: true, path: "/" },
  });
  app.post<{ Body: SessionUser }>("/test-login", async (req, reply) => {
    req.session.user = req.body;
    return reply.send({ ok: true });
  });
  await app.register(buildCharacterIoRoutes(uc), { prefix: "/api/characters" });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

const importPayload = {
  name: "Rune",
  background: "Aurifex",
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 6,
  gold: 3,
  items: [{ id: 1, name: "Lantern", location: 0, tags: [] }],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: "A wanderer.",
  traits: null,
  notes: null,
  bonds: "A debt.",
  omens: "A star falls.",
  scars: null,
  imageUrl: null,
};

describe("character import/export routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza import sin sesión con 401", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      payload: importPayload,
    });
    expect(res.statusCode).toBe(401);
  });

  it("importa un personaje JSON y lo persiste como nuevo personaje", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie },
      payload: importPayload,
    });
    expect(res.statusCode).toBe(201);
    const { character } = res.json();
    expect(character.name).toBe("Rune");
    expect(character.bonds).toBe("A debt.");
    expect(character.items).toHaveLength(1);
  });

  it("importar con campos mínimos completa los opcionales con defaults", async () => {
    const cookie = await login(ctx.app, owner);
    const minimal = {
      name: "Ghost",
      background: "Unknown",
      strengthMax: 8,
      dexterityMax: 8,
      willpowerMax: 8,
      hpMax: 4,
    };
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie },
      payload: minimal,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().character.gold).toBe(0);
    expect(res.json().character.items).toEqual([]);
  });

  it("exporta un personaje como JSON descargable", async () => {
    const cookie = await login(ctx.app, owner);
    // primero importar para tener un personaje con id conocido
    const imported = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie },
      payload: importPayload,
    });
    const id = imported.json().character.id as number;

    const res = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}/export`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.headers["content-disposition"]).toContain("attachment");
    const data = res.json();
    expect(data.name).toBe("Rune");
    expect(data.background).toBe("Aurifex");
  });

  it("export de personaje ajeno devuelve 404", async () => {
    const cookieA = await login(ctx.app, owner);
    const imported = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie: cookieA },
      payload: importPayload,
    });
    const id = imported.json().character.id as number;

    const other: SessionUser = { id: 2, username: "other", email: "x@e.com" };
    const cookieB = await login(ctx.app, other);
    const res = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}/export`,
      headers: { cookie: cookieB },
    });
    expect(res.statusCode).toBe(404);
  });
});
