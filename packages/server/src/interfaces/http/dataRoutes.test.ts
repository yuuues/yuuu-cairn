import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { FakeGameDataRepository } from "@kw/core/testing/FakeGameDataRepository.js";
import { buildDataRoutes } from "./dataRoutes.js";

async function buildApp() {
  const gameData = new FakeGameDataRepository({
    backgrounds: {
      Aurifex: {
        background_description: "An artisan.",
        names: ["Hestia"],
        starting_gear: [],
        table1: { question: "q1", options: [{ description: "o1" }] },
        table2: { question: "q2", options: [{ description: "o2" }] },
      },
    },
    bonds: [{ description: "A gem." }],
    omens: ["The river runs black."],
    traits: { Physique: ["Athletic"] },
    scars: [{ name: "Lasting Scar", description: "Roll 1d6." }],
  });
  const app = Fastify();
  await app.register(buildDataRoutes(gameData), { prefix: "/api/data" });
  await app.ready();
  return app;
}

describe("data routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });

  it("GET /api/data/backgrounds devuelve el mapa de trasfondos", async () => {
    const res = await app.inject({ method: "GET", url: "/api/data/backgrounds" });
    expect(res.statusCode).toBe(200);
    expect(res.json().backgrounds.Aurifex.names).toEqual(["Hestia"]);
  });

  it("GET /api/data/bonds, omens, traits, scars", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/api/data/bonds" })).json().bonds[0].description
    ).toBe("A gem.");
    expect(
      (await app.inject({ method: "GET", url: "/api/data/omens" })).json().omens
    ).toEqual(["The river runs black."]);
    expect(
      (await app.inject({ method: "GET", url: "/api/data/traits" })).json().traits.Physique
    ).toEqual(["Athletic"]);
    expect(
      (await app.inject({ method: "GET", url: "/api/data/scars" })).json().scars[0].name
    ).toBe("Lasting Scar");
  });
});
