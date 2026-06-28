import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { SessionUser, LoginInput } from "@kw/shared";
import { authApi } from "../api/auth.js";

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: ["session"],
    queryFn: authApi.me,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      qc.setQueryData(["session"], data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(["session"], null);
    },
  });
}
