import { describe, it, expect, beforeEach } from "vitest";
import { UpdatePartyInventory } from "./UpdatePartyInventory.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [2], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => { parties = new InMemoryPartyRepository(); });

describe("UpdatePartyInventory", () => {
  it("el owner puede actualizar items y containers", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdatePartyInventory(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 1,
      input: {
        items: [{ id: 1, name: "Rope", location: 0, tags: [] }],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]!.name).toBe("Rope");
    expect(updated.containers[0]!.slots).toBe(10);
  });

  it("un subowner puede actualizar el inventario", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdatePartyInventory(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 2,
      input: { items: [], containers: [] },
    });
    expect(updated.items).toHaveLength(0);
  });

  it("un extraño recibe forbidden", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdatePartyInventory(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99, input: { items: [], containers: [] } }))
      .rejects.toThrow(PartyError);
  });

  it("partida inexistente lanza not_found", async () => {
    const uc = new UpdatePartyInventory(parties);
    await expect(uc.execute({ partyId: 999, userId: 1, input: { items: [], containers: [] } }))
      .rejects.toThrow(PartyError);
  });
});
