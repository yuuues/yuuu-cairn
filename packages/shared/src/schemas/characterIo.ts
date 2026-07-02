import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";
import { AvatarSchema } from "./avatar.js";

export const CreateCharacterInputSchema = z.object({
  name: z.string().min(1).max(64),
  background: z.string().min(1).max(64),
  strengthMax: z.number().int().min(1),
  dexterityMax: z.number().int().min(1),
  willpowerMax: z.number().int().min(1),
  hpMax: z.number().int().min(1),
  gold: z.number().int().min(0).default(0),
  items: z.array(ItemSchema).default([]),
  containers: z.array(ContainerSchema).default([]),
  description: z.string().nullable().default(null),
  traits: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  bonds: z.string().nullable().default(null),
  omens: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
  avatar: AvatarSchema.nullable().optional(),
});
export type CreateCharacterInput = z.infer<typeof CreateCharacterInputSchema>;

export const UpdateCharacterInputSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  strength: z.number().int().optional(),
  strengthMax: z.number().int().optional(),
  dexterity: z.number().int().optional(),
  dexterityMax: z.number().int().optional(),
  willpower: z.number().int().optional(),
  willpowerMax: z.number().int().optional(),
  hp: z.number().int().optional(),
  hpMax: z.number().int().optional(),
  deprived: z.boolean().optional(),
  panicked: z.boolean().optional(),
  gold: z.number().int().optional(),
  description: z.string().nullable().optional(),
  traits: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  bonds: z.string().nullable().optional(),
  scars: z.string().nullable().optional(),
  omens: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  avatar: AvatarSchema.nullable().optional(),
  items: z.array(ItemSchema).optional(),
  containers: z.array(ContainerSchema).optional(),
});
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterInputSchema>;
