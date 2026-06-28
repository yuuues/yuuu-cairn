import { describe, it, expect } from "vitest";
import type { MarketItem } from "@kw/shared";
import { resolveBoughtItems } from "./market.js";

const catalog: MarketItem[] = [
  { name: "Torch", category: "Gear", cost: 5, tags: ["uses"], uses: 3 },
  { name: "Rope", category: "Gear", cost: 10, tags: [], description: "50ft" },
  {
    name: "Chainmail",
    category: "Armor",
    cost: 40,
    tags: ["bulky", "2 Armor"],
  },
];

describe("resolveBoughtItems", () => {
  it("resuelve un nombre simple a un item de inventario (location dada)", () => {
    const result = resolveBoughtItems(["Rope"], catalog, 0);
    expect(result).toEqual([
      {
        name: "Rope",
        tags: [],
        location: 0,
        description: "50ft",
      },
    ]);
  });

  it("copia uses cuando el tag 'uses' está presente", () => {
    const result = resolveBoughtItems(["Torch"], catalog, 2);
    expect(result[0]).toMatchObject({
      name: "Torch",
      tags: ["uses"],
      location: 2,
      uses: 3,
    });
  });

  it("no añade uses si el tag 'uses' no está", () => {
    const result = resolveBoughtItems(["Chainmail"], catalog, 0);
    expect(result[0]).not.toHaveProperty("uses");
    expect(result[0]!.tags).toEqual(["bulky", "2 Armor"]);
  });

  it("repite items por cada aparición en el carrito", () => {
    const result = resolveBoughtItems(["Torch", "Torch"], catalog, 0);
    expect(result).toHaveLength(2);
  });

  it("ignora nombres no presentes en el catálogo", () => {
    const result = resolveBoughtItems(["Ghost", "Rope"], catalog, 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Rope");
  });
});
