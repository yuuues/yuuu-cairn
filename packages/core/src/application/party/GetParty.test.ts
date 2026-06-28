import { describe, it, expect, beforeEach } from "vitest";
import { GetParty } from "./GetParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const baseParty = (over: Partial<Party> = {}): Party => ({
  id: 0,
  ownerId: 1,
  name: "Test Party",
  description: null,
  notes: null,
  members: [10],
  subowners: [2],
  joinCode: "ABC123",
  items: [],
  containers: [],
  events: [],
  version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
});

describe("GetParty", () => {
  it("el owner puede leer la partida y recibe el joinCode", async () => {
    const saved = await parties.save(baseParty());
    const uc = new GetParty(parties);
    const result = await uc.execute({ partyId: saved.id, userId: 1 });
    expect(result.party.name).toBe("Test Party");
    expect(result.joinCode).toBe("ABC123");
  });

  it("un subowner puede leer la partida pero no recibe joinCode", async () => {
    const saved = await parties.save(baseParty());
    const uc = new GetParty(parties);
    const result = await uc.execute({ partyId: saved.id, userId: 2 });
    expect(result.party.id).toBe(saved.id);
    expect(result.joinCode).toBeNull();
  });

  it("un usuario sin acceso recibe forbidden", async () => {
    const saved = await parties.save(baseParty());
    const uc = new GetParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99 })).rejects.toThrow(PartyError);
  });

  it("partida inexistente recibe not_found", async () => {
    const uc = new GetParty(parties);
    await expect(uc.execute({ partyId: 999, userId: 1 })).rejects.toThrow(PartyError);
  });
});
