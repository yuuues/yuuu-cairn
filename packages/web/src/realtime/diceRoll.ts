export type Rng = () => number;

/** Tirada de un dado de `sides` caras: entero en [1, sides] (paridad utils.rollDice). */
export function rollSingle(sides: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

/** Dos tiradas de `sides` caras (paridad utils.rollDoubleDice). */
export function rollDouble(sides: number, rng: Rng = Math.random): [number, number] {
  return [rollSingle(sides, rng), rollSingle(sides, rng)];
}

/** Texto de una tirada simple: "{result} (d{sides})". */
export function formatSingle(result: number, sides: number): string {
  return `${result} (d${sides})`;
}

/** Texto de una tirada doble: "{a}, {b} (d{sides}+d{sides})". */
export function formatDouble(a: number, b: number, sides: number): string {
  return `${a}, ${b} (d${sides}+d${sides})`;
}
