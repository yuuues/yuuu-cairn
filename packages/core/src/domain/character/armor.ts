import type { Item } from "@kw/shared";

/** Valor de armadura: suma de tags de armadura en el contenedor principal, tope 3. */
export function armorValue(items: Item[]): number {
  let armor = 0;
  for (const it of items) {
    if (it.location !== 0) continue;
    if (!it.tags || it.tags.length === 0) continue;
    if (it.tags.includes("1 Armor")) armor += 1;
    if (it.tags.includes("2 Armor")) armor += 2;
    if (it.tags.includes("3 Armor")) armor += 3;
  }
  return Math.min(armor, 3);
}
