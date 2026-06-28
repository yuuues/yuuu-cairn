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

/** Slots ocupados en un contenedor concreto (paridad Inventory.container_slots). */
export function containerSlots(items: Item[], containerId: number): number {
  return items
    .filter((it) => it.location === containerId)
    .reduce((sum, it) => sum + itemSlotCost(it), 0);
}

/** Capacidad libre del contenedor (0 si no existe). */
export function containerCapacityLeft(
  items: Item[],
  containers: Container[],
  containerId: number
): number {
  const container = containers.find((c) => c.id === containerId);
  if (!container) return 0;
  return container.slots - containerSlots(items, containerId);
}

/** Lleno cuando los slots ocupados alcanzan/superan la capacidad (>=). */
export function isContainerFull(
  items: Item[],
  containers: Container[],
  containerId: number
): boolean {
  const container = containers.find((c) => c.id === containerId);
  if (!container) return true;
  return containerSlots(items, containerId) >= container.slots;
}
