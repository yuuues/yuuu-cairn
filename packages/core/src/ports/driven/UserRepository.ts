export interface UserRecord {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  confirmed: boolean;
}

export interface UserRepository {
  findById(id: number): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  save(user: UserRecord): Promise<UserRecord>;
  delete(id: number): Promise<void>;
}
