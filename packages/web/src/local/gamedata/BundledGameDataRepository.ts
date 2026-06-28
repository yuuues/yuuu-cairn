import {
  BackgroundsSchema,
  BondSchema,
  TraitsSchema,
  ScarSchema,
  type Backgrounds,
  type Background,
  type Bond,
  type Traits,
  type Scar,
} from "@kw/shared";
import { z } from "zod";
import type { GameDataRepository } from "@kw/core";
import { GAME_DATA } from "./bundle.generated.js";

const BondsFileSchema = z.object({ Bonds: z.array(BondSchema) });
const OmensFileSchema = z.object({
  Omens: z.array(z.object({ description: z.string() }).passthrough()),
});
const ScarsFileSchema = z.object({ Scars: z.array(ScarSchema) });

export class BundledGameDataRepository implements GameDataRepository {
  private _backgrounds: Backgrounds | null = null;
  private _bonds: Bond[] | null = null;
  private _omens: string[] | null = null;
  private _traits: Traits | null = null;
  private _scars: Scar[] | null = null;

  backgrounds(): Backgrounds {
    return (this._backgrounds ??= BackgroundsSchema.parse(GAME_DATA.backgrounds));
  }
  background(name: string): Background | null {
    return this.backgrounds()[name] ?? null;
  }
  bonds(): Bond[] {
    return (this._bonds ??= BondsFileSchema.parse(GAME_DATA.bonds).Bonds);
  }
  omens(): string[] {
    return (this._omens ??= OmensFileSchema.parse(GAME_DATA.omens).Omens.map(
      (o) => o.description
    ));
  }
  traits(): Traits {
    return (this._traits ??= TraitsSchema.parse(GAME_DATA.traits));
  }
  scars(): Scar[] {
    return (this._scars ??= ScarsFileSchema.parse(GAME_DATA.scars).Scars);
  }
}
