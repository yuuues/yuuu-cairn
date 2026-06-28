import { describe, it, expect, beforeEach } from "vitest";
import { LeaveParty } from "./LeaveParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import type { Party, Character } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});
const mkChar = (over: Partial<Character> = {}): Character => ({
  id: 0, ownerId: 2, name: "H", background: "A", strength: 10, strengthMax: 10,
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

describe("LeaveParty", () => {
  it("elimina el personaje de members y al usuario de subowners si era su único personaje", async () => {
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    const updated = await uc.execute({ partyId: party.id, characterId: char.id, requesterId: 1 });
    expect(updated.members).not.toContain(char.id);
    expect(updated.subowners).not.toContain(2);
  });

  it("mantiene al usuario en subowners si tiene otro personaje en la partida", async () => {
    const char1 = await characters.save(mkChar({ ownerId: 2 }));
    const char2 = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char1.id, char2.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    const updated = await uc.execute({ partyId: party.id, characterId: char1.id, requesterId: 1 });
    expect(updated.members).not.toContain(char1.id);
    expect(updated.subowners).toContain(2);
  });

  it("el dueño del personaje puede expulsarse a sí mismo", async () => {
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    const updated = await uc.execute({ partyId: party.id, characterId: char.id, requesterId: 2 });
    expect(updated.members).not.toContain(char.id);
  });

  it("un extraño no puede expulsar a otros", async () => {
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    await expect(uc.execute({ partyId: party.id, characterId: char.id, requesterId: 99 }))
      .rejects.toThrow(PartyError);
  });

  it("partida inexistente lanza not_found", async () => {
    const uc = new LeaveParty(parties, characters);
    await expect(uc.execute({ partyId: 999, characterId: 1, requesterId: 1 }))
      .rejects.toThrow(PartyError);
  });
});
