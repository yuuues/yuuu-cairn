import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { itemSlotCost, occupiedMainSlots } from "./inventory.js";
import {
  mainContainerSlots,
  isOverburdened,
} from "./inventory.js";

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

const mainContainer = (slots: number) => ({ id: 0, name: "Main", slots });

describe("mainContainerSlots", () => {
  it("usa los slots del contenedor con id 0", () => {
    expect(mainContainerSlots([mainContainer(8)])).toBe(8);
  });
  it("sin contenedor principal => 10 por defecto", () => {
    expect(mainContainerSlots([{ id: 3, name: "Sack", slots: 6 }])).toBe(10);
  });
});

describe("isOverburdened", () => {
  it("no sobrecargado con menos slots que la capacidad", () => {
    const items = [item({ id: 1, location: 0 }), item({ id: 2, location: 0 })]; // 2 slots
    expect(isOverburdened(items, [mainContainer(10)])).toBe(false);
  });
  it("sobrecargado al alcanzar la capacidad", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ id: i + 1, location: 0 })
    ); // 10 slots
    expect(isOverburdened(items, [mainContainer(10)])).toBe(true);
  });
});
