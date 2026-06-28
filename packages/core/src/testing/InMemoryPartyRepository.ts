import type { Party } from "@kw/shared";
import type { PartyRepository } from "../ports/driven/PartyRepository.js";

export class InMemoryPartyRepository implements PartyRepository {
  private parties = new Map<number, Party>();
  private seq = 0;

  async findById(id: number): Promise<Party | null> {
    return this.parties.get(id) ?? null;
  }

  async findByJoinCode(joinCode: string): Promise<Party | null> {
    for (const p of this.parties.values()) {
      if (p.joinCode === joinCode) return p;
    }
    return null;
  }

  async findByMember(userId: number): Promise<Party[]> {
    return [...this.parties.values()].filter(
      (p) => p.ownerId === userId || p.members.includes(userId)
    );
  }

  async save(party: Party): Promise<Party> {
    let record = party;
    if (record.id === 0) {
      record = { ...record, id: ++this.seq };
    }
    this.parties.set(record.id, record);
    return record;
  }

  async delete(id: number): Promise<void> {
    this.parties.delete(id);
  }
}
