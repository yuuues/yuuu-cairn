import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";
import { Card, Field, Input, Button } from "../ui/index.js";

export function ResendConfirmationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const result = await authApi.resendConfirmation(email);
      setMessage(
        result.sent
          ? `A new confirmation email has been sent to ${email}`
          : "Email address does not exist"
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Request failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">
          {t("Resend Confirmation")}
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {message && (
            <p role="alert" className="text-sm text-muted">
              {message}
            </p>
          )}
          <Field label={t("Email")} htmlFor="resend-email">
            <Input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="mt-2">
            {t("Resend Confirmation")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
