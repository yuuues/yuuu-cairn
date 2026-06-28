import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileGameDataRepository } from "./FileGameDataRepository.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "kw-data-"));
  mkdirSync(join(dir, "backgrounds"));
  writeFileSync(
    join(dir, "backgrounds", "aurifex.json"),
    JSON.stringify({
      Aurifex: {
        background_description: "An artisan.",
        names: ["Hestia"],
        starting_gear: [{ name: "Lantern", tags: [] }],
        table1: { question: "q1", options: [{ description: "o1" }] },
        table2: { question: "q2", options: [{ description: "o2" }] },
      },
    })
  );
  writeFileSync(
    join(dir, "backgrounds", "cutpurse.json"),
    JSON.stringify({
      Cutpurse: {
        background_description: "A thief.",
        names: ["Sly"],
        starting_gear: [],
        table1: { question: "q1", options: [{ description: "o1" }] },
        table2: { question: "q2", options: [{ description: "o2" }] },
      },
    })
  );
  writeFileSync(
    join(dir, "bonds.json"),
    JSON.stringify({ Bonds: [{ description: "A gem.", gold: 5 }] })
  );
  writeFileSync(
    join(dir, "omens.json"),
    JSON.stringify({ Omens: [{ description: "The river runs black." }] })
  );
  writeFileSync(
    join(dir, "traits.json"),
    JSON.stringify({ Physique: ["Athletic"], Skin: ["Tanned"] })
  );
  writeFileSync(
    join(dir, "scars.json"),
    JSON.stringify({ Scars: [{ name: "Lasting Scar", description: "Roll 1d6." }] })
  );
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("FileGameDataRepository", () => {
  it("consolida los backgrounds individuales en un mapa", () => {
    const repo = new FileGameDataRepository(dir);
    const bkgs = repo.backgrounds();
    expect(Object.keys(bkgs).sort()).toEqual(["Aurifex", "Cutpurse"]);
    expect(repo.background("Aurifex")?.names).toEqual(["Hestia"]);
  });

  it("parsea bonds, omens (a lista de descripciones), traits y scars", () => {
    const repo = new FileGameDataRepository(dir);
    expect(repo.bonds()[0]!.description).toBe("A gem.");
    expect(repo.omens()).toEqual(["The river runs black."]);
    expect(repo.traits().Physique).toEqual(["Athletic"]);
    expect(repo.scars()[0]!.name).toBe("Lasting Scar");
  });

  it("background devuelve null para un nombre inexistente", () => {
    const repo = new FileGameDataRepository(dir);
    expect(repo.background("Nope")).toBeNull();
  });
});
