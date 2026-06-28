import type { Character, Item, TransferItemInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { InventoryError } from "./errors.js";

export interface TransferItemCommand {
  ownerId: number;
  fromCharacterId: number;
  input: TransferItemInput;
}

function nextItemId(items: Item[]): number {
  return items.reduce((max, it) => (it.id > max ? it.id : max), 0) + 1;
}

export class TransferItem {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: TransferItemCommand): Promise<void> {
    const from = await this.characters.findById(cmd.fromCharacterId);
    if (!from || from.ownerId !== cmd.ownerId) {
      throw new InventoryError("not_found", "Source character not found");
    }
    const item = from.items.find((it) => it.id === cmd.input.itemId);
    if (!item) {
      throw new InventoryError("not_found", "Item not found");
    }
    const to = await this.characters.findById(cmd.input.toCharacterId);
    if (!to) {
      throw new InventoryError("not_found", "Target character not found");
    }

    const fromItems = from.items.filter((it) => it.id !== item.id);
    const movedItem: Item = { ...item, id: nextItemId(to.items), location: 0 };
    const toItems = [...to.items, movedItem];

    const nextFrom: Character = {
      ...from,
      items: fromItems,
      armor: String(armorValue(fromItems)),
    };
    const nextTo: Character = {
      ...to,
      items: toItems,
      armor: String(armorValue(toItems)),
    };

    await this.characters.save(nextFrom);
    await this.characters.save(nextTo);
  }
}
