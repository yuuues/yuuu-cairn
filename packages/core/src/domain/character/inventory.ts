import type { Item, Container } from "@kw/shared";

/** Coste en slots de un item: petty=0, bulky=2, resto=1. */
export function itemSlotCost(item: Item): number {
  if (item.tags.includes("petty")) return 0;
  if (item.tags.includes("bulky")) return 2;
  return 1;
}

/** Slots ocupados en el contenedor principal (location === 0). */
export function occupiedMainSlots(items: Item[]): number {
  return items
    .filter((it) => it.location === 0)
    .reduce((sum, it) => sum + itemSlotCost(it), 0);
}

/** Capacidad del contenedor principal (id === 0); 10 por defecto. */
export function mainContainerSlots(containers: Container[]): number {
  const main = containers.find((c) => c.id === 0);
  return main ? main.slots : 10;
}

/** Sobrecargado si los slots ocupados alcanzan/superan la capacidad principal. */
export function isOverburdened(items: Item[], containers: Container[]): boolean {
  return occupiedMainSlots(items) >= mainContainerSlots(containers);
}
