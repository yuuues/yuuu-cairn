import { describe, it, expect } from "vitest";
import { rollSingle, rollDouble, formatSingle, formatDouble } from "./diceRoll.js";

describe("rollSingle", () => {
  it("devuelve un entero en [1, sides]", () => {
    for (let i = 0; i < 200; i++) {
      const r = rollSingle(6, () => 0.5);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
  it("rng=0 → 1; rng→1 → sides (borde)", () => {
    expect(rollSingle(20, () => 0)).toBe(1);
    expect(rollSingle(20, () => 0.999999)).toBe(20);
  });
});

describe("rollDouble", () => {
  it("devuelve dos tiradas", () => {
    const [a, b] = rollDouble(8, () => 0);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});

describe("format", () => {
  it("formatSingle = '{result} (d{sides})'", () => {
    expect(formatSingle(7, 8)).toBe("7 (d8)");
  });
  it("formatDouble = '{a}, {b} (d{sides}+d{sides})'", () => {
    expect(formatDouble(3, 5, 6)).toBe("3, 5 (d6+d6)");
  });
});
