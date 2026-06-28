import type { GeneratorTables } from "@kw/shared";

/**
 * Puerto driven: datos de generadores de tablas aleatorias.
 * Paridad: consolidate_json_files sobre data/generators/*.json.
 */
export interface GeneratorRepository {
  /** Mapa completo nombre→valor cargado de data/generators/*.json. */
  tables(): GeneratorTables;
}
