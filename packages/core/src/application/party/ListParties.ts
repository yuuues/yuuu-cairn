import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";

export class ListParties {
  constructor(private readonly parties: PartyRepository) {}

  async execute(userId: number): Promise<Party[]> {
    return this.parties.findByMember(userId);
  }
}
