import type {
  CreateCharacterInput,
  Background,
  Bond,
  Item,
  GearItem,
} from "@kw/shared";
import type { GameDataRepository } from "../../ports/driven/GameDataRepository.js";
import type { Dice } from "../../ports/driven/Dice.js";
import {
  requiredBondsCount,
  itemsFromGear,
  assignItemIds,
  buildContainers,
} from "../../domain/character/creation.js";
import { traitsText, TRAIT_NAMES, type TraitValue } from "../../domain/character/traits.js";

export interface RollCharacterQuery {
  /** Nombre de trasfondo a usar; vacío = aleatorio. */
  background: string;
}

function bondGold(bond: Bond | undefined): number {
  if (!bond || bond.gold === undefined || bond.gold === "") return 0;
  return typeof bond.gold === "number" ? bond.gold : parseInt(bond.gold, 10) || 0;
}

export class RollCharacter {
  constructor(
    private readonly data: GameDataRepository,
    private readonly dice: Dice
  ) {}

  async execute(q: RollCharacterQuery): Promise<CreateCharacterInput> {
    const backgrounds = this.data.backgrounds();
    const keys = Object.keys(backgrounds);

    // 1. Trasfondo (indicado o aleatorio)
    let key: string;
    if (q.background && backgrounds[q.background]) {
      key = q.background;
    } else {
      key = this.dice.pick(keys);
    }
    const background: Background = backgrounds[key]!;

    // 2. Nombre
    const name = this.dice.pick(background.names);

    // 3-4. Opciones de tablas (acumulan items y oro bonus)
    const t1 = this.dice.pick(background.table1.options);
    const t2 = this.dice.pick(background.table2.options);

    // 5. Vínculo(s)
    const bonds = this.data.bonds();
    const bond1 = this.dice.pick(bonds);
    const need = requiredBondsCount(background, t1.description);
    let bond2: Bond | undefined;
    if (need === 2) {
      const remaining = bonds.filter((b) => b.description !== bond1.description);
      bond2 = this.dice.pick(remaining.length > 0 ? remaining : bonds);
    }

    // 6. Presagio
    const omen = this.dice.pick(this.data.omens());

    // 7. Rasgos
    const traitsData = this.data.traits();
    const tts: TraitValue[] = TRAIT_NAMES.map((tn) => ({
      name: tn,
      value: this.dice.pick(traitsData[tn] ?? [""]),
    }));

    // 8. Oro base 3d6
    const goldRoll = this.dice.rollMulti(6, 3).total;

    // 9. Edad 2d20 + 10
    const age = this.dice.rollMulti(20, 2).total + 10;

    // 10. Atributos
    const strengthMax = this.dice.rollMulti(6, 3).total;
    const dexterityMax = this.dice.rollMulti(6, 3).total;
    const willpowerMax = this.dice.rollMulti(6, 3).total;
    const hpMax = this.dice.rollMulti(6, 1).total;

    // Items: gear + table1 + table2 + bonds (en ese orden)
    const gear: GearItem[] = [
      ...background.starting_gear,
      ...(t1.items ?? []),
      ...(t2.items ?? []),
      ...(bond1.items ?? []),
      ...(bond2?.items ?? []),
    ];
    const items: Item[] = assignItemIds(itemsFromGear(gear));

    // Contenedores
    const containers = buildContainers(background, t1, t2);

    // Oro total
    const gold = goldRoll + bondGold(bond1) + bondGold(bond2);

    // Vínculos como texto (paridad toJSON: bond + '\n\n' + bond2)
    let bondsText = bond1.description;
    if (bond2) bondsText += "\n\n" + bond2.description;

    // Notas (paridad: pregunta + opción de cada tabla)
    const notes =
      background.table1.question +
      "\n" +
      t1.description +
      "\n" +
      background.table2.question +
      "\n" +
      t2.description;

    return {
      name,
      background: key,
      strengthMax,
      dexterityMax,
      willpowerMax,
      hpMax,
      gold,
      items,
      containers,
      description: background.background_description,
      traits: traitsText(age, tts),
      notes,
      bonds: bondsText,
      omens: omen,
      imageUrl: "default-portrait.webp",
    };
  }
}
