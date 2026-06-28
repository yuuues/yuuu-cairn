import type { Item, MarketItem } from "@kw/shared";

/** Item recién comprado, aún sin id (lo asignará la persistencia/caso de uso). */
export type BoughtItem = Omit<Item, "id">;

/**
 * Resuelve un carrito (nombres con repetición) contra el catálogo y produce
 * items de inventario en el contenedor `location`. Paridad Market.buy:
 * - nombre no encontrado => se ignora;
 * - copia tags; copia `uses` solo si el tag "uses" está presente;
 * - copia `description` si existe.
 */
export function resolveBoughtItems(
  cart: string[],
  catalog: MarketItem[],
  location: number
): BoughtItem[] {
  const byName = new Map(catalog.map((it) => [it.name, it]));
  const result: BoughtItem[] = [];
  for (const name of cart) {
    const market = byName.get(name);
    if (!market) continue;
    const tags = market.tags ?? [];
    const item: BoughtItem = { name, tags, location };
    if (tags.includes("uses") && market.uses !== undefined) {
      (item as Record<string, unknown>).uses = market.uses;
    }
    if (market.description !== undefined) {
      (item as Record<string, unknown>).description = market.description;
    }
    result.push(item);
  }
  return result;
}
