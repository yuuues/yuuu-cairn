import { PrismaClient } from "@prisma/client";

let client: PrismaClient | null = null;

/** Singleton de PrismaClient para el composition root. */
export function getPrismaClient(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}
