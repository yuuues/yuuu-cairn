import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { BuyItems } from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { FakeMarketRepository } from "@kw/core/testing/FakeMarketRepository.js";
import type { Character, MarketItem, SessionUser } from "@kw/shared";
import { buildMarketplaceRoutes } from "./marketplaceRoutes.js";

const catalog: MarketItem[] = [
  { name: "Torch", category: "Gear", cost: 5, tags: ["uses"], uses: 3 },
  { name: "Mail", category: "Armor", cost: 40, tags: ["2 Armor"] },
];

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
    gold: 100,
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
  const market = new FakeMarketRepository(catalog);
  const uc = { buyItems: new BuyItems(characters, market) };
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
  await app.register(buildMarketplaceRoutes(market, uc), {
    prefix: "/api/marketplace",
  });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

describe("marketplace routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/marketplace" });
    expect(res.statusCode).toBe(401);
  });

  it("GET / devuelve catálogo y categorías", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/marketplace",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(2);
    expect(res.json().categories.sort()).toEqual(["Armor", "Gear"]);
  });

  it("POST /:characterId/buy compra items y fija el oro", async () => {
    const saved = await ctx.characters.save(baseCharacter());
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: `/api/marketplace/${saved.id}/buy`,
      headers: { cookie },
      payload: { cart: ["Torch", "Mail"], gold: 55, containerId: 0 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().character.gold).toBe(55);
    expect(res.json().character.items).toHaveLength(2);
    expect(res.json().character.armor).toBe("2");
  });
});
