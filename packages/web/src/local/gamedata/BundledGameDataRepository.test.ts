import { describe, it, expect } from "vitest";
import { BundledGameDataRepository } from "./BundledGameDataRepository.js";

describe("BundledGameDataRepository", () => {
  const repo = new BundledGameDataRepository();

  it("backgrounds devuelve un mapa no vacío y validado", () => {
    const bg = repo.backgrounds();
    expect(Object.keys(bg).length).toBeGreaterThan(0);
  });

  it("background(name) devuelve null para inexistente", () => {
    expect(repo.background("__nope__")).toBeNull();
  });

  it("bonds, omens, traits, scars devuelven datos", () => {
    expect(repo.bonds().length).toBeGreaterThan(0);
    expect(repo.omens().length).toBeGreaterThan(0);
    expect(repo.scars().length).toBeGreaterThan(0);
    expect(repo.traits()).toBeTruthy();
  });
});
