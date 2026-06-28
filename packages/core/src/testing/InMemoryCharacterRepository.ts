import type { Character } from "@kw/shared";
import type { CharacterRepository } from "../ports/driven/CharacterRepository.js";

export class InMemoryCharacterRepository implements CharacterRepository {
  private chars = new Map<number, Character>();
  private seq = 0;

  async findById(id: number): Promise<Character | null> {
    return this.chars.get(id) ?? null;
  }
  async findByOwner(ownerId: number): Promise<Character[]> {
    return [...this.chars.values()].filter((c) => c.ownerId === ownerId);
  }
  async save(character: Character): Promise<Character> {
    let record = character;
    if (record.id === 0) {
      record = { ...record, id: ++this.seq };
    }
    this.chars.set(record.id, record);
    return record;
  }
  async delete(id: number): Promise<void> {
    this.chars.delete(id);
  }
}
