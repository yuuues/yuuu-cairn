import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RollTableInput, ImportCharacterPayload } from "@kw/shared";
import { generatorsApi } from "../client/generators.js";
import { characterIoApi } from "../api/generators.js";

/** Carga el mapa de tablas de generadores (cacheado — no cambia en runtime). */
export function useGeneratorTables() {
  return useQuery({
    queryKey: ["generators", "tables"],
    queryFn: () => generatorsApi.tables(),
    staleTime: Infinity,
  });
}

/** Mutación para tirar en una tabla (no invalida caché). */
export function useRollTable() {
  return useMutation({
    mutationFn: (input: RollTableInput) => generatorsApi.roll(input),
  });
}

/** Mutación para generar un NPC. */
export function useGenerateNpc() {
  return useMutation({
    mutationFn: () => generatorsApi.npc(),
  });
}

/** Mutación para importar un personaje desde JSON; invalida la lista. */
export function useImportCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportCharacterPayload) => characterIoApi.import(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
