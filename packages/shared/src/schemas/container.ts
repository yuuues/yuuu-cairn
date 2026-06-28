import { z } from "zod";

export const ContainerSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    slots: z.number().int(),
  })
  .passthrough();

export type Container = z.infer<typeof ContainerSchema>;
