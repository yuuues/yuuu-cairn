import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface GetPartyQuery {
  partyId: number;
  userId: number;
}

export interface GetPartyResult {
  party: Party;
  joinCode: string | null;
}

export class GetParty {
  constructor(private readonly parties: PartyRepository) {}

  async execute(query: GetPartyQuery): Promise<GetPartyResult> {
    const party = await this.parties.findById(query.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    const isOwner = party.ownerId === query.userId;
    const isSubowner = party.subowners.includes(query.userId);
    if (!isOwner && !isSubowner) {
      throw new PartyError("forbidden", "Access denied");
    }
    return {
      party,
      joinCode: isOwner ? party.joinCode : null,
    };
  }
}
