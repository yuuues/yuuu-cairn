import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/auth.js";
import { useLogin } from "./useSession.js";
import { Card, Field, Input, Button } from "../ui/index.js";

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
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">
          {t("Login")}
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Field label={t("Email")} htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Password")} htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={login.isPending} className="mt-2">
            {t("Login")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          <Link to="/signup" className="text-accent hover:underline">
            {t("Sign Up")}
          </Link>{" "}
          &middot;{" "}
          <Link to="/reset-request" className="text-accent hover:underline">
            Forgot password?
          </Link>
        </p>
      </Card>
    </div>
  );
}
