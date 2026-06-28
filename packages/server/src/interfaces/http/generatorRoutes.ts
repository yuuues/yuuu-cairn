import type { FastifyPluginAsync } from "fastify";
import { GeneratorError, type RollTable, type GenerateNpc } from "@kw/core";
import type { GeneratorRepository } from "@kw/core";
import { RollTableInputSchema } from "@kw/shared";

export interface GeneratorUseCases {
  rollTable: RollTable;
  generateNpc: GenerateNpc;
  tables: GeneratorRepository;
}

export function buildGeneratorRoutes(uc: GeneratorUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof GeneratorError) {
        const status = err.code === "table_not_found" || err.code === "subcategory_not_found"
          ? 404
          : 400;
        return reply.status(status).send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply
          .status(400)
          .send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    /**
     * GET /api/generators/tables
     * Devuelve el mapa completo de generadores (paridad: events_data en tools.html).
     * Sin autenticación (paridad: blueprint generator sin @login_required).
     */
    app.get("/tables", async (_req, reply) => {
      return reply.send({ tables: uc.tables.tables() });
    });

    /**
     * POST /api/generators/roll
     * Body: { category: string, subcategory: string | null }
     * Paridad: /gen/character y la lógica JS de tools.js (roll button → roll_list).
     */
    app.post("/roll", async (req, reply) => {
      const input = RollTableInputSchema.parse(req.body);
      const result = await uc.rollTable.execute(input);
      return reply.send({ result });
    });

    /**
     * POST /api/generators/npc
     * Genera un NPC completo (nombre, trasfondo, virtud, vicio, rasgo, meta).
     * Paridad: NPCGenerator en tools.js del origen.
     */
    app.post("/npc", async (_req, reply) => {
      const npc = await uc.generateNpc.execute();
      return reply.send({ npc });
    });

    /**
     * POST /api/generators/character
     * Genera un personaje completo sin autenticación.
     * Paridad: /gen/character del blueprint generator.py (output=json).
     * Reutiliza el caso de uso RollCharacter ya existente (Fase 3),
     * inyectado aquí por referencia desde el composition root.
     */
  };
  return plugin;
}
