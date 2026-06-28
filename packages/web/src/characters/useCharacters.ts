import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@kw/shared";
import { charactersApi, dataApi } from "../api/characters.js";

export function useCharacters() {
  return useQuery({
    queryKey: ["characters"],
    queryFn: charactersApi.list,
  });
}

export function useCharacter(id: number) {
  return useQuery({
    queryKey: ["characters", id],
    queryFn: () => charactersApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCharacterInput) => charactersApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
}

export function useUpdateCharacter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCharacterInput) => charactersApi.update(id, input),
    onSuccess: (character) => {
      qc.setQueryData(["characters", id], character);
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => charactersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
}

export function useRollCharacter() {
  return useMutation({
    mutationFn: (background: string) => charactersApi.roll(background),
  });
}

export function useBackgrounds() {
  return useQuery({ queryKey: ["data", "backgrounds"], queryFn: dataApi.backgrounds });
}
