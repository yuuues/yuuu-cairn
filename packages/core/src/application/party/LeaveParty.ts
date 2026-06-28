import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { PartyError } from "./errors.js";

export interface LeavePartyCommand {
  partyId: number;
  characterId: number;
  /** userId del que hace la petición (owner de la partida O dueño del personaje) */
  requesterId: number;
}

export class LeaveParty {
  constructor(
    private readonly parties: PartyRepository,
    private readonly characters: CharacterRepository
  ) {}

  async execute(cmd: LeavePartyCommand): Promise<Party> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }

    const character = await this.characters.findById(cmd.characterId);
    const characterOwnerId = character?.ownerId;

    // Solo puede expulsar el owner de la partida o el dueño del personaje
    const isPartyOwner = party.ownerId === cmd.requesterId;
    const isCharacterOwner = characterOwnerId === cmd.requesterId;
    if (!isPartyOwner && !isCharacterOwner) {
      throw new PartyError("forbidden", "Access denied");
    }

    const members = party.members.filter((m) => m !== cmd.characterId);

    // Comprobar si el usuario aún tiene otros personajes en la partida
    let subowners = party.subowners;
    if (characterOwnerId !== undefined) {
      const remainingMemberIds = await Promise.all(
        members.map(async (memberId) => {
          const c = await this.characters.findById(memberId);
          return c?.ownerId === characterOwnerId ? memberId : null;
        })
      );
      const hasOtherCharacters = remainingMemberIds.some((id) => id !== null);
      if (!hasOtherCharacters) {
        subowners = party.subowners.filter((s) => s !== characterOwnerId);
      }
    }

    const updated: Party = { ...party, members, subowners };
    return this.parties.save(updated);
  }
}
