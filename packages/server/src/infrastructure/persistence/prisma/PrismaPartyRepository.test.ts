import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Party } from "@kw/shared";
import { PrismaPartyRepository } from "./PrismaPartyRepository.js";

let dir: string;
let prisma: PrismaClient;
let ownerId: number;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "kw-party-"));
  const dbUrl = `file:${join(dir, "test.db")}`;
  execSync("pnpm exec prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const user = await prisma.user.create({
    data: { email: "o@party.com", username: "partyowner", passwordHash: "h", confirmed: true },
  });
  ownerId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

const baseParty = (over: Partial<Party> = {}): Party => ({
  id: 0,
  ownerId,
  name: "Test Party",
  description: "A test",
  notes: null,
  members: [],
  subowners: [],
  joinCode: `CODE-${Math.random()}`,
  items: [{ id: 1, name: "Torch", location: 0, tags: [] }],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  events: ["Session 1 started"],
  version: 0,
  ...over,
});

describe("PrismaPartyRepository", () => {
  it("guarda una partida nueva y la recupera con JSON parseado", async () => {
    const repo = new PrismaPartyRepository(prisma);
    const saved = await repo.save(baseParty({ joinCode: "UNIQUE1" }));
    expect(saved.id).toBeGreaterThan(0);

    const got = await repo.findById(saved.id);
    expect(got?.name).toBe("Test Party");
    expect(got?.items).toHaveLength(1);
    expect(got?.items[0]!.name).toBe("Torch");
    expect(got?.containers[0]!.slots).toBe(10);
    expect(got?.events[0]).toBe("Session 1 started");
  });

  it("findByJoinCode encuentra la partida correcta", async () => {
    const repo = new PrismaPartyRepository(prisma);
    await repo.save(baseParty({ joinCode: "TESTJOIN" }));
    const found = await repo.findByJoinCode("TESTJOIN");
    expect(found?.name).toBe("Test Party");
  });

  it("findByMember incluye partidas donde el usuario es owner", async () => {
    const repo = new PrismaPartyRepository(prisma);
    await repo.save(baseParty({ joinCode: "MEMBER1" }));
    const list = await repo.findByMember(ownerId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((p) => p.ownerId === ownerId || p.subowners.includes(ownerId))).toBe(true);
  });

  it("actualiza una partida existente", async () => {
    const repo = new PrismaPartyRepository(prisma);
    const saved = await repo.save(baseParty({ joinCode: "UPDATE1", name: "Old" }));
    await repo.save({ ...saved, name: "New", version: 1 });
    const reloaded = await repo.findById(saved.id);
    expect(reloaded?.name).toBe("New");
    expect(reloaded?.version).toBe(1);
  });

  it("delete elimina la partida", async () => {
    const repo = new PrismaPartyRepository(prisma);
    const saved = await repo.save(baseParty({ joinCode: "DELETE1" }));
    await repo.delete(saved.id);
    expect(await repo.findById(saved.id)).toBeNull();
  });
});
