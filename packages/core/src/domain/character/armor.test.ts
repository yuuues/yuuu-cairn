import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { armorValue } from "./armor.js";

const item = (over: Partial<Item>): Item => ({
  id: 1,
  name: "x",
  location: 0,
  tags: [],
  ...over,
});

describe("armorValue", () => {
  it("sin items => 0", () => {
    expect(armorValue([])).toBe(0);
  });
  it("suma el valor de armadura de los tags", () => {
    expect(armorValue([item({ tags: ["1 Armor"] })])).toBe(1);
    expect(armorValue([item({ tags: ["2 Armor"] })])).toBe(2);
  });
  it("ignora items fuera del contenedor principal", () => {
    expect(armorValue([item({ location: 4, tags: ["2 Armor"] })])).toBe(0);
  });
  it("ignora items sin tags", () => {
    expect(armorValue([item({ tags: [] })])).toBe(0);
  });
  it("acumula varios items con tope en 3", () => {
    const items = [
      item({ id: 1, tags: ["2 Armor"] }),
      item({ id: 2, tags: ["2 Armor"] }),
    ];
    expect(armorValue(items)).toBe(3);
  });
});
