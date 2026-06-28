import type {
  Backgrounds,
  Background,
  Bond,
  Traits,
  Scar,
} from "@kw/shared";
import type { GameDataRepository } from "../ports/driven/GameDataRepository.js";

export interface FakeGameData {
  backgrounds?: Backgrounds;
  bonds?: Bond[];
  omens?: string[];
  traits?: Traits;
  scars?: Scar[];
}

export class FakeGameDataRepository implements GameDataRepository {
  constructor(private readonly data: FakeGameData = {}) {}

  backgrounds(): Backgrounds {
    return this.data.backgrounds ?? {};
  }
  background(name: string): Background | null {
    return this.backgrounds()[name] ?? null;
  }
  bonds(): Bond[] {
    return this.data.bonds ?? [];
  }
  omens(): string[] {
    return this.data.omens ?? [];
  }
  traits(): Traits {
    return this.data.traits ?? {};
  }
  scars(): Scar[] {
    return this.data.scars ?? [];
  }
}
