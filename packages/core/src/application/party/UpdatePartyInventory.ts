import type { Party, UpdatePartyInventoryInput } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface UpdatePartyInventoryCommand {
  partyId: number;
  userId: number;
  input: UpdatePartyInventoryInput;
}

export class UpdatePartyInventory {
  constructor(private readonly parties: PartyRepository) {}

  async execute(cmd: UpdatePartyInventoryCommand): Promise<Party> {
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
      items: cmd.input.items,
      containers: cmd.input.containers,
    };
    return this.parties.save(updated);
  }
}
