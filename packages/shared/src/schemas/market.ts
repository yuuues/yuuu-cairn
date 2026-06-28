import { z } from "zod";

/** Entrada bruta de un item en el catálogo (sin name/category aún). */
export const MarketCatalogEntrySchema = z
  .object({
    tags: z.array(z.string()).default([]),
    cost: z.number().int(),
    uses: z.number().int().optional(),
    charges: z.number().int().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type MarketCatalogEntry = z.infer<typeof MarketCatalogEntrySchema>;

/** Catálogo bruto: categoría -> (nombre -> entrada). */
export const MarketCatalogSchema = z.record(
  z.string(),
  z.record(z.string(), MarketCatalogEntrySchema)
);
export type MarketCatalog = z.infer<typeof MarketCatalogSchema>;

/** Item aplanado expuesto por la API (paridad load_market: añade name + category). */
export const MarketItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  cost: z.number().int(),
  tags: z.array(z.string()).default([]),
  uses: z.number().int().optional(),
  charges: z.number().int().optional(),
  description: z.string().optional(),
});
export type MarketItem = z.infer<typeof MarketItemSchema>;
