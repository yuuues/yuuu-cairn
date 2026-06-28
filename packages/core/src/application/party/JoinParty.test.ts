import { describe, it, expect, beforeEach } from "vitest";
import { JoinParty } from "./JoinParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import type { Party, Character } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "SECRET", items: [], containers: [], events: [], version: 0,
  ...over,
});

const mkChar = (over: Partial<Character> = {}): Character => ({
  id: 0, ownerId: 2, name: "Hero", background: "A", strength: 10, strengthMax: 10,
  dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10, hp: 5, hpMax: 5,
  deprived: false, panicked: false, gold: 0, items: [], containers: [], description: null,
  traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null, imageUrl: null,
  partyId: null, ...over,
});

let parties: InMemoryPartyRepository;
let characters: InMemoryCharacterRepository;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
  characters = new InMemoryCharacterRepository();
});

describe("JoinParty", () => {
  it("añade el personaje a members y el usuario a subowners", async () => {
    const party = await parties.save(mkParty());
    const char = await characters.save(mkChar({ ownerId: 2 }));

    const uc = new JoinParty(parties, characters);
    const updated = await uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 });

    expect(updated.members).toContain(char.id);
    expect(updated.subowners).toContain(2);
  });

  it("joinCode incorrecto lanza invalid_code", async () => {
    const uc = new JoinParty(parties, characters);
    await expect(uc.execute({ joinCode: "WRONG", characterId: 1, userId: 2 }))
      .rejects.toThrow(PartyError);
  });

  it("personaje inexistente o de otro usuario lanza forbidden", async () => {
    const party = await parties.save(mkParty());
    const char = await characters.save(mkChar({ ownerId: 99 }));
    const uc = new JoinParty(parties, characters);
    await expect(uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 }))
      .rejects.toThrow(PartyError);
  });

  it("no añade duplicados: unirse dos veces no duplica members ni subowners", async () => {
    const party = await parties.save(mkParty());
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const uc = new JoinParty(parties, characters);
    await uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 });
    const updated = await uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 });
    expect(updated.members.filter((m) => m === char.id)).toHaveLength(1);
    expect(updated.subowners.filter((s) => s === 2)).toHaveLength(1);
  });
});
