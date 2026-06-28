import type { NpcResult } from "@kw/shared";
import type { GeneratorRepository } from "../../ports/driven/GeneratorRepository.js";
import type { Dice } from "../../ports/driven/Dice.js";
import { GeneratorError } from "./errors.js";

export class GenerateNpc {
  constructor(
    private readonly repo: GeneratorRepository,
    private readonly dice: Dice
  ) {}

  async execute(): Promise<NpcResult> {
    const tables = this.repo.tables();
    const gen = tables["NPCGenerator"];
    if (!gen || typeof gen !== "object" || Array.isArray(gen)) {
      throw new GeneratorError("table_not_found", "NPCGenerator not found in data");
    }
    const g = gen as Record<string, unknown>;

    // nombre: NPCGenerator.NPCNames.Names[]
    const namesObj = g["NPCNames"] as Record<string, unknown>;
    const names = namesObj["Names"] as string[];
    const name = this.dice.pick(names);

    // trasfondo: NPCGenerator.NPCBackgrounds[]
    const backgrounds = g["NPCBackgrounds"] as string[];
    const background = this.dice.pick(backgrounds);

    // rasgos: NPCGenerator.NPCTraits.Virtues[], .Vices[]
    const traitsObj = g["NPCTraits"] as Record<string, string[]>;
    const virtue = this.dice.pick(traitsObj["Virtues"]!);
    const vice = this.dice.pick(traitsObj["Vices"]!);

    // rasgo físico: NPCGenerator.NPCQuirks[]
    const quirks = g["NPCQuirks"] as string[];
    const quirk = this.dice.pick(quirks);

    // meta: NPCGenerator.NPCGoals.Goals[]
    const goalsObj = g["NPCGoals"] as Record<string, string[]>;
    const goal = this.dice.pick(goalsObj["Goals"]!);

    return { name, background, virtue, vice, quirk, goal };
  }
}
