import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import {
  CreateParty,
  GetParty,
  ListParties,
  UpdateParty,
  DeleteParty,
  JoinParty,
  LeaveParty,
  UpdatePartyInventory,
} from "@kw/core";
import { InMemoryPartyRepository } from "@kw/core/testing/InMemoryPartyRepository.js";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { FakeIdGenerator } from "@kw/core/testing/FakeIdGenerator.js";
import type { SessionUser, Character } from "@kw/shared";
import { buildPartyRoutes } from "./partyRoutes.js";

async function buildApp() {
  const parties = new InMemoryPartyRepository();
  const characters = new InMemoryCharacterRepository();
  const idGen = new FakeIdGenerator();

  const uc = {
    list: new ListParties(parties),
    create: new CreateParty(parties, idGen),
    get: new GetParty(parties),
    update: new UpdateParty(parties),
    remove: new DeleteParty(parties),
    join: new JoinParty(parties, characters),
    leave: new LeaveParty(parties, characters),
    updateInventory: new UpdatePartyInventory(parties),
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
  await app.register(buildPartyRoutes(uc), { prefix: "/api/parties" });
  await app.ready();
  return { app, parties, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };
const other: SessionUser = { id: 2, username: "other", email: "x@e.com" };

const createPayload = { name: "My Party", description: "A cool party", notes: null };

describe("party routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { ctx = await buildApp(); });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/parties" });
    expect(res.statusCode).toBe(401);
  });

  it("crea, lista, lee, edita y borra una partida", async () => {
    const cookie = await login(ctx.app, owner);

    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie }, payload: createPayload,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().party.id as number;
    expect(id).toBeGreaterThan(0);
    expect(created.json().party.joinCode).toBe("CODE1");

    const list = await ctx.app.inject({ method: "GET", url: "/api/parties", headers: { cookie } });
    expect(list.json().parties).toHaveLength(1);

    // owner recibe joinCode
    const got = await ctx.app.inject({ method: "GET", url: `/api/parties/${id}`, headers: { cookie } });
    expect(got.json().joinCode).toBe("CODE1");
    expect(got.json().party.name).toBe("My Party");

    const patched = await ctx.app.inject({
      method: "PATCH", url: `/api/parties/${id}`, headers: { cookie }, payload: { name: "Renamed" },
    });
    expect(patched.json().party.name).toBe("Renamed");

    const deleted = await ctx.app.inject({ method: "DELETE", url: `/api/parties/${id}`, headers: { cookie } });
    expect(deleted.statusCode).toBe(200);
  });

  it("un usuario ajeno recibe 403 al leer la partida", async () => {
    const cookieA = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie: cookieA }, payload: createPayload,
    });
    const id = created.json().party.id as number;

    const cookieB = await login(ctx.app, other);
    const got = await ctx.app.inject({ method: "GET", url: `/api/parties/${id}`, headers: { cookie: cookieB } });
    expect(got.statusCode).toBe(403);
  });

  it("unirse a una partida por joinCode", async () => {
    const cookieA = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie: cookieA }, payload: createPayload,
    });
    const partyId = created.json().party.id as number;
    const joinCode = created.json().party.joinCode as string;

    // Crear personaje del usuario 2
    const baseChar: Character = {
      id: 0, ownerId: 2, name: "Hero", background: "A",
      strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
      hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
      description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
      imageUrl: null, partyId: null,
    };
    const savedChar = await ctx.characters.save(baseChar);

    const cookieB = await login(ctx.app, other);
    const joined = await ctx.app.inject({
      method: "POST", url: "/api/parties/join", headers: { cookie: cookieB },
      payload: { joinCode, characterId: savedChar.id },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json().party.members).toContain(savedChar.id);
    expect(joined.json().party.subowners).toContain(2);

    // subowner no recibe joinCode
    const gotAsSubowner = await ctx.app.inject({
      method: "GET", url: `/api/parties/${partyId}`, headers: { cookie: cookieB },
    });
    expect(gotAsSubowner.statusCode).toBe(200);
    expect(gotAsSubowner.json().joinCode).toBeNull();
  });

  it("actualizar inventario de partida", async () => {
    const cookie = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie }, payload: createPayload,
    });
    const id = created.json().party.id as number;

    const updated = await ctx.app.inject({
      method: "PUT", url: `/api/parties/${id}/inventory`, headers: { cookie },
      payload: {
        items: [{ id: 1, name: "Rope", location: 0, tags: [] }],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().party.items[0].name).toBe("Rope");
  });

  it("joinCode incorrecto devuelve 400", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST", url: "/api/parties/join", headers: { cookie },
      payload: { joinCode: "WRONG", characterId: 1 },
    });
    expect(res.statusCode).toBe(400);
  });
});
