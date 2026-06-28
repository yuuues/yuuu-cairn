import { z } from "zod";
import { CharacterSchema, type Character } from "./character.js";

export const CHARACTER_SCHEMA_VERSION = 1;

export const CharacterEnvelopeSchema = z.object({
  kind: z.literal("cairn-character"),
  schemaVersion: z.number().int().min(1).max(CHARACTER_SCHEMA_VERSION),
  exportedAt: z.string(),
  payload: CharacterSchema,
});
export type CharacterEnvelope = z.infer<typeof CharacterEnvelopeSchema>;

export function serializeCharacter(c: Character, now = new Date()): string {
  const env: CharacterEnvelope = {
    kind: "cairn-character",
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    payload: c,
  };
  return JSON.stringify(env);
}

export function parseCharacterEnvelope(json: string): CharacterEnvelope {
  return CharacterEnvelopeSchema.parse(JSON.parse(json));
}
