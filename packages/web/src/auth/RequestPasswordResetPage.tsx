import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";
import { Card, Field, Input, Button } from "../ui/index.js";

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const result = await authApi.requestPasswordReset(email);
      setMessage(
        result.sent
          ? "An email with instructions to reset your password has been sent to you."
          : "Email address does not exist"
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Request failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl text-text">{t("Reset Password")}</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {message && (
            <p role="alert" className="text-sm text-muted">
              {message}
            </p>
          )}
          <Field label={t("Email")} htmlFor="reset-request-email">
            <Input
              id="reset-request-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Button type="submit">{t("Reset Password")}</Button>
        </form>
      </Card>
    </div>
  );
}
