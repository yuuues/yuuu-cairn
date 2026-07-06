import type { GeneratorTables } from "@kw/shared";
import type { GeneratorRepository } from "@kw/core";
import { GAME_DATA } from "./bundle.generated.js";

/**
 * Puerto de generadores servido desde el bundle local (paridad con
 * FileGeneratorRepository del servidor, que consolida data/generators/*.json).
 * Permite que las tablas y el generador de NPC funcionen sin servidor (APK).
 */
export class BundledGeneratorRepository implements GeneratorRepository {
  tables(): GeneratorTables {
    return GAME_DATA.generators as GeneratorTables;
  }
}
