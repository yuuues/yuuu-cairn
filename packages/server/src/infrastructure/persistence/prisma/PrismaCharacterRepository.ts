import type { PrismaClient } from "@prisma/client";
import {
  ItemSchema,
  ContainerSchema,
  AvatarSchema,
  type Character,
  type Item,
  type Container,
  type Avatar,
} from "@kw/shared";
import { z } from "zod";
import type { CharacterRepository } from "@kw/core";

const ItemsSchema = z.array(ItemSchema);
const ContainersSchema = z.array(ContainerSchema);

type Row = {
  id: number;
  ownerId: number;
  name: string;
  background: string;
  strength: number;
  strengthMax: number;
  dexterity: number;
  dexterityMax: number;
  willpower: number;
  willpowerMax: number;
  hp: number;
  hpMax: number;
  deprived: boolean;
  panicked: boolean;
  gold: number;
  items: string;
  containers: string;
  description: string | null;
  traits: string | null;
  notes: string | null;
  bonds: string | null;
  scars: string | null;
  omens: string | null;
  armor: string | null;
  imageUrl: string | null;
  avatar: string | null;
  partyId: number | null;
};

function parseItems(raw: string): Item[] {
  return ItemsSchema.parse(JSON.parse(raw));
}
function parseContainers(raw: string): Container[] {
  return ContainersSchema.parse(JSON.parse(raw));
}
function parseAvatar(raw: string | null): Avatar | null {
  return raw ? AvatarSchema.parse(JSON.parse(raw)) : null;
}

function toEntity(row: Row): Character {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    background: row.background,
    strength: row.strength,
    strengthMax: row.strengthMax,
    dexterity: row.dexterity,
    dexterityMax: row.dexterityMax,
    willpower: row.willpower,
    willpowerMax: row.willpowerMax,
    hp: row.hp,
    hpMax: row.hpMax,
    deprived: row.deprived,
    panicked: row.panicked,
    gold: row.gold,
    items: parseItems(row.items),
    containers: parseContainers(row.containers),
    description: row.description,
    traits: row.traits,
    notes: row.notes,
    bonds: row.bonds,
    scars: row.scars,
    omens: row.omens,
    armor: row.armor,
    imageUrl: row.imageUrl,
    avatar: parseAvatar(row.avatar),
    partyId: row.partyId,
  };
}

function toData(c: Character) {
  return {
    ownerId: c.ownerId,
    name: c.name,
    background: c.background,
    strength: c.strength,
    strengthMax: c.strengthMax,
    dexterity: c.dexterity,
    dexterityMax: c.dexterityMax,
    willpower: c.willpower,
    willpowerMax: c.willpowerMax,
    hp: c.hp,
    hpMax: c.hpMax,
    deprived: c.deprived,
    panicked: c.panicked,
    gold: c.gold,
    items: JSON.stringify(ItemsSchema.parse(c.items)),
    containers: JSON.stringify(ContainersSchema.parse(c.containers)),
    description: c.description,
    traits: c.traits,
    notes: c.notes,
    bonds: c.bonds,
    scars: c.scars,
    omens: c.omens,
    armor: c.armor,
    imageUrl: c.imageUrl,
    avatar: c.avatar ? JSON.stringify(AvatarSchema.parse(c.avatar)) : null,
    partyId: c.partyId,
  };
}

export class PrismaCharacterRepository implements CharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Character | null> {
    const row = await this.prisma.character.findUnique({ where: { id } });
    return row ? toEntity(row as Row) : null;
  }

  async findByOwner(ownerId: number): Promise<Character[]> {
    const rows = await this.prisma.character.findMany({ where: { ownerId } });
    return rows.map((r) => toEntity(r as Row));
  }

  async save(character: Character): Promise<Character> {
    const data = toData(character);
    if (character.id === 0) {
      const created = await this.prisma.character.create({ data });
      return toEntity(created as Row);
    }
    const updated = await this.prisma.character.update({
      where: { id: character.id },
      data,
    });
    return toEntity(updated as Row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.character.delete({ where: { id } });
  }
}
