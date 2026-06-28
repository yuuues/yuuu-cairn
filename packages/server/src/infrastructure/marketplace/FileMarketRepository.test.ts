import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileMarketRepository } from "./FileMarketRepository.js";

let dataDir: string;

const catalog = {
  Gear: {
    Torch: { tags: ["uses"], uses: 3, cost: 5 },
    Rope: { tags: [], cost: 10 },
  },
  Armor: {
    Mail: { tags: ["2 Armor"], cost: 40 },
  },
};

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "kw-market-"));
  writeFileSync(join(dataDir, "marketplace.json"), JSON.stringify(catalog));
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe("FileMarketRepository", () => {
  it("aplana el catálogo a MarketItem[] con name y category", () => {
    const repo = new FileMarketRepository(dataDir);
    const items = repo.items();
    expect(items).toHaveLength(3);
    const torch = items.find((i) => i.name === "Torch")!;
    expect(torch.category).toBe("Gear");
    expect(torch.cost).toBe(5);
    expect(torch.tags).toEqual(["uses"]);
    expect(torch.uses).toBe(3);
  });

  it("expone las categorías presentes", () => {
    const repo = new FileMarketRepository(dataDir);
    expect(repo.categories().sort()).toEqual(["Armor", "Gear"]);
  });
});
