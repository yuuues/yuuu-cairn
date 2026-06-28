import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { EventPublisher } from "../../ports/driven/EventPublisher.js";
import { PartyError } from "./errors.js";

export interface RollDiceCommand {
  userId: number;
  characterId: number;
  partyId: number;
  /** Texto del resultado ya formateado por el cliente (p.ej. "7 (d8)"). */
  roll: string;
}

/**
 * Tirada de dados compartida en la sala de la partida.
 * Paridad con `handle_roll_dice` (app/socket_events.py): valida pertenencia y
 * publica el evento de dominio `dice_rolled` con el mensaje
 * "{character.name} rolled a {roll}".
 */
export class RollDice {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly parties: PartyRepository,
    private readonly publisher: EventPublisher
  ) {}

  async execute(cmd: RollDiceCommand): Promise<void> {
    const character = await this.characters.findById(cmd.characterId);
    if (!character) {
      throw new PartyError("not_found", "Character not found");
    }
    if (character.ownerId !== cmd.userId) {
      throw new PartyError("forbidden", "User is not the owner of the character");
    }

    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    if (!party.members.includes(cmd.characterId)) {
      throw new PartyError("forbidden", "Character is not a member of the party");
    }

    const message = `${character.name} rolled a ${cmd.roll}`;
    await this.publisher.publishToParty(party.id, {
      type: "dice_rolled",
      payload: message,
    });
  }
}
