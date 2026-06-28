import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const CreatePartyInputSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(2000).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
});
export type CreatePartyInput = z.infer<typeof CreatePartyInputSchema>;

export const UpdatePartyInputSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type UpdatePartyInput = z.infer<typeof UpdatePartyInputSchema>;

export const JoinPartyInputSchema = z.object({
  joinCode: z.string().min(1),
  characterId: z.number().int().positive(),
});
export type JoinPartyInput = z.infer<typeof JoinPartyInputSchema>;

export const LeavePartyInputSchema = z.object({
  characterId: z.number().int().positive(),
});
export type LeavePartyInput = z.infer<typeof LeavePartyInputSchema>;

export const UpdatePartyInventoryInputSchema = z.object({
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
});
export type UpdatePartyInventoryInput = z.infer<typeof UpdatePartyInventoryInputSchema>;
