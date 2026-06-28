import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface DeletePartyCommand {
  partyId: number;
  userId: number;
}

export class DeleteParty {
  constructor(private readonly parties: PartyRepository) {}

  async execute(cmd: DeletePartyCommand): Promise<void> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    if (party.ownerId !== cmd.userId) {
      throw new PartyError("forbidden", "Only the owner can delete a party");
    }
    await this.parties.delete(cmd.partyId);
  }
}
