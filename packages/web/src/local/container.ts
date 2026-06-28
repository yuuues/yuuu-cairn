import {
  CreateCharacter,
  GetCharacter,
  ListCharacters,
  UpdateCharacter,
  DeleteCharacter,
  RollCharacter,
} from "@kw/core";
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@kw/shared";
import { IndexedDbCharacterRepository } from "./adapters/IndexedDbCharacterRepository.js";
import { BrowserDice } from "./adapters/BrowserDice.js";
import { BundledGameDataRepository } from "./gamedata/BundledGameDataRepository.js";
import { LOCAL_OWNER_ID } from "./owner.js";

export function createLocalClient(dbName?: string) {
  const characters = new IndexedDbCharacterRepository(dbName);
  const data = new BundledGameDataRepository();
  const dice = new BrowserDice();

  const create = new CreateCharacter(characters);
  const get = new GetCharacter(characters);
  const list = new ListCharacters(characters);
  const update = new UpdateCharacter(characters);
  const remove = new DeleteCharacter(characters);
  const roll = new RollCharacter(data, dice);

  const charactersApi = {
    list: (): Promise<Character[]> => list.execute(LOCAL_OWNER_ID),
    get: (id: number): Promise<Character> =>
      get.execute({ id, ownerId: LOCAL_OWNER_ID }),
    create: (input: CreateCharacterInput): Promise<Character> =>
      create.execute({ ownerId: LOCAL_OWNER_ID, input }),
    update: (id: number, input: UpdateCharacterInput): Promise<Character> =>
      update.execute({ id, ownerId: LOCAL_OWNER_ID, input }),
    remove: (id: number): Promise<{ ok: true }> =>
      remove
        .execute({ id, ownerId: LOCAL_OWNER_ID })
        .then(() => ({ ok: true as const })),
    roll: (background: string): Promise<CreateCharacterInput> =>
      roll.execute({ background }),
  };

  const dataApi = {
    backgrounds: async () => data.backgrounds(),
    bonds: async () => data.bonds(),
    omens: async () => data.omens(),
    traits: async () => data.traits(),
    scars: async () => data.scars(),
  };

  return { charactersApi, dataApi };
}
