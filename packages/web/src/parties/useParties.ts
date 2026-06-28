import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePartyInput,
  UpdatePartyInput,
  JoinPartyInput,
  UpdatePartyInventoryInput,
} from "@kw/shared";
import { partiesApi } from "../api/parties.js";

export function useParties() {
  return useQuery({ queryKey: ["parties"], queryFn: partiesApi.list });
}

export function useParty(id: number) {
  return useQuery({
    queryKey: ["parties", id],
    queryFn: () => partiesApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePartyInput) => partiesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useUpdateParty(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePartyInput) => partiesApi.update(id, input),
    onSuccess: (party) => {
      qc.setQueryData(["parties", id], { party, joinCode: null });
      qc.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

export function useDeleteParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => partiesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useJoinParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinPartyInput) => partiesApi.join(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useRemoveMember(partyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId: number) => partiesApi.removeMember(partyId, characterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties", partyId] }),
  });
}

export function useUpdatePartyInventory(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePartyInventoryInput) => partiesApi.updateInventory(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties", id] }),
  });
}
