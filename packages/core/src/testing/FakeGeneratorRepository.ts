import type { GeneratorTables } from "@kw/shared";
import type { GeneratorRepository } from "../ports/driven/GeneratorRepository.js";

export class FakeGeneratorRepository implements GeneratorRepository {
  constructor(private readonly data: GeneratorTables = {}) {}

  tables(): GeneratorTables {
    return this.data;
  }
}
