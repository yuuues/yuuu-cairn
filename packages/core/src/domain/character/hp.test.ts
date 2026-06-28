import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { effectiveHp } from "./hp.js";

const item = (over: Partial<Item>): Item => ({
  id: 1,
  name: "x",
  location: 0,
  tags: [],
  ...over,
});

describe("effectiveHp", () => {
  it("devuelve hp y hpMax cuando no hay penalización", () => {
    expect(effectiveHp({ hp: 4, hpMax: 6, panicked: false, items: [] })).toEqual({
      hp: 4,
      hpMax: 6,
    });
  });
  it("hp efectivo 0 si está en pánico", () => {
    expect(effectiveHp({ hp: 4, hpMax: 6, panicked: true, items: [] })).toEqual({
      hp: 0,
      hpMax: 6,
    });
  });
  it("hp efectivo 0 si ocupa 10 o más slots principales", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ id: i + 1, location: 0 })
    );
    expect(effectiveHp({ hp: 5, hpMax: 5, panicked: false, items }).hp).toBe(0);
  });
});
