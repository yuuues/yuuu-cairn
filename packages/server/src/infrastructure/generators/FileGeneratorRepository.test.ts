import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FileGeneratorRepository } from "./FileGeneratorRepository.js";

const dataDir = resolve(fileURLToPath(import.meta.url), "../../../../../../data");

describe("FileGeneratorRepository", () => {
  it("carga los generadores desde data/generators/ y expone keys de nivel raíz", () => {
    const repo = new FileGeneratorRepository(dataDir);
    const tables = repo.tables();
    expect(typeof tables).toBe("object");
    // Claves que existen en los ficheros copiados (Fase 1)
    expect(tables["NPCGenerator"]).toBeDefined();
    expect(tables["Reactions"]).toBeDefined();
    expect(tables["Dungeon"]).toBeDefined();
  });

  it("cachea la carga (mismo objeto en dos llamadas)", () => {
    const repo = new FileGeneratorRepository(dataDir);
    expect(repo.tables()).toBe(repo.tables());
  });
});
