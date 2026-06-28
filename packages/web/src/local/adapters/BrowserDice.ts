import type { Dice } from "@kw/core";

/** randomInt sin sesgo en [1, face] usando crypto.getRandomValues (rejection sampling). */
function randomInt1(face: number): number {
  if (face <= 0) throw new Error("face debe ser > 0");
  const max = 0xffffffff;
  const limit = max - (max % face); // recorte para evitar sesgo de módulo
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return (x % face) + 1;
}

export class BrowserDice implements Dice {
  roll(face: number): number {
    return randomInt1(face);
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
