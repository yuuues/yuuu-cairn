import type { Character, UpdateInventoryInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { InventoryError } from "./errors.js";

export interface UpdateInventoryCommand {
  id: number;
  ownerId: number;
  input: UpdateInventoryInput;
}

export class UpdateInventory {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: UpdateInventoryCommand): Promise<Character> {
    const current = await this.characters.findById(cmd.id);
    if (!current || current.ownerId !== cmd.ownerId) {
      throw new InventoryError("not_found", "Character not found");
    }
    const next: Character = {
      ...current,
      items: cmd.input.items,
      containers: cmd.input.containers,
      gold: cmd.input.gold,
      armor: String(armorValue(cmd.input.items)),
    };
    return this.characters.save(next);
  }
}
