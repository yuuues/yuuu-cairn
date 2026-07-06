import { useState, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";
import { Card, Field, Input, Button } from "../ui/index.js";

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
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">
          {t("New Password")}
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Field label={t("Password")} htmlFor="reset-password">
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Confirm password")} htmlFor="reset-password2">
            <Input
              id="reset-password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={!token} className="mt-2">
            {t("Reset Password")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
