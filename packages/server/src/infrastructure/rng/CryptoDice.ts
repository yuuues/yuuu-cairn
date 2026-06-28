import { randomInt } from "node:crypto";
import type { Dice } from "@kw/core";

export class CryptoDice implements Dice {
  /** randomInt(min, max) es [min, max); +1 para incluir face. */
  roll(face: number): number {
    return randomInt(1, face + 1);
  }

  rollMulti(face: number, count: number): { results: number[]; total: number } {
    const results: number[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const v = this.roll(face);
      results.push(v);
      total += v;
    }
    return { results, total };
  }

  pick<T>(list: T[]): T {
    return list[this.roll(list.length) - 1]!;
  }
}
