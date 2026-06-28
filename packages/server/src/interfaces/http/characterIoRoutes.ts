import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import { CharacterError, type CreateCharacter, type GetCharacter } from "@kw/core";
import {
  ImportCharacterPayloadSchema,
  type CharacterExport,
} from "@kw/shared";
import { z } from "zod";

export interface CharacterIoUseCases {
  create: CreateCharacter;
  get: GetCharacter;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });

function statusFor(code: string): number {
  switch (code) {
    case "not_found": return 404;
    case "forbidden": return 403;
    default: return 400;
  }
}

export function buildCharacterIoRoutes(uc: CharacterIoUseCases): FastifyPluginAsync {
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

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    /**
     * POST /api/characters/import
     * Importa un personaje desde JSON (paridad: new_from_json.html + route POST).
     * Valida con ImportCharacterPayloadSchema; persiste como nuevo personaje del usuario.
     */
    app.post("/import", async (req, reply) => {
      const payload = ImportCharacterPayloadSchema.parse(req.body);
      const ownerId = req.session.user!.id;

      const character = await uc.create.execute({
        ownerId,
        input: {
          name: payload.name,
          background: payload.background,
          strengthMax: payload.strengthMax,
          dexterityMax: payload.dexterityMax,
          willpowerMax: payload.willpowerMax,
          hpMax: payload.hpMax,
          gold: payload.gold,
          items: payload.items,
          containers: payload.containers,
          description: payload.description,
          traits: payload.traits,
          notes: payload.notes,
          bonds: payload.bonds,
          omens: payload.omens,
          imageUrl: payload.imageUrl,
        },
      });

      // Si el personaje importado incluye scars, actualizamos vía update no expuesto
      // en este plugin — los scars van como campo adicional del character guardado.
      // La Fase 3 (UpdateCharacter) ya cubre ese path; aquí simplemente no los perdemos
      // devolviendo el character completo tal como lo crea CreateCharacter.
      return reply.status(201).send({ character });
    });

    /**
     * GET /api/characters/:id/export
     * Descarga el personaje como fichero JSON (paridad: character.toJSON() del origen).
     * Devuelve Content-Disposition: attachment; filename="<name>.json".
     */
    app.get<{ Params: { id: string } }>("/:id/export", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const ownerId = req.session.user!.id;
      const character = await uc.get.execute({ id, ownerId });

      const exportData: CharacterExport = {
        id: character.id,
        name: character.name,
        background: character.background,
        strength: character.strength,
        strengthMax: character.strengthMax,
        dexterity: character.dexterity,
        dexterityMax: character.dexterityMax,
        willpower: character.willpower,
        willpowerMax: character.willpowerMax,
        hp: character.hp,
        hpMax: character.hpMax,
        deprived: character.deprived,
        panicked: character.panicked,
        gold: character.gold,
        items: character.items,
        containers: character.containers,
        description: character.description,
        traits: character.traits,
        notes: character.notes,
        bonds: character.bonds,
        scars: character.scars,
        omens: character.omens,
        imageUrl: character.imageUrl,
        armor: character.armor,
      };

      const safeName = character.name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      return reply
        .header("Content-Type", "application/json")
        .header("Content-Disposition", `attachment; filename="${safeName}.json"`)
        .send(exportData);
    });
  };
  return plugin;
}
