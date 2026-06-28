import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";

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
    <form onSubmit={onSubmit}>
      <h1>{t("Resend Confirmation")}</h1>
      {message && <p role="alert">{message}</p>}
      <input type="email" placeholder={t("Email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit">{t("Resend Confirmation")}</button>
    </form>
  );
}
