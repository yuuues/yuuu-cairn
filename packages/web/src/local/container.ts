import {
  CreateCharacter,
  GetCharacter,
  ListCharacters,
  UpdateCharacter,
  DeleteCharacter,
  RollCharacter,
  RollTable,
  GenerateNpc,
} from "@kw/core";
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  RollTableInput,
} from "@kw/shared";
import { IndexedDbCharacterRepository } from "./adapters/IndexedDbCharacterRepository.js";
import { BrowserDice } from "./adapters/BrowserDice.js";
import { BundledGameDataRepository } from "./gamedata/BundledGameDataRepository.js";
import { BundledGeneratorRepository } from "./gamedata/BundledGeneratorRepository.js";
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

/**
 * API de generadores en modo local: mismas firmas que la HTTP
 * (api/generators.ts) pero resueltas contra el bundle, sin servidor.
 * No usa IndexedDB, así que es independiente de createLocalClient.
 */
export function createLocalGeneratorsApi() {
  const repo = new BundledGeneratorRepository();
  const dice = new BrowserDice();
  const rollTable = new RollTable(repo, dice);
  const generateNpc = new GenerateNpc(repo, dice);

  return {
    tables: async () => repo.tables(),
    roll: (input: RollTableInput) => rollTable.execute(input),
    npc: () => generateNpc.execute(),
  };
}
