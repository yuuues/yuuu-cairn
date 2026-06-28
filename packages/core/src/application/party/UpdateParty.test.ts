import { describe, it, expect, beforeEach } from "vitest";
import { UpdateParty } from "./UpdateParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "Old Name", description: "Old desc", notes: null,
  members: [], subowners: [2], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => { parties = new InMemoryPartyRepository(); });

describe("UpdateParty", () => {
  it("el owner puede actualizar nombre y descripción", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdateParty(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 1,
      input: { name: "New Name", description: "New desc" },
    });
    expect(updated.name).toBe("New Name");
    expect(updated.description).toBe("New desc");
  });

  it("un subowner puede actualizar la partida", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdateParty(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 2,
      input: { name: "Subowner Edit" },
    });
    expect(updated.name).toBe("Subowner Edit");
  });

  it("un extraño recibe forbidden", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdateParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99, input: { name: "X" } }))
      .rejects.toThrow(PartyError);
  });

  it("partida inexistente recibe not_found", async () => {
    const uc = new UpdateParty(parties);
    await expect(uc.execute({ partyId: 999, userId: 1, input: { name: "X" } }))
      .rejects.toThrow(PartyError);
  });

  it("los campos no incluidos en input no cambian", async () => {
    const saved = await parties.save(mkParty({ notes: "keep me" }));
    const uc = new UpdateParty(parties);
    const updated = await uc.execute({ partyId: saved.id, userId: 1, input: { name: "X" } });
    expect(updated.notes).toBe("keep me");
  });
});
