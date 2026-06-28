import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  PartyError,
  type CreateParty,
  type GetParty,
  type ListParties,
  type UpdateParty,
  type DeleteParty,
  type JoinParty,
  type LeaveParty,
  type UpdatePartyInventory,
} from "@kw/core";
import {
  CreatePartyInputSchema,
  UpdatePartyInputSchema,
  JoinPartyInputSchema,
  LeavePartyInputSchema,
  UpdatePartyInventoryInputSchema,
} from "@kw/shared";
import { z } from "zod";

export interface PartyUseCases {
  list: ListParties;
  create: CreateParty;
  get: GetParty;
  update: UpdateParty;
  remove: DeleteParty;
  join: JoinParty;
  leave: LeaveParty;
  updateInventory: UpdatePartyInventory;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });
const MemberParamsSchema = z.object({
  id: z.coerce.number().int(),
  characterId: z.coerce.number().int(),
});

function statusFor(code: string): number {
  switch (code) {
    case "not_found": return 404;
    case "forbidden": return 403;
    case "invalid_code": return 400;
    case "already_member": return 409;
    default: return 400;
  }
}

export function buildPartyRoutes(uc: PartyUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof PartyError) {
        return reply.status(statusFor(err.code)).send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply.status(400).send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply.status(401).send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.get("/", async (req, reply) => {
      const parties = await uc.list.execute(req.session.user!.id);
      return reply.send({ parties });
    });

    app.post("/", async (req, reply) => {
      const input = CreatePartyInputSchema.parse(req.body);
      const party = await uc.create.execute({ ownerId: req.session.user!.id, input });
      return reply.status(201).send({ party });
    });

    app.get("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const result = await uc.get.execute({ partyId: id, userId: req.session.user!.id });
      return reply.send({ party: result.party, joinCode: result.joinCode });
    });

    app.patch("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdatePartyInputSchema.parse(req.body);
      const party = await uc.update.execute({ partyId: id, userId: req.session.user!.id, input });
      return reply.send({ party });
    });

    app.delete("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      await uc.remove.execute({ partyId: id, userId: req.session.user!.id });
      return reply.send({ ok: true });
    });

    app.post("/join", async (req, reply) => {
      const input = JoinPartyInputSchema.parse(req.body);
      const party = await uc.join.execute({
        joinCode: input.joinCode,
        characterId: input.characterId,
        userId: req.session.user!.id,
      });
      return reply.send({ party });
    });

    app.delete("/:id/members/:characterId", async (req, reply) => {
      const { id, characterId } = MemberParamsSchema.parse(req.params);
      const party = await uc.leave.execute({
        partyId: id,
        characterId,
        requesterId: req.session.user!.id,
      });
      return reply.send({ party });
    });

    app.put("/:id/inventory", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdatePartyInventoryInputSchema.parse(req.body);
      const party = await uc.updateInventory.execute({
        partyId: id,
        userId: req.session.user!.id,
        input,
      });
      return reply.send({ party });
    });
  };
  return plugin;
}
