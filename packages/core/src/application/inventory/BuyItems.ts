import type { Character, Item, BuyItemsInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import type { MarketRepository } from "../../ports/driven/MarketRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { resolveBoughtItems } from "../../domain/character/market.js";
import { InventoryError } from "./errors.js";

export interface BuyItemsCommand {
  id: number;
  ownerId: number;
  input: BuyItemsInput;
}

function nextItemId(items: Item[]): number {
  return items.reduce((max, it) => (it.id > max ? it.id : max), 0) + 1;
}

export class BuyItems {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly market: MarketRepository
  ) {}

  async execute(cmd: BuyItemsCommand): Promise<Character> {
    const current = await this.characters.findById(cmd.id);
    if (!current || current.ownerId !== cmd.ownerId) {
      throw new InventoryError("not_found", "Character not found");
    }

    const bought = resolveBoughtItems(
      cmd.input.cart,
      this.market.items(),
      cmd.input.containerId
    );

    const items = [...current.items];
    let id = nextItemId(items);
    for (const b of bought) {
      items.push({ ...b, id } as Item);
      id += 1;
    }

    const next: Character = {
      ...current,
      gold: cmd.input.gold,
      items,
      armor: String(armorValue(items)),
    };
    return this.characters.save(next);
  }
}
