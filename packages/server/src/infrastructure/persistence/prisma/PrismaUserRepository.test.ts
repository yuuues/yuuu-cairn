import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "./PrismaUserRepository.js";

let dir: string;
let prisma: PrismaClient;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "kw-user-"));
  const dbUrl = `file:${join(dir, "test.db")}`;
  execSync("pnpm exec prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

describe("PrismaUserRepository", () => {
  it("guarda un usuario nuevo y lo recupera por email y username", async () => {
    const repo = new PrismaUserRepository(prisma);
    const saved = await repo.save({
      id: 0,
      email: "alice@example.com",
      username: "alice",
      passwordHash: "hash:x",
      confirmed: false,
    });
    expect(saved.id).toBeGreaterThan(0);

    const byEmail = await repo.findByEmail("alice@example.com");
    expect(byEmail?.username).toBe("alice");
    const byUsername = await repo.findByUsername("alice");
    expect(byUsername?.email).toBe("alice@example.com");
    const byId = await repo.findById(saved.id);
    expect(byId?.confirmed).toBe(false);
  });

  it("actualiza un usuario existente (id != 0)", async () => {
    const repo = new PrismaUserRepository(prisma);
    const saved = await repo.save({
      id: 0,
      email: "bob@example.com",
      username: "bob",
      passwordHash: "hash:y",
      confirmed: false,
    });
    await repo.save({ ...saved, confirmed: true });
    const reloaded = await repo.findById(saved.id);
    expect(reloaded?.confirmed).toBe(true);
  });

  it("findByEmail devuelve null si no existe", async () => {
    const repo = new PrismaUserRepository(prisma);
    expect(await repo.findByEmail("nobody@example.com")).toBeNull();
  });

  it("delete elimina el usuario", async () => {
    const repo = new PrismaUserRepository(prisma);
    const saved = await repo.save({
      id: 0,
      email: "carol@example.com",
      username: "carol",
      passwordHash: "hash:z",
      confirmed: true,
    });
    await repo.delete(saved.id);
    expect(await repo.findById(saved.id)).toBeNull();
  });
});
