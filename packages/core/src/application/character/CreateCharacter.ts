import type { Character, CreateCharacterInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";

export interface CreateCharacterCommand {
  ownerId: number;
  input: CreateCharacterInput;
}

export class CreateCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: CreateCharacterCommand): Promise<Character> {
    const i = cmd.input;
    const character: Character = {
      id: 0,
      ownerId: cmd.ownerId,
      name: i.name,
      background: i.background,
      strength: i.strengthMax,
      strengthMax: i.strengthMax,
      dexterity: i.dexterityMax,
      dexterityMax: i.dexterityMax,
      willpower: i.willpowerMax,
      willpowerMax: i.willpowerMax,
      hp: i.hpMax,
      hpMax: i.hpMax,
      deprived: false,
      panicked: false,
      gold: i.gold,
      items: i.items,
      containers: i.containers,
      description: i.description,
      traits: i.traits,
      notes: i.notes,
      bonds: i.bonds,
      scars: "",
      omens: i.omens,
      armor: String(armorValue(i.items)),
      imageUrl: i.imageUrl,
      avatar: i.avatar,
      partyId: null,
    };
    return this.characters.save(character);
  }
}
