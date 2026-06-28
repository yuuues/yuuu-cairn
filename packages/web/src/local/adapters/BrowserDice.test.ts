import { describe, it, expect } from "vitest";
import { BrowserDice } from "./BrowserDice.js";

describe("BrowserDice", () => {
  const dice = new BrowserDice();

  it("roll devuelve enteros en [1, face]", () => {
    for (let i = 0; i < 500; i++) {
      const v = dice.roll(6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("rollMulti suma sus resultados", () => {
    const { results, total } = dice.rollMulti(6, 3);
    expect(results).toHaveLength(3);
    expect(total).toBe(results.reduce((a, b) => a + b, 0));
  });

  it("pick devuelve un elemento de la lista", () => {
    const list = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) expect(list).toContain(dice.pick(list));
  });
});
