import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { importEnvelopeIntoStore } from "./exportFile.js";
import { createLocalClient } from "./container.js";
import { serializeCharacter } from "@kw/shared";

describe("importEnvelopeIntoStore", () => {
  beforeEach(() => {
    indexedDB = new IDBFactory();
  });

  it("importa un sobre como personaje nuevo con id local", async () => {
    const client = createLocalClient("kw-test");
    const draft = await client.charactersApi.roll(""); // trasfondo aleatorio
    const created = await client.charactersApi.create(draft);
    const json = serializeCharacter(created);

    const imported = await importEnvelopeIntoStore(client.charactersApi, json);
    expect(imported.id).not.toBe(created.id); // id nuevo, no colisiona
    expect((await client.charactersApi.list()).length).toBe(2);
  });
});
