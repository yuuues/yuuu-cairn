import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { RollTable, GenerateNpc } from "@kw/core";
import { FakeGeneratorRepository } from "@kw/core/testing/FakeGeneratorRepository.js";
import { SequenceDice } from "@kw/core/testing/SequenceDice.js";
import { buildGeneratorRoutes } from "./generatorRoutes.js";

const tables = {
  Reactions: ["Hostile", "Wary", "Curious"],
  NPCGenerator: {
    NPCNames: { Names: ["Alaric"] },
    NPCBackgrounds: ["Guard"],
    NPCTraits: { Virtues: ["Cautious"], Vices: ["Corrupt"] },
    NPCQuirks: ["Alert"],
    NPCGoals: { Goals: ["Freedom"] },
  },
};

async function buildApp() {
  const repo = new FakeGeneratorRepository(tables);
  const dice = new SequenceDice([1, 1, 1, 1, 1, 1, 1]);
  const uc = {
    rollTable: new RollTable(repo, dice),
    generateNpc: new GenerateNpc(repo, dice),
    tables: repo,
  };
  const app = Fastify();
  await app.register(buildGeneratorRoutes(uc), { prefix: "/api/generators" });
  await app.ready();
  return { app };
}

describe("generator routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("GET /api/generators/tables devuelve el mapa de tablas", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/generators/tables" });
    expect(res.statusCode).toBe(200);
    expect(res.json().tables["Reactions"]).toBeDefined();
  });

  it("POST /api/generators/roll devuelve resultado de tirar tabla", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/generators/roll",
      payload: { category: "Reactions", subcategory: null },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().result.category).toBe("Reactions");
    expect(typeof res.json().result.result).toBe("string");
  });

  it("POST /api/generators/roll devuelve 404 si la categoría no existe", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/generators/roll",
      payload: { category: "Unknown", subcategory: null },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/generators/npc devuelve un NPC completo", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/generators/npc",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const npc = res.json().npc;
    expect(npc.name).toBe("Alaric");
    expect(npc.background).toBe("Guard");
  });
});
