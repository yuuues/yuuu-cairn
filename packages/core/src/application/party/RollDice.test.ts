import { describe, it, expect, beforeEach } from "vitest";
import type { Character, Party } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { DomainEvent } from "../../ports/driven/EventPublisher.js";
import { RollDice } from "./RollDice.js";
import { PartyError } from "./errors.js";

class RecordingPublisher {
  public calls: Array<{ partyId: number; event: DomainEvent }> = [];
  async publishToParty(partyId: number, event: DomainEvent): Promise<void> {
    this.calls.push({ partyId, event });
  }
}

const baseChar = (over: Partial<Character>): Character => ({
  id: 1, ownerId: 1, name: "Hero", background: "A",
  strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
  hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
  description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
  imageUrl: null, partyId: null, ...over,
});

const baseParty = (over: Partial<Party>): Party => ({
  id: 1, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "CODE", items: [], containers: [], events: [], version: 0,
  ...over,
});

describe("RollDice", () => {
  let characters: InMemoryCharacterRepository;
  let parties: InMemoryPartyRepository;
  let publisher: RecordingPublisher;
  let rollDice: RollDice;

  beforeEach(() => {
    characters = new InMemoryCharacterRepository();
    parties = new InMemoryPartyRepository();
    publisher = new RecordingPublisher();
    rollDice = new RollDice(characters, parties, publisher);
  });

  it("publica dice_rolled a la sala con el mensaje formateado", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 1, name: "Aldric" }));
    const party = await parties.save(baseParty({ id: 0, ownerId: 1, members: [char.id] }));

    await rollDice.execute({ userId: 1, characterId: char.id, partyId: party.id, roll: "7 (d8)" });

    expect(publisher.calls).toHaveLength(1);
    expect(publisher.calls[0]!.partyId).toBe(party.id);
    expect(publisher.calls[0]!.event).toEqual({
      type: "dice_rolled",
      payload: "Aldric rolled a 7 (d8)",
    });
  });

  it("falla si el personaje no existe", async () => {
    const party = await parties.save(baseParty({ id: 0, members: [99] }));
    await expect(
      rollDice.execute({ userId: 1, characterId: 99, partyId: party.id, roll: "3" })
    ).rejects.toBeInstanceOf(PartyError);
    expect(publisher.calls).toHaveLength(0);
  });

  it("falla si el usuario no es dueño del personaje", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 2, name: "X" }));
    const party = await parties.save(baseParty({ id: 0, members: [char.id] }));
    await expect(
      rollDice.execute({ userId: 1, characterId: char.id, partyId: party.id, roll: "3" })
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(publisher.calls).toHaveLength(0);
  });

  it("falla si la partida no existe", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 1 }));
    await expect(
      rollDice.execute({ userId: 1, characterId: char.id, partyId: 999, roll: "3" })
    ).rejects.toMatchObject({ code: "not_found" });
    expect(publisher.calls).toHaveLength(0);
  });

  it("falla si el personaje no es miembro de la partida", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 1 }));
    const party = await parties.save(baseParty({ id: 0, ownerId: 1, members: [] }));
    await expect(
      rollDice.execute({ userId: 1, characterId: char.id, partyId: party.id, roll: "3" })
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(publisher.calls).toHaveLength(0);
  });
});
