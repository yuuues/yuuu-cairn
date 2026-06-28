import type { PrismaClient } from "@prisma/client";
import {
  ItemSchema,
  ContainerSchema,
  type Party,
  type Item,
  type Container,
} from "@kw/shared";
import { z } from "zod";
import type { PartyRepository } from "@kw/core";

const ItemsSchema = z.array(ItemSchema);
const ContainersSchema = z.array(ContainerSchema);
const MembersSchema = z.array(z.number().int());
const SubownersSchema = z.array(z.number().int());
const EventsSchema = z.array(z.string());

type Row = {
  id: number;
  ownerId: number;
  name: string;
  description: string | null;
  notes: string | null;
  members: string;
  subowners: string;
  joinCode: string;
  items: string;
  containers: string;
  events: string;
  version: number;
};

function toEntity(row: Row): Party {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    notes: row.notes,
    members: MembersSchema.parse(JSON.parse(row.members)),
    subowners: SubownersSchema.parse(JSON.parse(row.subowners)),
    joinCode: row.joinCode,
    items: ItemsSchema.parse(JSON.parse(row.items)),
    containers: ContainersSchema.parse(JSON.parse(row.containers)),
    events: EventsSchema.parse(JSON.parse(row.events)),
    version: row.version,
  };
}

function toData(p: Party) {
  return {
    ownerId: p.ownerId,
    name: p.name,
    description: p.description,
    notes: p.notes,
    members: JSON.stringify(MembersSchema.parse(p.members)),
    subowners: JSON.stringify(SubownersSchema.parse(p.subowners)),
    joinCode: p.joinCode,
    items: JSON.stringify(ItemsSchema.parse(p.items)),
    containers: JSON.stringify(ContainersSchema.parse(p.containers)),
    events: JSON.stringify(EventsSchema.parse(p.events)),
    version: p.version,
  };
}

export class PrismaPartyRepository implements PartyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Party | null> {
    const row = await this.prisma.party.findUnique({ where: { id } });
    return row ? toEntity(row as Row) : null;
  }

  async findByJoinCode(joinCode: string): Promise<Party | null> {
    const row = await this.prisma.party.findUnique({ where: { joinCode } });
    return row ? toEntity(row as Row) : null;
  }

  async findByMember(userId: number): Promise<Party[]> {
    // Las partidas donde es owner O donde su userId aparece en subowners (JSON)
    // SQLite no admite JSON operators en Prisma, así que cargamos todo y filtramos
    const allRows = await this.prisma.party.findMany();
    const result = new Map<number, Party>();
    for (const row of allRows) {
      const party = toEntity(row as Row);
      if (party.ownerId === userId || party.subowners.includes(userId)) {
        result.set(party.id, party);
      }
    }
    return [...result.values()];
  }

  async save(party: Party): Promise<Party> {
    const data = toData(party);
    if (party.id === 0) {
      const created = await this.prisma.party.create({ data });
      return toEntity(created as Row);
    }
    const updated = await this.prisma.party.update({
      where: { id: party.id },
      data,
    });
    return toEntity(updated as Row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.party.delete({ where: { id } });
  }
}
