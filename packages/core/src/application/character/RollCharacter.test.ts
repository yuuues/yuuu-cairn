import { describe, it, expect } from "vitest";
import type { Backgrounds, Bond, Traits } from "@kw/shared";
import { FakeGameDataRepository } from "../../testing/FakeGameDataRepository.js";
import { SequenceDice } from "../../testing/SequenceDice.js";
import { RollCharacter } from "./RollCharacter.js";

const backgrounds: Backgrounds = {
  Aurifex: {
    background_description: "An artisan of the arcane.",
    names: ["Hestia", "Basil"],
    starting_gear: [{ name: "Lantern", tags: [] }],
    starting_containers: [{ name: "Sack", slots: 6 }],
    table1: {
      question: "What went wrong?",
      options: [
        { description: "Explosion.", items: [{ name: "Snuff", tags: ["uses"] }] },
        { description: "Pet lost." },
      ],
    },
    table2: {
      question: "What marvel?",
      options: [
        { description: "Gel.", items: [{ name: "Gel", tags: [] }] },
        { description: "Sphere." },
      ],
    },
  },
};

const bonds: Bond[] = [
  { description: "A gem.", gold: 5, items: [{ name: "Gem", tags: [] }] },
  { description: "A debt." },
];

const omens: string[] = ["The river runs black.", "A star falls."];

const traits: Traits = {
  Physique: ["Athletic", "Brawny"],
  Skin: ["Tanned", "Pale"],
  Hair: ["Braided", "Bald"],
  Face: ["Broken", "Soft"],
  Speech: ["Booming", "Quiet"],
  Clothing: ["Antique", "Fine"],
  Virtue: ["Ambitious", "Loyal"],
  Vice: ["Aggressive", "Greedy"],
};

describe("RollCharacter", () => {
  it("genera un personaje completo de forma determinista", async () => {
    const data = new FakeGameDataRepository({ backgrounds, bonds, omens, traits });
    // Secuencia de tiradas en el orden en que el caso de uso las consume.
    // Ver implementación: background pick, name pick, table1 pick, table2 pick,
    // bond pick, omen pick, 8 traits picks, gold 3d6, age 2d20, str 3d6, dex 3d6,
    // wil 3d6, hp 1d6.
    const dice = new SequenceDice([
      1, // pick background -> Aurifex
      1, // pick name -> Hestia
      1, // pick table1 option -> Explosion (items Snuff)
      1, // pick table2 option -> Gel
      1, // pick bond -> A gem (gold 5, item Gem)
      1, // pick omen -> river
      1, 1, 1, 1, 1, 1, 1, 1, // 8 traits
      2, 2, 2, // gold 3d6 = 6
      5, 5, // age 2d20 = 10 -> +10 = 20
      3, 3, 3, // str 3d6 = 9
      4, 4, 4, // dex = 12
      2, 2, 2, // wil = 6
      6, // hp 1d6 = 6
    ]);

    const result = await new RollCharacter(data, dice).execute({ background: "" });

    expect(result.background).toBe("Aurifex");
    expect(result.name).toBe("Hestia");
    expect(result.strengthMax).toBe(9);
    expect(result.dexterityMax).toBe(12);
    expect(result.willpowerMax).toBe(6);
    expect(result.hpMax).toBe(6);
    expect(result.gold).toBe(6 + 5); // 3d6 + gold del vínculo
    expect(result.bonds).toBe("A gem.");
    expect(result.omens).toBe("The river runs black.");
    // items: gear (Lantern) + table1 (Snuff) + table2 (Gel) + bond (Gem)
    expect(result.items.map((i) => i.name)).toEqual(["Lantern", "Snuff", "Gel", "Gem"]);
    expect(result.items.map((i) => i.id)).toEqual([1, 2, 3, 4]);
    // containers: Main + Sack
    expect(result.containers.map((c) => c.name)).toEqual(["Main", "Sack"]);
    expect(result.traits).toContain("years old");
  });

  it("usa el trasfondo indicado si se pasa uno", async () => {
    const data = new FakeGameDataRepository({ backgrounds, bonds, omens, traits });
    const dice = new SequenceDice([
      1, // name
      1, 1, // table1, table2
      1, // bond
      1, // omen
      1, 1, 1, 1, 1, 1, 1, 1, // traits
      1, 1, 1, // gold
      1, 1, // age
      1, 1, 1, // str
      1, 1, 1, // dex
      1, 1, 1, // wil
      1, // hp
    ]);
    const result = await new RollCharacter(data, dice).execute({ background: "Aurifex" });
    expect(result.background).toBe("Aurifex");
  });
});
