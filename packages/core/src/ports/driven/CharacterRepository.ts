import type { Character } from "@kw/shared";

export interface CharacterRepository {
  findById(id: number): Promise<Character | null>;
  findByOwner(ownerId: number): Promise<Character[]>;
  save(character: Character): Promise<Character>;
  delete(id: number): Promise<void>;
}
