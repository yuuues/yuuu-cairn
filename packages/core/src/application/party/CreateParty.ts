import type { Party, CreatePartyInput } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { IdGenerator } from "../../ports/driven/IdGenerator.js";

export interface CreatePartyCommand {
  ownerId: number;
  input: CreatePartyInput;
}

export class CreateParty {
  constructor(
    private readonly parties: PartyRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(cmd: CreatePartyCommand): Promise<Party> {
    const party: Party = {
      id: 0,
      ownerId: cmd.ownerId,
      name: cmd.input.name,
      description: cmd.input.description,
      notes: cmd.input.notes,
      members: [],
      subowners: [],
      joinCode: this.idGenerator.joinCode(),
      items: [],
      containers: [],
      events: [],
      version: 0,
    };
    return this.parties.save(party);
  }
}
