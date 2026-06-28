import type { PrismaClient } from "@prisma/client";
import type { UserRepository, UserRecord } from "@kw/core";

type Row = {
  id: number;
  email: string | null;
  username: string | null;
  passwordHash: string;
  confirmed: boolean;
};

function toRecord(row: Row): UserRecord {
  return {
    id: row.id,
    email: row.email ?? "",
    username: row.username ?? "",
    passwordHash: row.passwordHash,
    confirmed: row.confirmed,
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toRecord(row) : null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? toRecord(row) : null;
  }

  async save(user: UserRecord): Promise<UserRecord> {
    if (user.id === 0) {
      const created = await this.prisma.user.create({
        data: {
          email: user.email,
          username: user.username,
          passwordHash: user.passwordHash,
          confirmed: user.confirmed,
        },
      });
      return toRecord(created);
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        username: user.username,
        passwordHash: user.passwordHash,
        confirmed: user.confirmed,
        lastLogin: new Date(),
      },
    });
    return toRecord(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
