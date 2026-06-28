import { z } from "zod";

export const ItemSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    location: z.number().int(), // id del contenedor; 0 = contenedor principal
    tags: z.array(z.string()).default([]),
  })
  .passthrough();

export type Item = z.infer<typeof ItemSchema>;
