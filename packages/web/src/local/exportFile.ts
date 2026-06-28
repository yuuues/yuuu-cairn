import { parseCharacterEnvelope, type CreateCharacterInput } from "@kw/shared";
import type { Character } from "@kw/shared";

type CharactersApi = {
  create: (input: CreateCharacterInput) => Promise<Character>;
};

/** Convierte un Character importado en CreateCharacterInput (descarta id/owner). */
function toCreateInput(c: Character): CreateCharacterInput {
  return {
    name: c.name,
    background: c.background,
    strengthMax: c.strengthMax,
    dexterityMax: c.dexterityMax,
    willpowerMax: c.willpowerMax,
    hpMax: c.hpMax,
    gold: c.gold,
    items: c.items,
    containers: c.containers,
    description: c.description,
    traits: c.traits,
    notes: c.notes,
    bonds: c.bonds,
    omens: c.omens,
    imageUrl: c.imageUrl,
  };
}

export async function importEnvelopeIntoStore(
  api: CharactersApi,
  json: string,
): Promise<Character> {
  const env = parseCharacterEnvelope(json);
  return api.create(toCreateInput(env.payload));
}

/** Descarga un string como archivo (solo navegador). */
export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lee un File como texto. */
export function readFileText(file: File): Promise<string> {
  return file.text();
}
