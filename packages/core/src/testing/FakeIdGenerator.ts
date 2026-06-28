import type { IdGenerator } from "../ports/driven/IdGenerator.js";

export class FakeIdGenerator implements IdGenerator {
  private counter = 0;

  joinCode(): string {
    return `CODE${++this.counter}`;
  }
}
