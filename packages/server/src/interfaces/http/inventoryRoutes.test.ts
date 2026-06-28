import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { UpdateInventory, TransferItem } from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import type { Character, SessionUser } from "@kw/shared";
import { buildInventoryRoutes } from "./inventoryRoutes.js";

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Char",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 50,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const uc = {
    updateInventory: new UpdateInventory(characters),
    transferItem: new TransferItem(characters),
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
  await app.register(buildInventoryRoutes(uc), { prefix: "/api/characters" });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

describe("inventory routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({
      method: "PUT",
      url: "/api/characters/1/inventory",
      payload: { items: [], containers: [], gold: 0 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("PUT /:id/inventory actualiza items, oro y armadura", async () => {
    const saved = await ctx.characters.save(baseCharacter());
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "PUT",
      url: `/api/characters/${saved.id}/inventory`,
      headers: { cookie },
      payload: {
        gold: 30,
        containers: [{ id: 0, name: "Main", slots: 10 }],
        items: [{ id: 1, name: "Mail", location: 0, tags: ["2 Armor"] }],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().character.gold).toBe(30);
    expect(res.json().character.armor).toBe("2");
  });

  it("POST /:id/transfer mueve un item a otro personaje", async () => {
    const from = await ctx.characters.save(
      baseCharacter({
        ownerId: 1,
        items: [{ id: 7, name: "Sword", location: 0, tags: [] }],
      })
    );
    const to = await ctx.characters.save(baseCharacter({ ownerId: 2, items: [] }));
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: `/api/characters/${from.id}/transfer`,
      headers: { cookie },
      payload: { itemId: 7, toCharacterId: to.id },
    });
    expect(res.statusCode).toBe(200);
    const target = await ctx.characters.findById(to.id);
    expect(target!.items.map((i) => i.name)).toContain("Sword");
  });

  it("404 al actualizar inventario de personaje ajeno", async () => {
    const saved = await ctx.characters.save(baseCharacter({ ownerId: 2 }));
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "PUT",
      url: `/api/characters/${saved.id}/inventory`,
      headers: { cookie },
      payload: { items: [], containers: [], gold: 0 },
    });
    expect(res.statusCode).toBe(404);
  });
});
