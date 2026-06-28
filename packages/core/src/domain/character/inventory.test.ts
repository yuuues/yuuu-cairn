import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { itemSlotCost, occupiedMainSlots } from "./inventory.js";

const item = (over: Partial<Item>): Item => ({
  id: 1,
  name: "x",
  location: 0,
  tags: [],
  ...over,
});

describe("itemSlotCost", () => {
  it("un item normal ocupa 1 slot", () => {
    expect(itemSlotCost(item({ tags: [] }))).toBe(1);
  });
  it("un item bulky ocupa 2 slots", () => {
    expect(itemSlotCost(item({ tags: ["bulky"] }))).toBe(2);
  });
  it("un item petty ocupa 0 slots", () => {
    expect(itemSlotCost(item({ tags: ["petty"] }))).toBe(0);
  });
  it("petty tiene prioridad sobre bulky (0 slots)", () => {
    expect(itemSlotCost(item({ tags: ["petty", "bulky"] }))).toBe(0);
  });
});

describe("occupiedMainSlots", () => {
  it("solo cuenta items en el contenedor principal (location 0)", () => {
    const items = [
      item({ id: 1, location: 0, tags: [] }), // 1
      item({ id: 2, location: 5, tags: [] }), // ignorado
      item({ id: 3, location: 0, tags: ["bulky"] }), // 2
      item({ id: 4, location: 0, tags: ["petty"] }), // 0
    ];
    expect(occupiedMainSlots(items)).toBe(3);
  });
  it("lista vacía => 0", () => {
    expect(occupiedMainSlots([])).toBe(0);
  });
});
