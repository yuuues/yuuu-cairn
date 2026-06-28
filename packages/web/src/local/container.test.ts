import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createLocalClient } from "./container.js";

describe("local container", () => {
  let client: ReturnType<typeof createLocalClient>;
  beforeEach(() => {
    indexedDB = new IDBFactory();
    client = createLocalClient("kw-test");
  });

  it("roll + create + list + get + update + remove", async () => {
    const draft = await client.charactersApi.roll(""); // trasfondo aleatorio
    expect(draft.name).toBeTruthy();

    const created = await client.charactersApi.create(draft);
    expect(created.id).toBeGreaterThan(0);

    const list = await client.charactersApi.list();
    expect(list).toHaveLength(1);

    const got = await client.charactersApi.get(created.id);
    expect(got.id).toBe(created.id);

    const updated = await client.charactersApi.update(created.id, { name: "Nuevo" });
    expect(updated.name).toBe("Nuevo");

    await client.charactersApi.remove(created.id);
    expect(await client.charactersApi.list()).toHaveLength(0);
  });

  it("dataApi.backgrounds devuelve datos", async () => {
    const bg = await client.dataApi.backgrounds();
    expect(Object.keys(bg).length).toBeGreaterThan(0);
  });
});
