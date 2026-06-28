import type { Dice } from "../ports/driven/Dice.js";

/** Dice determinista para tests: devuelve los valores de `seq` en orden. */
export class SequenceDice implements Dice {
  private i = 0;
  constructor(private readonly seq: number[]) {}

  private next(): number {
    if (this.i >= this.seq.length) {
      throw new Error("SequenceDice: secuencia agotada");
    }
    return this.seq[this.i++]!;
  }

  roll(_face: number): number {
    return this.next();
  }

  rollMulti(_face: number, count: number): { results: number[]; total: number } {
    const results: number[] = [];
    let total = 0;
    for (let k = 0; k < count; k++) {
      const v = this.next();
      results.push(v);
      total += v;
    }
    return { results, total };
  }

  pick<T>(list: T[]): T {
    const idx = this.next();
    return list[idx - 1]!;
  }
}
