import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MarketCatalogSchema, type MarketItem } from "@kw/shared";
import type { MarketRepository } from "@kw/core";

export class FileMarketRepository implements MarketRepository {
  private _items: MarketItem[] | null = null;

  constructor(private readonly dataDir: string) {}

  private load(): MarketItem[] {
    if (this._items) return this._items;
    const raw = JSON.parse(
      readFileSync(join(this.dataDir, "marketplace.json"), "utf8")
    );
    const catalog = MarketCatalogSchema.parse(raw);
    const items: MarketItem[] = [];
    for (const [category, entries] of Object.entries(catalog)) {
      for (const [name, entry] of Object.entries(entries)) {
        items.push({ ...entry, name, category });
      }
    }
    this._items = items;
    return items;
  }

  items(): MarketItem[] {
    return this.load();
  }

  categories(): string[] {
    return [...new Set(this.load().map((it) => it.category))];
  }
}
