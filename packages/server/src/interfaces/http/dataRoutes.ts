import type { FastifyPluginAsync } from "fastify";
import type { GameDataRepository } from "@kw/core";

export function buildDataRoutes(data: GameDataRepository): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.get("/backgrounds", async (_req, reply) =>
      reply.send({ backgrounds: data.backgrounds() })
    );
    app.get("/bonds", async (_req, reply) => reply.send({ bonds: data.bonds() }));
    app.get("/omens", async (_req, reply) => reply.send({ omens: data.omens() }));
    app.get("/traits", async (_req, reply) => reply.send({ traits: data.traits() }));
    app.get("/scars", async (_req, reply) => reply.send({ scars: data.scars() }));
  };
  return plugin;
}
