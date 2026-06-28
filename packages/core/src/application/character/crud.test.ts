import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { ListCharacters } from "./ListCharacters.js";
import { GetCharacter } from "./GetCharacter.js";
import { DeleteCharacter } from "./DeleteCharacter.js";
import { CharacterError } from "./errors.js";

const baseChar = (over: Partial<Character>): Character => ({
  id: 0,
  ownerId: 1,
  name: "Hero",
  background: "Aurifex",
  strength: 10,
  strengthMax: 10,
  dexterity: 10,
  dexterityMax: 10,
  willpower: 10,
  willpowerMax: 10,
  hp: 5,
  hpMax: 5,
  deprived: false,
  panicked: false,
  gold: 0,
  items: [],
  containers: [],
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
});

describe("CRUD de personajes", () => {
  let repo: InMemoryCharacterRepository;
  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  it("ListCharacters devuelve solo los del propietario", async () => {
    await repo.save(baseChar({ ownerId: 1, name: "A" }));
    await repo.save(baseChar({ ownerId: 2, name: "B" }));
    const list = await new ListCharacters(repo).execute(1);
    expect(list.map((c) => c.name)).toEqual(["A"]);
  });

  it("GetCharacter devuelve el personaje del propietario", async () => {
    const saved = await repo.save(baseChar({ ownerId: 1 }));
    const got = await new GetCharacter(repo).execute({ id: saved.id, ownerId: 1 });
    expect(got.id).toBe(saved.id);
  });

  it("GetCharacter lanza not_found si el owner no coincide", async () => {
    const saved = await repo.save(baseChar({ ownerId: 1 }));
    await expect(
      new GetCharacter(repo).execute({ id: saved.id, ownerId: 999 })
    ).rejects.toBeInstanceOf(CharacterError);
  });

  it("DeleteCharacter elimina el personaje del propietario", async () => {
    const saved = await repo.save(baseChar({ ownerId: 1 }));
    await new DeleteCharacter(repo).execute({ id: saved.id, ownerId: 1 });
    expect(await repo.findById(saved.id)).toBeNull();
  });

  it("DeleteCharacter lanza not_found si no existe", async () => {
    await expect(
      new DeleteCharacter(repo).execute({ id: 42, ownerId: 1 })
    ).rejects.toBeInstanceOf(CharacterError);
  });
});
