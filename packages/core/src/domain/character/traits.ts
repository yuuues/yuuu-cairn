export interface TraitValue {
  name: string;
  value: string;
}

export const TRAIT_NAMES = [
  "Physique",
  "Skin",
  "Hair",
  "Face",
  "Speech",
  "Clothing",
  "Virtue",
  "Vice",
] as const;

/**
 * Texto de rasgos (paridad traits_text de char_utils.py).
 * `traits` debe ir en el orden de TRAIT_NAMES (8 elementos).
 */
export function traitsText(age: number, traits: TraitValue[]): string {
  const t = traits;
  let txt =
    "You have a " +
    t[0]!.value +
    " " +
    t[0]!.name +
    ", " +
    t[1]!.value +
    " " +
    t[1]!.name +
    ", and " +
    t[2]!.value +
    " " +
    t[2]!.name +
    ". Your " +
    t[3]!.name +
    " is " +
    t[3]!.value +
    ", your " +
    t[4]!.name +
    " " +
    t[4]!.value +
    ". You have " +
    t[5]!.value +
    " " +
    t[5]!.name +
    ". You are " +
    t[6]!.value +
    " and " +
    t[7]!.value +
    ". ";
  if (age && age > 0) {
    txt += `You are ${age} years old.`;
  }
  return txt;
}
