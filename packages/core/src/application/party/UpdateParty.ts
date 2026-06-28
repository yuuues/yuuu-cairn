import type { Party, UpdatePartyInput } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface UpdatePartyCommand {
  partyId: number;
  userId: number;
  input: UpdatePartyInput;
}

export class UpdateParty {
  constructor(private readonly parties: PartyRepository) {}

  async execute(cmd: UpdatePartyCommand): Promise<Party> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    const isOwner = party.ownerId === cmd.userId;
    const isSubowner = party.subowners.includes(cmd.userId);
    if (!isOwner && !isSubowner) {
      throw new PartyError("forbidden", "Access denied");
    }
    const updated: Party = {
      ...party,
      name: cmd.input.name ?? party.name,
      description: cmd.input.description !== undefined ? cmd.input.description : party.description,
      notes: cmd.input.notes !== undefined ? cmd.input.notes : party.notes,
    };
    return this.parties.save(updated);
  }
}
