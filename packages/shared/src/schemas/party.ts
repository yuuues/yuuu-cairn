import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const PartySchema = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  members: z.array(z.number().int()),
  subowners: z.array(z.number().int()),
  joinCode: z.string(),
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
  events: z.array(z.string()),
  version: z.number().int(),
});

export type Party = z.infer<typeof PartySchema>;
