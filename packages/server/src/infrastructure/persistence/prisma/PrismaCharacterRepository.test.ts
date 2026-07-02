import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Character } from "@kw/shared";
import { PrismaCharacterRepository } from "./PrismaCharacterRepository.js";

let dir: string;
let prisma: PrismaClient;
let ownerId: number;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "kw-char-"));
  const dbUrl = `file:${join(dir, "test.db")}`;
  execSync("pnpm exec prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const user = await prisma.user.create({
    data: { email: "o@e.com", username: "owner", passwordHash: "h", confirmed: true },
  });
  ownerId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

const baseChar = (over: Partial<Character>): Character => ({
  id: 0,
  ownerId,
  name: "Hero",
  background: "Aurifex",
  strength: 10,
  strengthMax: 10,
  dexterity: 10,
  dexterityMax: 10,
  willpower: 10,
  willpowerMax: 10,
  hp: 5,
  hpMax: 5,
  deprived: false,
  panicked: false,
  gold: 3,
  items: [{ id: 1, name: "Lantern", location: 0, tags: [] }],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: "desc",
  traits: null,
  notes: null,
  bonds: null,
  scars: "",
  omens: null,
  armor: "0",
  imageUrl: null,
  partyId: null,
  ...over,
});

describe("PrismaCharacterRepository", () => {
  it("guarda un personaje nuevo y lo recupera con items/containers parseados", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(baseChar({ name: "Rune" }));
    expect(saved.id).toBeGreaterThan(0);

    const got = await repo.findById(saved.id);
    expect(got?.name).toBe("Rune");
    expect(got?.items).toHaveLength(1);
    expect(got?.items[0]!.name).toBe("Lantern");
    expect(got?.containers[0]!.slots).toBe(10);
  });

  it("findByOwner devuelve los del propietario", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    await repo.save(baseChar({ name: "X" }));
    const list = await repo.findByOwner(ownerId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((c) => c.ownerId === ownerId)).toBe(true);
  });

  it("actualiza un personaje existente (id != 0)", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(baseChar({ name: "Y", gold: 1 }));
    await repo.save({ ...saved, gold: 99 });
    const reloaded = await repo.findById(saved.id);
    expect(reloaded?.gold).toBe(99);
  });

  it("guarda y recupera el avatar como JSON", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(
      baseChar({
        name: "Av",
        avatar: { v: 1, parts: { body: { color: "#abcdef", visible: true } } },
      })
    );
    const got = await repo.findById(saved.id);
    expect(got?.avatar?.parts.body?.color).toBe("#abcdef");
  });

  it("delete elimina el personaje", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(baseChar({ name: "Z" }));
    await repo.delete(saved.id);
    expect(await repo.findById(saved.id)).toBeNull();
  });
});
