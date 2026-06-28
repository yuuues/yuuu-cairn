import type { Character } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";

export class ListCharacters {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(ownerId: number): Promise<Character[]> {
    return this.characters.findByOwner(ownerId);
  }
}
