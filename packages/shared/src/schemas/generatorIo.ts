import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

/**
 * Tabla de generador — valor en bruto. Los generadores tienen estructura
 * heterogénea (arrays, objetos anidados), así que se tipan como `unknown`
 * y el cliente los traversa.
 */
export const GeneratorTablesSchema = z.record(z.string(), z.unknown());
export type GeneratorTables = z.infer<typeof GeneratorTablesSchema>;

/** Resultado de tirar una tabla: valor elegido (siempre string). */
export const RollTableResultSchema = z.object({
  category: z.string(),
  subcategory: z.string().nullable(),
  result: z.string(),
});
export type RollTableResult = z.infer<typeof RollTableResultSchema>;

/** Input para tirar tabla. */
export const RollTableInputSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().nullable().default(null),
});
export type RollTableInput = z.infer<typeof RollTableInputSchema>;

/** NPC generado (paridad: nombre, trasfondo, virtud, vicio, rasgo físico). */
export const NpcResultSchema = z.object({
  name: z.string(),
  background: z.string(),
  virtue: z.string(),
  vice: z.string(),
  quirk: z.string(),
  goal: z.string(),
});
export type NpcResult = z.infer<typeof NpcResultSchema>;

/**
 * Payload de import de personaje desde JSON (upload).
 * Reutiliza los campos clave del Character serializado por el origen (character_to_dict).
 * Los campos opcionales se permiten con `.optional()` para tolerar exports parciales.
 */
export const ImportCharacterPayloadSchema = z.object({
  name: z.string().min(1).max(64),
  background: z.string().min(1).max(64),
  strength: z.number().int().optional(),
  strengthMax: z.number().int().min(1),
  dexterity: z.number().int().optional(),
  dexterityMax: z.number().int().min(1),
  willpower: z.number().int().optional(),
  willpowerMax: z.number().int().min(1),
  hp: z.number().int().optional(),
  hpMax: z.number().int().min(1),
  deprived: z.boolean().default(false),
  gold: z.number().int().min(0).default(0),
  items: z.array(ItemSchema).default([]),
  containers: z.array(ContainerSchema).default([]),
  description: z.string().nullable().default(null),
  traits: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  bonds: z.string().nullable().default(null),
  omens: z.string().nullable().default(null),
  scars: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
});
export type ImportCharacterPayload = z.infer<typeof ImportCharacterPayloadSchema>;

/**
 * Personaje serializado para export/impresión (paridad: character_to_dict + inventory).
 * Incluye todos los campos legibles sin ownerId ni partyId.
 */
export const CharacterExportSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  background: z.string(),
  strength: z.number().int(),
  strengthMax: z.number().int(),
  dexterity: z.number().int(),
  dexterityMax: z.number().int(),
  willpower: z.number().int(),
  willpowerMax: z.number().int(),
  hp: z.number().int(),
  hpMax: z.number().int(),
  deprived: z.boolean(),
  panicked: z.boolean(),
  gold: z.number().int(),
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
  description: z.string().nullable(),
  traits: z.string().nullable(),
  notes: z.string().nullable(),
  bonds: z.string().nullable(),
  scars: z.string().nullable(),
  omens: z.string().nullable(),
  imageUrl: z.string().nullable(),
  armor: z.string().nullable(),
});
export type CharacterExport = z.infer<typeof CharacterExportSchema>;
