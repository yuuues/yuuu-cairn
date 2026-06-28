import type {
  Backgrounds,
  Background,
  Bond,
  Traits,
  Scar,
} from "@kw/shared";

export interface GameDataRepository {
  backgrounds(): Backgrounds;
  background(name: string): Background | null;
  bonds(): Bond[];
  /** Lista de descripciones de presagios (paridad load_omens). */
  omens(): string[];
  traits(): Traits;
  scars(): Scar[];
}
