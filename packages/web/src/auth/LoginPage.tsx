import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/auth.js";
import { useLogin } from "./useSession.js";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password, rememberMe: false });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("Login")}</h1>
      {error && <p role="alert">{error}</p>}
      <input
        type="email"
        placeholder={t("Email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder={t("Password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={login.isPending}>
        {t("Login")}
      </button>
      <p>
        <Link to="/signup">{t("Sign Up")}</Link> ·{" "}
        <Link to="/reset-request">Forgot password?</Link>
      </p>
    </form>
  );
}
