import { describe, it, expect, beforeEach } from "vitest";
import { DeleteParty } from "./DeleteParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [10], subowners: [2], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => { parties = new InMemoryPartyRepository(); });

describe("DeleteParty", () => {
  it("el owner puede borrar la partida", async () => {
    const saved = await parties.save(mkParty());
    const uc = new DeleteParty(parties);
    await uc.execute({ partyId: saved.id, userId: 1 });
    expect(await parties.findById(saved.id)).toBeNull();
  });

  it("un subowner no puede borrar la partida", async () => {
    const saved = await parties.save(mkParty());
    const uc = new DeleteParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 2 })).rejects.toThrow(PartyError);
  });

  it("un extraño recibe forbidden", async () => {
    const saved = await parties.save(mkParty());
    const uc = new DeleteParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99 })).rejects.toThrow(PartyError);
  });

  it("partida inexistente recibe not_found", async () => {
    const uc = new DeleteParty(parties);
    await expect(uc.execute({ partyId: 999, userId: 1 })).rejects.toThrow(PartyError);
  });
});
