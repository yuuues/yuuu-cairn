import { z } from "zod";

/** Item tal como aparece en los datos de juego (sin id/location aún). */
export const GearItemSchema = z
  .object({
    name: z.string(),
    tags: z.array(z.string()).default([]),
  })
  .passthrough();
export type GearItem = z.infer<typeof GearItemSchema>;

export const ContainerDefSchema = z
  .object({
    name: z.string(),
    slots: z.number().int(),
  })
  .passthrough();
export type ContainerDef = z.infer<typeof ContainerDefSchema>;

export const TableOptionSchema = z
  .object({
    description: z.string(),
    items: z.array(GearItemSchema).optional(),
    containers: z.array(ContainerDefSchema).optional(),
    bonus_gold: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
export type TableOption = z.infer<typeof TableOptionSchema>;

export const BackgroundTableSchema = z.object({
  question: z.string(),
  options: z.array(TableOptionSchema),
});
export type BackgroundTable = z.infer<typeof BackgroundTableSchema>;

export const BackgroundSchema = z
  .object({
    image: z.string().optional(),
    background_description: z.string().default(""),
    names: z.array(z.string()).default([]),
    starting_gear: z.array(GearItemSchema).default([]),
    starting_containers: z.array(ContainerDefSchema).optional(),
    table1: BackgroundTableSchema,
    table2: BackgroundTableSchema,
  })
  .passthrough();
export type Background = z.infer<typeof BackgroundSchema>;

/** Mapa nombre→trasfondo (resultado de consolidar los JSON individuales). */
export const BackgroundsSchema = z.record(z.string(), BackgroundSchema);
export type Backgrounds = z.infer<typeof BackgroundsSchema>;

export const BondSchema = z
  .object({
    description: z.string(),
    gold: z.union([z.number(), z.string()]).optional(),
    items: z.array(GearItemSchema).optional(),
  })
  .passthrough();
export type Bond = z.infer<typeof BondSchema>;

export const OmenSchema = z.object({ description: z.string() }).passthrough();
export type Omen = z.infer<typeof OmenSchema>;

/** traits.json: { "Physique": [...], "Skin": [...], ... } */
export const TraitsSchema = z.record(z.string(), z.array(z.string()));
export type Traits = z.infer<typeof TraitsSchema>;

export const ScarSchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type Scar = z.infer<typeof ScarSchema>;
