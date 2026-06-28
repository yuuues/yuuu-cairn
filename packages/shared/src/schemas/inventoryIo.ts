import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const UpdateInventoryInputSchema = z.object({
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
  gold: z.number().int().min(0),
});
export type UpdateInventoryInput = z.infer<typeof UpdateInventoryInputSchema>;

export const TransferItemInputSchema = z.object({
  itemId: z.number().int(),
  toCharacterId: z.number().int(),
});
export type TransferItemInput = z.infer<typeof TransferItemInputSchema>;

export const BuyItemsInputSchema = z.object({
  /** Nombres del carrito; un nombre repetido = comprar varias unidades. */
  cart: z.array(z.string()),
  /** Oro resultante tras la compra (el front ya descontó el coste). */
  gold: z.number().int().min(0),
  /** Contenedor destino donde caen los items comprados. */
  containerId: z.number().int(),
});
export type BuyItemsInput = z.infer<typeof BuyItemsInputSchema>;
