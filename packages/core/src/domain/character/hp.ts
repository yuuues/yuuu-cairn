import type { Item } from "@kw/shared";
import { occupiedMainSlots } from "./inventory.js";

export interface EffectiveHpInput {
  hp: number;
  hpMax: number;
  panicked: boolean;
  items: Item[];
}

export interface EffectiveHp {
  hp: number;
  hpMax: number;
}

/** HP efectivo: 0 si ocupa >=10 slots principales o está en pánico (paridad con el origen). */
export function effectiveHp(input: EffectiveHpInput): EffectiveHp {
  let hp = input.hp;
  if (occupiedMainSlots(input.items) >= 10 || input.panicked) {
    hp = 0;
  }
  return { hp, hpMax: input.hpMax };
}
