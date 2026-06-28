import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  CharacterError,
  type ListCharacters,
  type GetCharacter,
  type CreateCharacter,
  type UpdateCharacter,
  type DeleteCharacter,
  type RollCharacter,
} from "@kw/core";
import {
  CreateCharacterInputSchema,
  UpdateCharacterInputSchema,
} from "@kw/shared";
import { z } from "zod";

export interface CharacterUseCases {
  list: ListCharacters;
  get: GetCharacter;
  create: CreateCharacter;
  update: UpdateCharacter;
  remove: DeleteCharacter;
  roll: RollCharacter;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });
const RollBodySchema = z.object({ background: z.string().default("") });

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

export function buildCharacterRoutes(uc: CharacterUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof CharacterError) {
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

    // Guard de sesión común
    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.get("/", async (req, reply) => {
      const characters = await uc.list.execute(req.session.user!.id);
      return reply.send({ characters });
    });

    app.post("/", async (req, reply) => {
      const input = CreateCharacterInputSchema.parse(req.body);
      const character = await uc.create.execute({
        ownerId: req.session.user!.id,
        input,
      });
      return reply.status(201).send({ character });
    });

    app.post("/roll", async (req, reply) => {
      const { background } = RollBodySchema.parse(req.body);
      const draft = await uc.roll.execute({ background });
      return reply.send({ draft });
    });

    app.get("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const character = await uc.get.execute({ id, ownerId: req.session.user!.id });
      return reply.send({ character });
    });

    app.patch("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdateCharacterInputSchema.parse(req.body);
      const character = await uc.update.execute({
        id,
        ownerId: req.session.user!.id,
        input,
      });
      return reply.send({ character });
    });

    app.delete("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      await uc.remove.execute({ id, ownerId: req.session.user!.id });
      return reply.send({ ok: true });
    });
  };
  return plugin;
}
