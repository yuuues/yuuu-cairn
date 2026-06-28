import { describe, it, expect } from "vitest";
import { FakeGeneratorRepository } from "../../testing/FakeGeneratorRepository.js";
import { SequenceDice } from "../../testing/SequenceDice.js";
import { GenerateNpc } from "./GenerateNpc.js";

const tables = {
  NPCGenerator: {
    NPCNames: { Names: ["Alaric", "Carver", "Lisbeth"] },
    NPCBackgrounds: ["Academic", "Merchant", "Guard"],
    NPCTraits: {
      Virtues: ["Cautious", "Courageous"],
      Vices: ["Corrupt", "Craven"],
    },
    NPCQuirks: ["Alert", "Bald", "Gaunt"],
    NPCGoals: { Goals: ["Ascension", "Freedom", "Wealth"] },
  },
};

describe("GenerateNpc", () => {
  it("genera un NPC con todos los campos usando la secuencia de dice", async () => {
    const repo = new FakeGeneratorRepository(tables);
    // picks: nombre=1(Alaric), bg=2(Merchant), virtud=1(Cautious), vicio=2(Craven), quirk=3(Gaunt), goal=1(Ascension)
    const dice = new SequenceDice([1, 2, 1, 2, 3, 1]);
    const uc = new GenerateNpc(repo, dice);
    const result = await uc.execute();
    expect(result.name).toBe("Alaric");
    expect(result.background).toBe("Merchant");
    expect(result.virtue).toBe("Cautious");
    expect(result.vice).toBe("Craven");
    expect(result.quirk).toBe("Gaunt");
    expect(result.goal).toBe("Ascension");
  });

  it("lanza GeneratorError si NPCGenerator no existe en los datos", async () => {
    const repo = new FakeGeneratorRepository({});
    const dice = new SequenceDice([1]);
    const uc = new GenerateNpc(repo, dice);
    await expect(uc.execute()).rejects.toThrow("NPCGenerator");
  });
});
