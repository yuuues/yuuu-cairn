import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { SessionUser, LoginInput } from "@kw/shared";
import { authApi } from "../api/auth.js";
import { USE_LOCAL } from "../client/mode.js";

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: ["session"],
    // En modo local no hay cuentas ni servidor: no pegamos a /api/auth/me.
    queryFn: USE_LOCAL ? async () => null : authApi.me,
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
