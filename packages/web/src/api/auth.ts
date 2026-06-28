import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
  ChangeEmailInput,
  DeleteAccountInput,
  SessionUser,
} from "@kw/shared";

export class ApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  }
  return data as T;
}

export const authApi = {
  signup: (input: RegisterInput) => post<{ ok: true }>("/api/auth/signup", input),
  login: (input: LoginInput) => post<{ user: SessionUser }>("/api/auth/login", input),
  logout: () => post<{ ok: true }>("/api/auth/logout", {}),
  async me(): Promise<SessionUser | null> {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return null;
    if (!res.ok) throw new ApiError("error", "Failed to load session");
    const data = await res.json();
    return data.user as SessionUser;
  },
  confirm: (token: string) => post<{ ok: true }>("/api/auth/confirm", { token }),
  resendConfirmation: (email: string) =>
    post<{ sent: boolean }>("/api/auth/resend-confirmation", { email }),
  requestPasswordReset: (email: string) =>
    post<{ sent: boolean }>("/api/auth/reset-request", { email }),
  resetPassword: (input: ResetPasswordInput) =>
    post<{ ok: true }>("/api/auth/reset", input),
  changePassword: (input: ChangePasswordInput) =>
    post<{ ok: true }>("/api/auth/change-password", input),
  changeEmail: (input: ChangeEmailInput) =>
    post<{ ok: true }>("/api/auth/change-email", input),
  deleteAccount: (input: DeleteAccountInput) =>
    post<{ ok: true }>("/api/auth/delete-account", input),
};
