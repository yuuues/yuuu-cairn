import { describe, it, expect, beforeEach } from "vitest";
import type { Item } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { CreateCharacter } from "./CreateCharacter.js";
import { UpdateCharacter } from "./UpdateCharacter.js";
import { CharacterError } from "./errors.js";

const armorItem = (id: number): Item => ({
  id,
  name: "Mail",
  location: 0,
  tags: ["2 Armor"],
});

describe("CreateCharacter", () => {
  let repo: InMemoryCharacterRepository;
  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  it("crea con hp=hpMax, atributos = max, armor calculado y owner asignado", async () => {
    const created = await new CreateCharacter(repo).execute({
      ownerId: 7,
      input: {
        name: "Rune",
        background: "Aurifex",
        strengthMax: 12,
        dexterityMax: 11,
        willpowerMax: 9,
        hpMax: 4,
        gold: 5,
        items: [armorItem(1)],
        containers: [{ id: 0, name: "Main", slots: 10 }],
        description: null,
        traits: null,
        notes: null,
        bonds: null,
        omens: null,
        imageUrl: null,
      },
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.ownerId).toBe(7);
    expect(created.hp).toBe(4);
    expect(created.strength).toBe(12);
    expect(created.strengthMax).toBe(12);
    expect(created.deprived).toBe(false);
    expect(created.panicked).toBe(false);
    expect(created.armor).toBe("2");
    expect(created.scars).toBe("");
  });
});

describe("UpdateCharacter", () => {
  let repo: InMemoryCharacterRepository;
  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  async function seed() {
    return new CreateCharacter(repo).execute({
      ownerId: 1,
      input: {
        name: "Rune",
        background: "Aurifex",
        strengthMax: 10,
        dexterityMax: 10,
        willpowerMax: 10,
        hpMax: 6,
        gold: 0,
        items: [],
        containers: [{ id: 0, name: "Main", slots: 10 }],
        description: null,
        traits: null,
        notes: null,
        bonds: null,
        omens: null,
        imageUrl: null,
      },
    });
  }

  it("aplica campos parciales", async () => {
    const c = await seed();
    const updated = await new UpdateCharacter(repo).execute({
      id: c.id,
      ownerId: 1,
      input: { hp: 3, gold: 42, notes: "hola" },
    });
    expect(updated.hp).toBe(3);
    expect(updated.gold).toBe(42);
    expect(updated.notes).toBe("hola");
    expect(updated.name).toBe("Rune"); // sin tocar
  });

  it("recalcula armor cuando llegan items", async () => {
    const c = await seed();
    const updated = await new UpdateCharacter(repo).execute({
      id: c.id,
      ownerId: 1,
      input: { items: [armorItem(1)] },
    });
    expect(updated.armor).toBe("2");
  });

  it("lanza not_found si el owner no coincide", async () => {
    const c = await seed();
    await expect(
      new UpdateCharacter(repo).execute({ id: c.id, ownerId: 999, input: { hp: 1 } })
    ).rejects.toBeInstanceOf(CharacterError);
  });
});
