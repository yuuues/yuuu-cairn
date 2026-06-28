import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { UpdateInventory } from "./UpdateInventory.js";
import { InventoryError } from "./errors.js";

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Rune",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 5,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

describe("UpdateInventory", () => {
  let repo: InMemoryCharacterRepository;
  let uc: UpdateInventory;
  let charId: number;

  beforeEach(async () => {
    repo = new InMemoryCharacterRepository();
    uc = new UpdateInventory(repo);
    const saved = await repo.save(baseCharacter());
    charId = saved.id;
  });

  it("reemplaza items/containers/gold y recalcula armadura", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: {
        gold: 12,
        items: [{ id: 1, name: "Mail", location: 0, tags: ["2 Armor"] }],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(result.gold).toBe(12);
    expect(result.items).toHaveLength(1);
    expect(result.armor).toBe("2"); // armorValue recalculada
  });

  it("topa la armadura en 3", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: {
        gold: 0,
        items: [
          { id: 1, name: "A", location: 0, tags: ["2 Armor"] },
          { id: 2, name: "B", location: 0, tags: ["2 Armor"] },
        ],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(result.armor).toBe("3");
  });

  it("falla con not_found si el personaje es de otro dueño", async () => {
    await expect(
      uc.execute({
        id: charId,
        ownerId: 999,
        input: { gold: 0, items: [], containers: [] },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
