import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { PartyError } from "./errors.js";

export interface JoinPartyCommand {
  joinCode: string;
  characterId: number;
  userId: number;
}

export class JoinParty {
  constructor(
    private readonly parties: PartyRepository,
    private readonly characters: CharacterRepository
  ) {}

  async execute(cmd: JoinPartyCommand): Promise<Party> {
    const party = await this.parties.findByJoinCode(cmd.joinCode);
    if (!party) {
      throw new PartyError("invalid_code", "Invalid join code");
    }

    const character = await this.characters.findById(cmd.characterId);
    if (!character || character.ownerId !== cmd.userId) {
      throw new PartyError("forbidden", "Character not found or does not belong to user");
    }

    const members = party.members.includes(cmd.characterId)
      ? party.members
      : [...party.members, cmd.characterId];

    const subowners = party.subowners.includes(cmd.userId)
      ? party.subowners
      : [...party.subowners, cmd.userId];

    const updated: Party = { ...party, members, subowners };
    return this.parties.save(updated);
  }
}
