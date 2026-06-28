import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { CharacterError } from "./errors.js";

export interface DeleteCharacterCommand {
  id: number;
  ownerId: number;
}

export class DeleteCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: DeleteCharacterCommand): Promise<void> {
    const character = await this.characters.findById(cmd.id);
    if (!character || character.ownerId !== cmd.ownerId) {
      throw new CharacterError("not_found", "Character not found");
    }
    await this.characters.delete(cmd.id);
  }
}
