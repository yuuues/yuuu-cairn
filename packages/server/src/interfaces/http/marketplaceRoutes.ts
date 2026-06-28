import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import { InventoryError, type BuyItems, type MarketRepository } from "@kw/core";
import { BuyItemsInputSchema } from "@kw/shared";
import { z } from "zod";

export interface MarketplaceUseCases {
  buyItems: BuyItems;
}

const ParamsSchema = z.object({ characterId: z.coerce.number().int() });

function statusFor(code: string): number {
  switch (code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    default:
      return 400;
  }
}

export function buildMarketplaceRoutes(
  market: MarketRepository,
  uc: MarketplaceUseCases
): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof InventoryError) {
        return reply
          .status(statusFor(err.code))
          .send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply
          .status(400)
          .send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.get("/", async (_req, reply) =>
      reply.send({ items: market.items(), categories: market.categories() })
    );

    app.post("/:characterId/buy", async (req, reply) => {
      const { characterId } = ParamsSchema.parse(req.params);
      const input = BuyItemsInputSchema.parse(req.body);
      const character = await uc.buyItems.execute({
        id: characterId,
        ownerId: req.session.user!.id,
        input,
      });
      return reply.send({ character });
    });
  };
  return plugin;
}
