import { useState, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError(t("Passwords must match"));
      return;
    }
    try {
      await authApi.resetPassword({ token, password });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("New Password")}</h1>
      {error && <p role="alert">{error}</p>}
      <input type="password" placeholder={t("Password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="password" placeholder={t("Confirm password")} value={password2} onChange={(e) => setPassword2(e.target.value)} required />
      <button type="submit" disabled={!token}>{t("Reset Password")}</button>
    </form>
  );
}
