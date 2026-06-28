import { describe, it, expect, beforeEach } from "vitest";
import type { Character, MarketItem } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { FakeMarketRepository } from "../../testing/FakeMarketRepository.js";
import { BuyItems } from "./BuyItems.js";
import { InventoryError } from "./errors.js";

const catalog: MarketItem[] = [
  { name: "Torch", category: "Gear", cost: 5, tags: ["uses"], uses: 3 },
  { name: "Rope", category: "Gear", cost: 10, tags: [], description: "50ft" },
  { name: "Mail", category: "Armor", cost: 40, tags: ["2 Armor"] },
];

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
    gold: 100,
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

describe("BuyItems", () => {
  let chars: InMemoryCharacterRepository;
  let market: FakeMarketRepository;
  let uc: BuyItems;
  let charId: number;

  beforeEach(async () => {
    chars = new InMemoryCharacterRepository();
    market = new FakeMarketRepository(catalog);
    uc = new BuyItems(chars, market);
    const saved = await chars.save(baseCharacter());
    charId = saved.id;
  });

  it("añade los items comprados al contenedor y fija el oro", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: { cart: ["Torch", "Rope"], gold: 85, containerId: 0 },
    });
    expect(result.gold).toBe(85);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.name).sort()).toEqual(["Rope", "Torch"]);
    expect(result.items.every((i) => i.location === 0)).toBe(true);
  });

  it("asigna ids incrementales únicos a los items comprados", async () => {
    await chars.save({
      ...(await chars.findById(charId))!,
      items: [{ id: 5, name: "Existing", location: 0, tags: [] }],
    });
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: { cart: ["Rope"], gold: 90, containerId: 0 },
    });
    const bought = result.items.find((i) => i.name === "Rope")!;
    expect(bought.id).toBe(6); // max(5)+1
  });

  it("recalcula la armadura tras comprar armadura", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: { cart: ["Mail"], gold: 60, containerId: 0 },
    });
    expect(result.armor).toBe("2");
  });

  it("falla con not_found si el personaje es de otro dueño", async () => {
    await expect(
      uc.execute({
        id: charId,
        ownerId: 999,
        input: { cart: [], gold: 0, containerId: 0 },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
