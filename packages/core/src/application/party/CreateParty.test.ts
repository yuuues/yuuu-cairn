import { describe, it, expect, beforeEach } from "vitest";
import { CreateParty } from "./CreateParty.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import { FakeIdGenerator } from "../../testing/FakeIdGenerator.js";

let parties: InMemoryPartyRepository;
let idGen: FakeIdGenerator;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
  idGen = new FakeIdGenerator();
});

describe("CreateParty", () => {
  it("crea una partida con joinCode generado e ownerId correcto", async () => {
    const uc = new CreateParty(parties, idGen);
    const party = await uc.execute({
      ownerId: 1,
      input: { name: "Los Exploradores", description: "Una partida de prueba", notes: null },
    });

    expect(party.id).toBeGreaterThan(0);
    expect(party.ownerId).toBe(1);
    expect(party.name).toBe("Los Exploradores");
    expect(party.description).toBe("Una partida de prueba");
    expect(party.joinCode).toBe("CODE1");
    expect(party.members).toEqual([]);
    expect(party.subowners).toEqual([]);
    expect(party.items).toEqual([]);
    expect(party.containers).toEqual([]);
    expect(party.events).toEqual([]);
    expect(party.version).toBe(0);
  });

  it("genera joinCodes únicos en llamadas sucesivas", async () => {
    const uc = new CreateParty(parties, idGen);
    const p1 = await uc.execute({ ownerId: 1, input: { name: "P1", description: null, notes: null } });
    const p2 = await uc.execute({ ownerId: 1, input: { name: "P2", description: null, notes: null } });
    expect(p1.joinCode).not.toBe(p2.joinCode);
  });
});
