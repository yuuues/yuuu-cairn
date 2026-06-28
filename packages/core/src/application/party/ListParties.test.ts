import { describe, it, expect, beforeEach } from "vitest";
import { ListParties } from "./ListParties.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0,
  ownerId: 1,
  name: "P",
  description: null,
  notes: null,
  members: [],
  subowners: [],
  joinCode: "X",
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

describe("ListParties", () => {
  it("devuelve las partidas donde el usuario es owner", async () => {
    await parties.save(mkParty({ ownerId: 1, joinCode: "A" }));
    await parties.save(mkParty({ ownerId: 2, joinCode: "B" }));
    const uc = new ListParties(parties);
    const result = await uc.execute(1);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerId).toBe(1);
  });

  it("devuelve también las partidas donde el usuario es miembro (subowner)", async () => {
    await parties.save(mkParty({ ownerId: 2, subowners: [1], joinCode: "C" }));
    const uc = new ListParties(parties);
    const result = await uc.execute(1);
    expect(result).toHaveLength(1);
  });

  it("lista vacía si no hay partidas del usuario", async () => {
    await parties.save(mkParty({ ownerId: 2, joinCode: "D" }));
    const uc = new ListParties(parties);
    expect(await uc.execute(1)).toHaveLength(0);
  });
});
