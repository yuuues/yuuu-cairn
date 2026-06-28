import type { Character, UpdateCharacterInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { CharacterError } from "./errors.js";

export interface UpdateCharacterCommand {
  id: number;
  ownerId: number;
  input: UpdateCharacterInput;
}

export class UpdateCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: UpdateCharacterCommand): Promise<Character> {
    const current = await this.characters.findById(cmd.id);
    if (!current || current.ownerId !== cmd.ownerId) {
      throw new CharacterError("not_found", "Character not found");
    }
    const next: Character = { ...current, ...cmd.input };
    // Si cambian los items, recalcular armadura (paridad charedit_save).
    if (cmd.input.items) {
      next.armor = String(armorValue(cmd.input.items));
    }
    return this.characters.save(next);
  }
}
