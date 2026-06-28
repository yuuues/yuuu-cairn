import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

const BondsFileSchema = z.object({ Bonds: z.array(BondSchema) });
const OmensFileSchema = z.object({
  Omens: z.array(z.object({ description: z.string() }).passthrough()),
});
const ScarsFileSchema = z.object({ Scars: z.array(ScarSchema) });

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export class FileGameDataRepository implements GameDataRepository {
  private _backgrounds: Backgrounds | null = null;
  private _bonds: Bond[] | null = null;
  private _omens: string[] | null = null;
  private _traits: Traits | null = null;
  private _scars: Scar[] | null = null;

  constructor(private readonly dataDir: string) {}

  /** Consolida data/backgrounds/*.json en un único mapa (paridad consolidate_json_files). */
  backgrounds(): Backgrounds {
    if (this._backgrounds) return this._backgrounds;
    const dir = join(this.dataDir, "backgrounds");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "background_data.json")
      .sort();
    const merged: Record<string, unknown> = {};
    for (const f of files) {
      const data = readJson(join(dir, f));
      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.assign(merged, data as Record<string, unknown>);
      }
    }
    this._backgrounds = BackgroundsSchema.parse(merged);
    return this._backgrounds;
  }

  background(name: string): Background | null {
    return this.backgrounds()[name] ?? null;
  }

  bonds(): Bond[] {
    if (this._bonds) return this._bonds;
    const parsed = BondsFileSchema.parse(readJson(join(this.dataDir, "bonds.json")));
    this._bonds = parsed.Bonds;
    return this._bonds;
  }

  omens(): string[] {
    if (this._omens) return this._omens;
    const parsed = OmensFileSchema.parse(readJson(join(this.dataDir, "omens.json")));
    this._omens = parsed.Omens.map((o) => o.description);
    return this._omens;
  }

  traits(): Traits {
    if (this._traits) return this._traits;
    this._traits = TraitsSchema.parse(readJson(join(this.dataDir, "traits.json")));
    return this._traits;
  }

  scars(): Scar[] {
    if (this._scars) return this._scars;
    const parsed = ScarsFileSchema.parse(readJson(join(this.dataDir, "scars.json")));
    this._scars = parsed.Scars;
    return this._scars;
  }
}
