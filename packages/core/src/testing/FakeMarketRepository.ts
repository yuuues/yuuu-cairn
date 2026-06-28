import type { MarketItem } from "@kw/shared";
import type { MarketRepository } from "../ports/driven/MarketRepository.js";

export class FakeMarketRepository implements MarketRepository {
  constructor(private readonly catalog: MarketItem[] = []) {}

  items(): MarketItem[] {
    return this.catalog;
  }

  categories(): string[] {
    return [...new Set(this.catalog.map((it) => it.category))];
  }
}
