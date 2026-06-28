import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";

export function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
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
      await authApi.changePassword({ oldPassword, password });
      navigate("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Change failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Change Password</h1>
      {error && <p role="alert">{error}</p>}
      <input type="password" placeholder={t("Current Password")} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
      <input type="password" placeholder={t("New password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="password" placeholder={t("Confirm new password")} value={password2} onChange={(e) => setPassword2(e.target.value)} required />
      <button type="submit">{t("Change")}</button>
    </form>
  );
}
