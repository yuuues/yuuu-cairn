import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";
import { AvatarSchema } from "./avatar.js";

export const CharacterSchema = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
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
  armor: z.string().nullable(),
  imageUrl: z.string().nullable(),
  partyId: z.number().int().nullable(),
  // Avatar 3D opcional. Opcional (no solo nullable) para que los exports v1
  // —que no llevan el campo— sigan validando sin tocar nada.
  avatar: AvatarSchema.nullable().optional(),
});

export type Character = z.infer<typeof CharacterSchema>;
