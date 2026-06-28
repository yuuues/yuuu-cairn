import type { MarketItem } from "@kw/shared";

export interface MarketRepository {
  /** Catálogo aplanado (paridad load_market). */
  items(): MarketItem[];
  /** Categorías presentes en el catálogo (Gear, Armor, Weapons). */
  categories(): string[];
}
