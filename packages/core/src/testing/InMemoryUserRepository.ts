import type { UserRepository, UserRecord } from "../ports/driven/UserRepository.js";

export class InMemoryUserRepository implements UserRepository {
  private users = new Map<number, UserRecord>();
  private seq = 0;

  async findById(id: number): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }
  async findByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  }
  async findByUsername(username: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.username === username) return u;
    }
    return null;
  }
  async save(user: UserRecord): Promise<UserRecord> {
    let record = user;
    if (record.id === 0) {
      record = { ...record, id: ++this.seq };
    }
    this.users.set(record.id, record);
    return record;
  }
  async delete(id: number): Promise<void> {
    this.users.delete(id);
  }
}
