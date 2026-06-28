import { describe, it, expect } from "vitest";
import { RollDiceInputSchema } from "./realtimeIo.js";

describe("RollDiceInputSchema", () => {
  it("acepta un payload válido", () => {
    const parsed = RollDiceInputSchema.parse({
      characterId: 3,
      partyId: 7,
      roll: "7 (d8)",
    });
    expect(parsed).toEqual({ characterId: 3, partyId: 7, roll: "7 (d8)" });
  });

  it("coacciona ids numéricos en string", () => {
    const parsed = RollDiceInputSchema.parse({
      characterId: "3",
      partyId: "7",
      roll: "20",
    });
    expect(parsed.characterId).toBe(3);
    expect(parsed.partyId).toBe(7);
  });

  it("rechaza roll vacío", () => {
    expect(() => RollDiceInputSchema.parse({ characterId: 1, partyId: 1, roll: "" })).toThrow();
  });

  it("rechaza falta de campos", () => {
    expect(() => RollDiceInputSchema.parse({ characterId: 1 })).toThrow();
  });
});
