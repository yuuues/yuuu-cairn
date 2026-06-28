import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { TransferItem } from "./TransferItem.js";
import { InventoryError } from "./errors.js";

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Char",
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
    gold: 0,
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

describe("TransferItem", () => {
  let repo: InMemoryCharacterRepository;
  let uc: TransferItem;
  let fromId: number;
  let toId: number;

  beforeEach(async () => {
    repo = new InMemoryCharacterRepository();
    uc = new TransferItem(repo);
    const from = await repo.save(
      baseCharacter({
        ownerId: 1,
        items: [{ id: 7, name: "Sword", location: 0, tags: [] }],
      })
    );
    const to = await repo.save(
      baseCharacter({
        ownerId: 2,
        items: [{ id: 3, name: "Shield", location: 0, tags: ["1 Armor"] }],
      })
    );
    fromId = from.id;
    toId = to.id;
  });

  it("mueve el item al contenedor principal del destino con id nuevo", async () => {
    await uc.execute({
      ownerId: 1,
      fromCharacterId: fromId,
      input: { itemId: 7, toCharacterId: toId },
    });

    const from = await repo.findById(fromId);
    const to = await repo.findById(toId);
    expect(from!.items).toHaveLength(0);
    expect(to!.items).toHaveLength(2);
    const moved = to!.items.find((i) => i.name === "Sword")!;
    expect(moved.location).toBe(0);
    expect(moved.id).toBe(4); // max(3)+1
  });

  it("recalcula la armadura del destino si el item movido aporta armadura", async () => {
    await repo.save({
      ...(await repo.findById(fromId))!,
      items: [{ id: 7, name: "Plate", location: 0, tags: ["3 Armor"] }],
    });
    await uc.execute({
      ownerId: 1,
      fromCharacterId: fromId,
      input: { itemId: 7, toCharacterId: toId },
    });
    const to = await repo.findById(toId);
    expect(to!.armor).toBe("3"); // 1 (Shield) + 3 (Plate) topado a 3
  });

  it("falla con not_found si el origen no es del dueño", async () => {
    await expect(
      uc.execute({
        ownerId: 999,
        fromCharacterId: fromId,
        input: { itemId: 7, toCharacterId: toId },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });

  it("falla con not_found si el item no existe en el origen", async () => {
    await expect(
      uc.execute({
        ownerId: 1,
        fromCharacterId: fromId,
        input: { itemId: 999, toCharacterId: toId },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
