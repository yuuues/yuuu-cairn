import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { GeneratorTables } from "@kw/shared";
import type { GeneratorRepository } from "@kw/core";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export class FileGeneratorRepository implements GeneratorRepository {
  private _tables: GeneratorTables | null = null;

  constructor(private readonly dataDir: string) {}

  /**
   * Consolida data/generators/*.json en un único mapa (paridad consolidate_json_files).
   * Lee los ficheros en orden alfabético y hace Object.assign sobre el resultado.
   */
  tables(): GeneratorTables {
    if (this._tables) return this._tables;
    const dir = join(this.dataDir, "generators");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    const merged: Record<string, unknown> = {};
    for (const f of files) {
      const data = readJson(join(dir, f));
      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.assign(merged, data as Record<string, unknown>);
      }
    }
    this._tables = merged;
    return this._tables;
  }
}
