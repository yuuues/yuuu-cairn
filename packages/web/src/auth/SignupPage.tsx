import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
      await authApi.signup({
        email,
        username,
        password,
        signupCode: signupCode || undefined,
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    }
  }

  if (done) {
    return <p>A confirmation email has been sent. Please check your inbox.</p>;
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("Sign Up")}</h1>
      {error && <p role="alert">{error}</p>}
      <input placeholder={t("Email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder={t("Username")} value={username} onChange={(e) => setUsername(e.target.value)} required />
      <input placeholder={t("Password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input placeholder={t("Confirm password")} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
      <input placeholder={t("Signup Code")} value={signupCode} onChange={(e) => setSignupCode(e.target.value)} />
      <button type="submit">{t("Sign Up")}</button>
      <p>
        <Link to="/login">Already have an account? {t("Login")}</Link>
      </p>
    </form>
  );
}
