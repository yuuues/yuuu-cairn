import type { Character } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { CharacterError } from "./errors.js";

export interface GetCharacterQuery {
  id: number;
  ownerId: number;
}

export class GetCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(q: GetCharacterQuery): Promise<Character> {
    const character = await this.characters.findById(q.id);
    if (!character || character.ownerId !== q.ownerId) {
      throw new CharacterError("not_found", "Character not found");
    }
    return character;
  }
}
