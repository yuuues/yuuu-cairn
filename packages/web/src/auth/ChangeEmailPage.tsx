import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";
import { Card, Field, Input, Button } from "../ui/index.js";

export function ChangeEmailPage() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (email !== email2) {
      setError(t("Email addresses must match"));
      return;
    }
    try {
      await authApi.changeEmail({ password, email });
      await qc.invalidateQueries({ queryKey: ["session"] });
      navigate("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Change failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">
          Change Email
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Field label={t("Password")} htmlFor="change-email-password">
            <Input
              id="change-email-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Email")} htmlFor="change-email">
            <Input
              id="change-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Confirm password")} htmlFor="change-email2">
            <Input
              id="change-email2"
              type="email"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="mt-2">
            {t("Change")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
