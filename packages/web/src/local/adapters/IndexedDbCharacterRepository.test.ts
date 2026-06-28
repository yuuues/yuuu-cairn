import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { IndexedDbCharacterRepository } from "./IndexedDbCharacterRepository.js";
import { LOCAL_OWNER_ID } from "../owner.js";

function baseCharacter(): Character {
  return {
    id: 0, ownerId: LOCAL_OWNER_ID, name: "Test", background: "foundling",
    strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10,
    willpower: 10, willpowerMax: 10, hp: 4, hpMax: 4, deprived: false,
    panicked: false, gold: 0, items: [], containers: [], description: null,
    traits: null, notes: null, bonds: null, scars: "", omens: null,
    armor: "0", imageUrl: null, partyId: null,
  };
}

describe("IndexedDbCharacterRepository", () => {
  let repo: IndexedDbCharacterRepository;
  beforeEach(async () => {
    indexedDB = new IDBFactory(); // reset entre tests (fake-indexeddb expone IDBFactory global)
    repo = new IndexedDbCharacterRepository("kw-test");
  });

  it("save asigna id autoincremental cuando id=0", async () => {
    const a = await repo.save(baseCharacter());
    const b = await repo.save(baseCharacter());
    expect(a.id).toBeGreaterThan(0);
    expect(b.id).toBe(a.id + 1);
  });

  it("findById recupera el guardado", async () => {
    const a = await repo.save(baseCharacter());
    const found = await repo.findById(a.id);
    expect(found?.name).toBe("Test");
  });

  it("save con id existente actualiza en sitio", async () => {
    const a = await repo.save(baseCharacter());
    await repo.save({ ...a, name: "Renamed" });
    const found = await repo.findById(a.id);
    expect(found?.name).toBe("Renamed");
  });

  it("findByOwner filtra por ownerId", async () => {
    await repo.save(baseCharacter());
    await repo.save({ ...baseCharacter(), ownerId: 999 });
    const mine = await repo.findByOwner(LOCAL_OWNER_ID);
    expect(mine).toHaveLength(1);
  });

  it("delete elimina", async () => {
    const a = await repo.save(baseCharacter());
    await repo.delete(a.id);
    expect(await repo.findById(a.id)).toBeNull();
  });
});
