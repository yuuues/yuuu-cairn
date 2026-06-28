import type { RollTableInput, RollTableResult } from "@kw/shared";
import type { GeneratorRepository } from "../../ports/driven/GeneratorRepository.js";
import type { Dice } from "../../ports/driven/Dice.js";
import { GeneratorError } from "./errors.js";

/**
 * Extrae una cadena de texto de cualquier valor de tabla.
 * Arrays → pick aleatorio y recursión; objetos → pick de clave + recursión;
 * primitivo → toString.
 */
function extractString(value: unknown, dice: Dice): string {
  if (Array.isArray(value)) {
    const picked = dice.pick(value as unknown[]);
    return extractString(picked, dice);
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return "";
    const key = dice.pick(keys);
    return extractString((value as Record<string, unknown>)[key], dice);
  }
  return String(value);
}

export class RollTable {
  constructor(
    private readonly repo: GeneratorRepository,
    private readonly dice: Dice
  ) {}

  async execute(input: RollTableInput): Promise<RollTableResult> {
    const tables = this.repo.tables();
    const top = tables[input.category];
    if (top === undefined) {
      throw new GeneratorError("table_not_found", `Table '${input.category}' not found`);
    }

    if (input.subcategory !== null) {
      if (
        top === null ||
        typeof top !== "object" ||
        Array.isArray(top) ||
        !Object.prototype.hasOwnProperty.call(top, input.subcategory)
      ) {
        throw new GeneratorError(
          "subcategory_not_found",
          `Subcategory '${input.subcategory}' not found in '${input.category}'`
        );
      }
      const sub = (top as Record<string, unknown>)[input.subcategory];
      const result = extractString(sub, this.dice);
      return { category: input.category, subcategory: input.subcategory, result };
    }

    // Si el valor raíz es un objeto (no array), devolvemos la clave elegida
    // (paridad roll_dict: elige clave del dict y la devuelve como string).
    // Si es array, elegimos un elemento (paridad roll_list).
    let result: string;
    if (!Array.isArray(top) && top !== null && typeof top === "object") {
      const keys = Object.keys(top as Record<string, unknown>);
      result = keys.length > 0 ? this.dice.pick(keys) : "";
    } else {
      result = extractString(top, this.dice);
    }
    return { category: input.category, subcategory: null, result };
  }
}
