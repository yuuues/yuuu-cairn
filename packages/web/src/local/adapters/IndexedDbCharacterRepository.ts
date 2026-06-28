import { openDB, type IDBPDatabase } from "idb";
import type { Character } from "@kw/shared";
import type { CharacterRepository } from "@kw/core";

const STORE = "characters";

export class IndexedDbCharacterRepository implements CharacterRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbName = "kettlewright") {
    this.dbPromise = openDB(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("ownerId", "ownerId");
      },
    });
  }

  async findById(id: number): Promise<Character | null> {
    const db = await this.dbPromise;
    const found = (await db.get(STORE, id)) as Character | undefined;
    return found ?? null;
  }

  async findByOwner(ownerId: number): Promise<Character[]> {
    const db = await this.dbPromise;
    return (await db.getAllFromIndex(STORE, "ownerId", ownerId)) as Character[];
  }

  async save(character: Character): Promise<Character> {
    const db = await this.dbPromise;
    // id=0 => insert con autoincrement; el keyPath ignora 0 si quitamos el campo.
    if (!character.id || character.id === 0) {
      const { id: _omit, ...rest } = character;
      const newId = (await db.add(STORE, rest)) as number;
      return { ...character, id: newId };
    }
    await db.put(STORE, character);
    return character;
  }

  async delete(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE, id);
  }
}
