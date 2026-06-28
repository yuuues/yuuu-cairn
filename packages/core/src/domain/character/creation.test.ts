import { describe, it, expect } from "vitest";
import type { Background, GearItem, TableOption } from "@kw/shared";
import {
  requiredBondsCount,
  itemsFromGear,
  assignItemIds,
  buildContainers,
} from "./creation.js";

const bg = (over: Partial<Background>): Background =>
  ({
    background_description: "",
    names: [],
    starting_gear: [],
    table1: { question: "", options: [] },
    table2: { question: "", options: [] },
    ...over,
  }) as Background;

describe("requiredBondsCount", () => {
  it("1 por defecto", () => {
    expect(requiredBondsCount(bg({}), "")).toBe(1);
  });
  it("2 si el trasfondo pide segunda tirada de vínculos", () => {
    expect(
      requiredBondsCount(
        bg({ background_description: "... Roll a second time on the Bonds table ..." }),
        ""
      )
    ).toBe(2);
  });
  it("2 si la opción de table1 pide segunda tirada de vínculos", () => {
    expect(
      requiredBondsCount(bg({}), "You roll a second time on the Bonds table.")
    ).toBe(2);
  });
});

describe("itemsFromGear", () => {
  it("normaliza tags ausentes a [] y conserva extras", () => {
    const gear: GearItem[] = [
      { name: "Lantern", tags: [] },
      { name: "Rations", tags: ["uses"], uses: 3 } as GearItem,
      { name: "Gloves" } as unknown as GearItem,
    ];
    const items = itemsFromGear(gear);
    expect(items).toHaveLength(3);
    expect(items[2]!.tags).toEqual([]);
    expect((items[1] as { uses?: number }).uses).toBe(3);
  });
});

describe("assignItemIds", () => {
  it("asigna ids incrementales desde 1 y location 0", () => {
    const items = assignItemIds([
      { name: "A", tags: [], id: 0, location: 0 },
      { name: "B", tags: [], id: 0, location: 0 },
    ]);
    expect(items.map((i) => i.id)).toEqual([1, 2]);
    expect(items.every((i) => i.location === 0)).toBe(true);
  });
});

describe("buildContainers", () => {
  it("siempre incluye Main (id 0, 10 slots) primero", () => {
    const conts = buildContainers(bg({}), undefined, undefined);
    expect(conts[0]).toEqual({ id: 0, name: "Main", slots: 10 });
  });
  it("añade starting_containers y los de table1/table2 con ids incrementales", () => {
    const background = bg({ starting_containers: [{ name: "Sack", slots: 6 }] });
    const t1: TableOption = { description: "x", containers: [{ name: "Pouch", slots: 2 }] };
    const conts = buildContainers(background, t1, undefined);
    expect(conts.map((c) => c.id)).toEqual([0, 1, 2]);
    expect(conts[1]!.name).toBe("Sack");
    expect(conts[2]!.name).toBe("Pouch");
  });
});
