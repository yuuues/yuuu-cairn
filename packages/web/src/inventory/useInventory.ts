import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Character,
  UpdateInventoryInput,
  TransferItemInput,
  BuyItemsInput,
} from "@kw/shared";
import { inventoryApi } from "../api/inventory.js";
import { marketplaceApi } from "../api/marketplace.js";

export function useUpdateInventory(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInventoryInput) => inventoryApi.update(id, input),
    onSuccess: (character: Character) => {
      qc.setQueryData(["characters", id], character);
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useTransferItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferItemInput) => inventoryApi.transfer(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useMarketCatalog() {
  return useQuery({
    queryKey: ["marketplace"],
    queryFn: marketplaceApi.catalog,
  });
}

export function useBuyItems(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BuyItemsInput) => marketplaceApi.buy(id, input),
    onSuccess: (character: Character) => {
      qc.setQueryData(["characters", id], character);
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
