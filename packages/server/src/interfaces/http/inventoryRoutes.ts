import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  InventoryError,
  type UpdateInventory,
  type TransferItem,
} from "@kw/core";
import {
  UpdateInventoryInputSchema,
  TransferItemInputSchema,
} from "@kw/shared";
import { z } from "zod";

export interface InventoryUseCases {
  updateInventory: UpdateInventory;
  transferItem: TransferItem;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });

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

export function buildInventoryRoutes(uc: InventoryUseCases): FastifyPluginAsync {
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

    app.put("/:id/inventory", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdateInventoryInputSchema.parse(req.body);
      const character = await uc.updateInventory.execute({
        id,
        ownerId: req.session.user!.id,
        input,
      });
      return reply.send({ character });
    });

    app.post("/:id/transfer", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = TransferItemInputSchema.parse(req.body);
      await uc.transferItem.execute({
        ownerId: req.session.user!.id,
        fromCharacterId: id,
        input,
      });
      return reply.send({ ok: true });
    });
  };
  return plugin;
}
