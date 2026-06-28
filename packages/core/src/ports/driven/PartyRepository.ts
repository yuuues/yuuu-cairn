import type { Party } from "@kw/shared";

export interface PartyRepository {
  findById(id: number): Promise<Party | null>;
  findByJoinCode(joinCode: string): Promise<Party | null>;
  findByMember(userId: number): Promise<Party[]>;
  save(party: Party): Promise<Party>;
  delete(id: number): Promise<void>;
}
