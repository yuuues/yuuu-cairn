import { describe, it, expect } from "vitest";
import { FakeGeneratorRepository } from "../../testing/FakeGeneratorRepository.js";
import { SequenceDice } from "../../testing/SequenceDice.js";
import { RollTable } from "./RollTable.js";
import { GeneratorError } from "./errors.js";

const tables = {
  Reactions: ["Hostile", "Wary", "Curious", "Kind", "Helpful"],
  Dungeon: {
    Purpose: ["Burial Site", "Forge", "Hideout"],
    Construction: ["Stone", "Wood", "Bone"],
  },
  NPCGenerator: {
    NPCNames: { Names: ["Alaric", "Carver", "Lisbeth"] },
  },
};

describe("RollTable", () => {
  it("tira en un array raíz y devuelve el elemento elegido", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([2]); // pick index 1 → "Wary"
    const uc = new RollTable(repo, dice);
    const result = await uc.execute({ category: "Reactions", subcategory: null });
    expect(result.category).toBe("Reactions");
    expect(result.subcategory).toBeNull();
    expect(result.result).toBe("Wary");
  });

  it("tira en una subcategoría (array) y devuelve un elemento", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([3]); // pick index 2 → "Hideout"
    const uc = new RollTable(repo, dice);
    const result = await uc.execute({ category: "Dungeon", subcategory: "Purpose" });
    expect(result.subcategory).toBe("Purpose");
    expect(result.result).toBe("Hideout");
  });

  it("tira en un objeto raíz sin subcategoría: elige clave aleatoria", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([1]); // primera clave → "Purpose"
    const uc = new RollTable(repo, dice);
    const result = await uc.execute({ category: "Dungeon", subcategory: null });
    expect(result.result).toBeTruthy();
  });

  it("lanza GeneratorError si la categoría no existe", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([1]);
    const uc = new RollTable(repo, dice);
    await expect(
      uc.execute({ category: "NonExistent", subcategory: null })
    ).rejects.toThrow(GeneratorError);
  });

  it("lanza GeneratorError si la subcategoría no existe", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([1]);
    const uc = new RollTable(repo, dice);
    await expect(
      uc.execute({ category: "Dungeon", subcategory: "NoSub" })
    ).rejects.toThrow(GeneratorError);
  });
});
